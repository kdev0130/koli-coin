// Email verification service with strict security
import emailOTPService from './emailOTPService';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp, updateDoc, increment } from 'firebase/firestore';

interface PendingSignUp {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  referralCode?: string;
  platformCodeId?: string;
  platformCode?: string;
  leaderId?: string;
  leaderName?: string;
  otpVerified: boolean;
  otpId: string;
  createdAt: number;
  expiresAt: number;
}

interface EmailVerificationServiceInterface {
  initiateVerification(signUpData: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    referralCode?: string;
    platformCodeId?: string;
    platformCode?: string;
    leaderId?: string;
    leaderName?: string;
  }): Promise<{
    success: boolean;
    sessionId?: string;
    error?: string;
    cooldownRemaining?: number;
  }>;
  verifyOTP(sessionId: string, code: string): Promise<{
    success: boolean;
    error?: string;
    verified?: boolean;
  }>;
  resendOTP(sessionId: string): Promise<{
    success: boolean;
    error?: string;
    cooldownRemaining?: number;
  }>;
  completeSignUp(sessionId: string): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }>;
  getVerificationStatus(sessionId: string): {
    exists: boolean;
    otpSent: boolean;
    otpVerified: boolean;
    expired: boolean;
    email?: string;
  };
  cancelVerification(sessionId: string): void;
  getSessionCount(): number;
}

/**
 * Email verification service that manages the OTP flow
 * Ensures no user is created until email is verified
 */
class EmailVerificationService implements EmailVerificationServiceInterface {
  private pendingSignUps: Map<string, PendingSignUp> = new Map();
  private lastSentTimes: Map<string, number> = new Map();
  private sendingInProgress: Set<string> = new Set();
  private readonly SESSION_EXPIRY = 15 * 60 * 1000; // 15 minutes

  constructor() {
    // Load from localStorage
    const storedLastSent = localStorage.getItem('emailVerificationLastSent');
    if (storedLastSent) {
      try {
        const parsed = JSON.parse(storedLastSent);
        this.lastSentTimes = new Map(Object.entries(parsed));
      } catch (e) {
        // ignore
      }
    }

    const storedPending = localStorage.getItem('emailVerificationPending');
    if (storedPending) {
      try {
        const parsed = JSON.parse(storedPending);
        this.pendingSignUps = new Map(Object.entries(parsed));
      } catch (e) {
        // ignore
      }
    }

    // Clean up expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): { valid: boolean; error?: string } {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.toLowerCase())) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  }

  /**
   * Start email verification process
   * Step 1: Store pending signup data and send OTP
   */
  async initiateVerification(signUpData: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    referralCode?: string;
    platformCodeId?: string;
    platformCode?: string;
    leaderId?: string;
    leaderName?: string;
  }): Promise<{ 
    success: boolean; 
    sessionId?: string; 
    error?: string; 
    cooldownRemaining?: number;
  }> {
    
    const { valid, error } = this.validateEmail(signUpData.email);
    if (!valid) {
      return { success: false, error };
    }

    const normalizedEmail = signUpData.email.toLowerCase().trim();

    // Check if there's a recent pending session for this email (prevent duplicate sends)
    const recentSession = Array.from(this.pendingSignUps.entries()).find(([sessionId, pending]) =>
      pending.email === normalizedEmail && Date.now() - pending.createdAt < 10000 // 10 seconds
    );

    if (recentSession) {
      console.log(`📧 Recent verification session found for ${normalizedEmail}`);
      return { success: true, sessionId: recentSession[0] };
    }

    // Check if sending is already in progress for this email
    if (this.sendingInProgress.has(normalizedEmail)) {
      console.log(`⏳ Verification already in progress for ${normalizedEmail}`);
      return { success: false, error: 'Verification already in progress' };
    }

    // Check rate limit - prevent duplicate sends within 30 seconds
    const lastSent = this.lastSentTimes.get(normalizedEmail);
    if (lastSent && Date.now() - lastSent < 30000) { // 30 seconds cooldown
      const cooldownRemaining = Math.ceil((30000 - (Date.now() - lastSent)) / 1000);
      console.log(`⏰ Rate limit hit for ${normalizedEmail}, cooldown: ${cooldownRemaining}s`);
      return {
        success: false,
        error: 'Please wait before requesting another verification code',
        cooldownRemaining
      };
    }

    // Check if there's already a pending verification for this email
    for (const [sessionId, pending] of this.pendingSignUps.entries()) {
      if (pending.email === normalizedEmail && !pending.otpVerified && Date.now() < pending.expiresAt) {
        console.log(`📧 Existing verification session found for ${normalizedEmail}`);
        return { success: true, sessionId };
      }
    }

    // Note: Email uniqueness will be checked during user creation in completeSignUp

    // Mark sending as in progress
    this.sendingInProgress.add(normalizedEmail);

    try {
      console.log(`📧 Initiating email verification for ${normalizedEmail}`);

      // Send OTP via email
      const result = await emailOTPService.sendEmailOTP(normalizedEmail);

      if (!result.success || !result.otpId) {
        return {
          success: false,
          error: result.error || 'Failed to send verification email',
          cooldownRemaining: result.cooldownRemaining
        };
      }

      // Store pending signup data (no user created yet!)
      const sessionId = result.otpId;
      const pendingSignUp: PendingSignUp = {
        email: normalizedEmail,
        firstName: signUpData.firstName,
        lastName: signUpData.lastName,
        password: signUpData.password,
        referralCode: signUpData.referralCode,
        platformCodeId: signUpData.platformCodeId,
        platformCode: signUpData.platformCode,
        leaderId: signUpData.leaderId,
        leaderName: signUpData.leaderName,
        otpVerified: false,
        otpId: result.otpId,
        createdAt: Date.now(),
        expiresAt: Date.now() + this.SESSION_EXPIRY
      };

      this.pendingSignUps.set(sessionId, pendingSignUp);

      // Update rate limit timestamp
      this.lastSentTimes.set(normalizedEmail, Date.now());

      console.log(`✅ Verification email sent to ${normalizedEmail}`);
      return { success: true, sessionId };

    } catch (error) {
      console.error('Failed to initiate email verification:', error);
      return { success: false, error: 'Verification service unavailable' };
    } finally {
      // Always clear the sending in progress flag
      this.sendingInProgress.delete(normalizedEmail);
    }
  }

  /**
   * Verify OTP code
   * Step 2: Verify OTP but don't create user yet
   */
  async verifyOTP(sessionId: string, code: string): Promise<{ 
    success: boolean; 
    error?: string; 
    verified?: boolean; 
  }> {
    const pendingSignUp = this.pendingSignUps.get(sessionId);
    
    if (!pendingSignUp) {
      return { success: false, error: 'Verification session not found or expired' };
    }

    if (Date.now() > pendingSignUp.expiresAt) {
      this.pendingSignUps.delete(sessionId);
      return { success: false, error: 'Verification session expired' };
    }

    if (pendingSignUp.otpVerified) {
      return { success: true, verified: true };
    }

    try {
      const result = await emailOTPService.verifyEmailOTP(
        pendingSignUp.otpId, 
        code, 
        pendingSignUp.email
      );
      
      if (result.success && result.verified) {
        // Mark as verified but DON'T create user yet
        pendingSignUp.otpVerified = true;
        this.pendingSignUps.set(sessionId, pendingSignUp);
        
        console.log(`✅ Email ${pendingSignUp.email} verified successfully`);
        return { success: true, verified: true };
      } else {
        return { success: false, error: result.error || 'Invalid or expired verification code' };
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      return { success: false, error: 'Verification failed. Please try again.' };
    }
  }

  /**
   * Resend OTP email
   */
  async resendOTP(sessionId: string): Promise<{
    success: boolean;
    error?: string;
    cooldownRemaining?: number;
  }> {
    const pendingSignUp = this.pendingSignUps.get(sessionId);
    
    if (!pendingSignUp) {
      return { success: false, error: 'Verification session not found' };
    }

    if (Date.now() > pendingSignUp.expiresAt) {
      this.pendingSignUps.delete(sessionId);
      return { success: false, error: 'Verification session expired. Please start over.' };
    }

    try {
      // Send new OTP
      const result = await emailOTPService.sendEmailOTP(pendingSignUp.email);
      
      if (result.success && result.otpId) {
        // Update OTP ID in pending signup
        pendingSignUp.otpId = result.otpId;
        this.pendingSignUps.set(sessionId, pendingSignUp);
        
        return { success: true };
      } else {
        return { 
          success: false, 
          error: result.error || 'Failed to resend verification email',
          cooldownRemaining: result.cooldownRemaining
        };
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      return { success: false, error: 'Failed to resend verification email' };
    }
  }

  /**
   * Complete user creation after OTP verification
   * Step 3: Create user accounts after OTP is verified
   */
  async completeSignUp(sessionId: string): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    const pendingSignUp = this.pendingSignUps.get(sessionId);
    
    if (!pendingSignUp) {
      return { success: false, error: 'Invalid or expired verification session' };
    }

    if (!pendingSignUp.otpVerified) {
      return { success: false, error: 'Email not verified' };
    }

    if (Date.now() > pendingSignUp.expiresAt) {
      this.pendingSignUps.delete(sessionId);
      return { success: false, error: 'Verification session expired' };
    }

    try {
      console.log(`👤 Creating user account for ${pendingSignUp.email}...`);

      // Double-check email uniqueness
      const emailQuery = query(
        collection(db, 'members'),
        where('email', '==', pendingSignUp.email)
      );
      const emailSnapshot = await getDocs(emailQuery);

      if (!emailSnapshot.empty) {
        this.pendingSignUps.delete(sessionId);
        return { success: false, error: 'Email is already registered' };
      }

      // Step 1: Create Firebase Auth user
      console.log('🔐 Creating Firebase Auth user...');
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        pendingSignUp.email, 
        pendingSignUp.password
      );

      const firebaseUser = userCredential.user;
      console.log('✅ Firebase Auth user created with UID:', firebaseUser.uid);
      
      // IMPORTANT: Sign out immediately to prevent auth state change from reading non-existent document
      console.log('🔓 Signing out to avoid race condition...');
      await auth.signOut();
      console.log('✅ Signed out successfully');

      // Step 2: Now save user document to Firestore WITHOUT being authenticated
      const userData = {
        uid: firebaseUser.uid,
        email: pendingSignUp.email,
        firstName: pendingSignUp.firstName,
        lastName: pendingSignUp.lastName,
        emailVerified: true,
        referralCode: pendingSignUp.referralCode || null,
        platformCodeId: pendingSignUp.platformCodeId || null,
        platformCode: pendingSignUp.platformCode || null,
        leaderId: pendingSignUp.leaderId || null,
        leaderName: pendingSignUp.leaderName || null,
        joinedUnderLeaderAt: (pendingSignUp.leaderId || pendingSignUp.platformCodeId) ? serverTimestamp() : null,
        createdAt: serverTimestamp(),
        profile: {
          displayName: `${pendingSignUp.firstName} ${pendingSignUp.lastName}`,
          avatar: null,
        },
        settings: {
          notifications: {
            email: true,
            marketing: false,
            security: true,
          },
          privacy: {
            profileVisible: true,
            emailVisible: false,
          },
        },
        stats: {
          totalDonations: 0,
          totalWithdrawals: 0,
          referralCount: 0,
        },
        status: 'active',
        lastLoginAt: serverTimestamp(),
        role: 'member',
        // Additional KOLI-specific fields
        balance: 0,
        deposit: 0,
        hasPinSetup: false,
        pinHash: null,
        kycStatus: "NOT_SUBMITTED",
      };

      console.log('💾 Saving user to Firestore members collection...', {
        docId: firebaseUser.uid,
        email: userData.email,
      });
      
      const memberDocRef = doc(db, 'members', firebaseUser.uid);
      console.log('📍 Document reference created:', memberDocRef.path);
      
      try {
        console.log('⏳ Calling setDoc with data:', JSON.stringify(userData, null, 2));
        
        // Set a timeout to detect hanging operations
        const setDocPromise = setDoc(memberDocRef, userData);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('setDoc timeout after 10 seconds')), 10000)
        );
        
        await Promise.race([setDocPromise, timeoutPromise]);
        console.log('✅ setDoc completed without error');
        
        console.log('🔍 Verifying document was saved...');
        const savedDoc = await getDoc(memberDocRef);
        console.log('📄 getDoc completed, exists:', savedDoc.exists());
        
        if (savedDoc.exists()) {
          console.log('✅ Verified: Document exists in Firestore');
          console.log('📋 Document data:', savedDoc.data());
        } else {
          console.error('❌ Document save verification failed - document does not exist!');
          throw new Error('Document verification failed');
        }
      } catch (firestoreError: any) {
        console.error('❌ FIRESTORE SAVE ERROR:', firestoreError);
        console.error('Error code:', firestoreError?.code);
        console.error('Error message:', firestoreError?.message);
        console.error('Full error object:', JSON.stringify(firestoreError, null, 2));
        
        // Clean up auth user if Firestore save fails
        try {
          await firebaseUser.delete();
          console.log('🧹 Cleaned up Firebase Auth user due to Firestore error');
        } catch (deleteError) {
          console.error('Failed to cleanup auth user:', deleteError);
        }
        
        throw new Error(`Failed to save user to database: ${firestoreError.message}`);
      }

      // Step 3.5: Increment platform code usage count (best effort)
      if (pendingSignUp.platformCodeId) {
        try {
          const platformCodeRef = doc(db, 'platformCodes', pendingSignUp.platformCodeId);
          await updateDoc(platformCodeRef, {
            usageCount: increment(1),
            lastUsedAt: serverTimestamp(),
          });
        } catch (platformCodeError) {
          console.error('Platform code usage update failed:', platformCodeError);
        }
      }

      // Step 3: Handle referral code if provided
      if (pendingSignUp.referralCode) {
        try {
          const referralQuery = query(
            collection(db, 'users'),
            where('referralCode', '==', pendingSignUp.referralCode)
          );
          const referralSnapshot = await getDocs(referralQuery);
          
          if (!referralSnapshot.empty) {
            const referrerDoc = referralSnapshot.docs[0];
            const referrerId = referrerDoc.id;
            
            await setDoc(doc(db, 'referrals', `${referrerId}_${firebaseUser.uid}`), {
              referrerId,
              referredUserId: firebaseUser.uid,
              referralCode: pendingSignUp.referralCode,
              status: 'completed',
              createdAt: serverTimestamp(),
              bonusAwarded: false,
            });
          }
        } catch (referralError) {
          console.error('Referral processing error:', referralError);
          // Don't fail signup if referral fails
        }
      }

      // Step 4: Clean up verification session
      this.pendingSignUps.delete(sessionId);

      console.log(`✅ User account created successfully for ${pendingSignUp.email}`);
      
      // Step 5: Sign the user back in so they can access the dashboard
      console.log('🔐 Signing user back in...');
      await signInWithEmailAndPassword(auth, pendingSignUp.email, pendingSignUp.password);
      console.log('✅ User signed in successfully');

      const responseUser = {
        uid: firebaseUser.uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        emailVerified: true,
      };

      return { success: true, user: responseUser };

    } catch (firebaseError: any) {
      console.error('Firebase user creation error:', firebaseError);
      
      // Clean up verification session on error
      this.pendingSignUps.delete(sessionId);
      
      // Handle specific Firebase errors
      if (firebaseError.code === 'auth/email-already-in-use') {
        return { success: false, error: 'An account with this email already exists' };
      } else if (firebaseError.code === 'auth/weak-password') {
        return { success: false, error: 'Password is too weak' };
      } else if (firebaseError.code === 'auth/invalid-email') {
        return { success: false, error: 'Invalid email address' };
      }
      
      return { success: false, error: 'Account creation failed. Please try again.' };
    }
  }

  /**
   * Get verification status
   */
  getVerificationStatus(sessionId: string): { 
    exists: boolean; 
    otpSent: boolean; 
    otpVerified: boolean; 
    expired: boolean;
    email?: string;
  } {
    const pendingSignUp = this.pendingSignUps.get(sessionId);
    
    if (!pendingSignUp) {
      return { exists: false, otpSent: false, otpVerified: false, expired: false };
    }

    const isExpired = Date.now() > pendingSignUp.expiresAt;

    return {
      exists: true,
      otpSent: true,
      otpVerified: pendingSignUp.otpVerified,
      expired: isExpired,
      email: pendingSignUp.email
    };
  }

  /**
   * Cancel verification process
   */
  cancelVerification(sessionId: string): void {
    this.pendingSignUps.delete(sessionId);
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.pendingSignUps.entries()) {
      if (now > session.expiresAt) {
        this.pendingSignUps.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired verification sessions`);
    }

    // Also clean up expired OTPs
    emailOTPService.cleanupExpiredOTPs();
  }

  /**
   * Development only: Get current session count
   */
  getSessionCount(): number {
    return this.pendingSignUps.size;
  }
}

export default new EmailVerificationService();