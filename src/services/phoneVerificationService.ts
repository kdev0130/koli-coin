// Phone verification service with strict security using real Twilio
import twilioService from './twilioService';
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';

interface PendingSignUp {
  phoneNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  referralCode?: string;
  otpSent: boolean;
  otpVerified: boolean;
  attempts: number;
  lastOtpSent?: number;
  createdAt: number;
  expiresAt: number;
}

/**
 * Phone verification service that manages the OTP flow
 * Ensures no user is created until phone is verified
 */
class PhoneVerificationService {
  private pendingSignUps: Map<string, PendingSignUp> = new Map();
  private readonly OTP_COOLDOWN = 60000; // 1 minute between OTP requests
  private readonly MAX_ATTEMPTS = 3;
  private readonly SESSION_EXPIRY = 15 * 60 * 1000; // 15 minutes

  constructor() {
    // Clean up expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  /**
   * Validate and normalize phone number to E.164 format
   */
  private validatePhoneNumber(phoneNumber: string): { valid: boolean; normalized?: string; error?: string } {
    try {
      if (!phoneNumber || typeof phoneNumber !== 'string') {
        return { valid: false, error: 'Phone number is required' };
      }

      // Check if already in E.164 format
      if (phoneNumber.startsWith('+')) {
        if (!isValidPhoneNumber(phoneNumber)) {
          return { valid: false, error: 'Invalid phone number format' };
        }
        return { valid: true, normalized: phoneNumber };
      }

      // Try to parse and format to E.164
      try {
        const parsed = parsePhoneNumber(phoneNumber, 'US'); // Default to US if no country
        if (!parsed || !parsed.isValid()) {
          return { valid: false, error: 'Invalid phone number' };
        }
        return { valid: true, normalized: parsed.format('E.164') };
      } catch {
        return { valid: false, error: 'Unable to parse phone number' };
      }
    } catch (error) {
      return { valid: false, error: 'Phone number validation failed' };
    }
  }

  /**
   * Start phone verification process
   * Step 1: Store pending signup data and send OTP
   */
  async initiateVerification(signUpData: {
    phoneNumber: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    referralCode?: string;
  }): Promise<{ success: boolean; sessionId?: string; error?: string; cooldownRemaining?: number }> {
    
    const { valid, normalized, error } = this.validatePhoneNumber(signUpData.phoneNumber);
    if (!valid || !normalized) {
      return { success: false, error: error || 'Invalid phone number' };
    }

    const sessionId = normalized; // Use normalized phone as session ID
    const existing = this.pendingSignUps.get(sessionId);
    
    // Check cooldown period
    if (existing?.lastOtpSent) {
      const timeSinceLastOtp = Date.now() - existing.lastOtpSent;
      if (timeSinceLastOtp < this.OTP_COOLDOWN) {
        const remainingMs = this.OTP_COOLDOWN - timeSinceLastOtp;
        return { 
          success: false, 
          error: 'Please wait before requesting another OTP', 
          cooldownRemaining: Math.ceil(remainingMs / 1000) 
        };
      }
    }

    // Check attempt limits
    if (existing && existing.attempts >= this.MAX_ATTEMPTS) {
      return { success: false, error: 'Maximum verification attempts exceeded. Please try again later.' };
    }

    try {
      // Check if Twilio is properly configured
      if (!twilioService.isReady()) {
        return { 
          success: false, 
          error: 'SMS service not available. Please contact support.' 
        };
      }

      console.log(`📞 Initiating phone verification for ${normalized}`);
      
      // Send OTP via Twilio Verify API
      const result = await twilioService.sendOTP(normalized);
      
      if (!result.success) {
        console.error('Failed to send OTP:', result.error);
        return { success: false, error: result.error || 'Failed to send verification code' };
      }

      console.log(`✅ OTP sent successfully to ${normalized}`);

      // Store pending signup data (no user created yet!)
      const pendingSignUp: PendingSignUp = {
        phoneNumber: normalized,
        email: signUpData.email,
        firstName: signUpData.firstName,
        lastName: signUpData.lastName,
        password: signUpData.password,
        referralCode: signUpData.referralCode,
        otpSent: true,
        otpVerified: false,
        attempts: (existing?.attempts || 0) + 1,
        lastOtpSent: Date.now(),
        createdAt: existing?.createdAt || Date.now(),
        expiresAt: Date.now() + this.SESSION_EXPIRY
      };

      this.pendingSignUps.set(sessionId, pendingSignUp);

      return { success: true, sessionId };
    } catch (error) {
      console.error('Failed to initiate verification:', error);
      return { success: false, error: 'Verification service unavailable' };
    }
  }

  /**
   * Verify OTP code
   * Step 2: Verify OTP but don't create user yet
   */
  async verifyOTP(sessionId: string, code: string): Promise<{ success: boolean; error?: string; verified?: boolean }> {
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

    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return { success: false, error: 'Invalid OTP format. Please enter a 6-digit code.' };
    }

    try {
      const result = await twilioService.verifyOTP(pendingSignUp.phoneNumber, code);
      
      if (result.success) {
        // Mark as verified but DON'T create user yet
        pendingSignUp.otpVerified = true;
        this.pendingSignUps.set(sessionId, pendingSignUp);
        
        return { success: true, verified: true };
      } else {
        return { success: false, error: result.error || 'Invalid or expired OTP' };
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      return { success: false, error: 'Verification failed. Please try again.' };
    }
  }

  /**
   * Get verified signup data for user creation
   * Only returns data if OTP was successfully verified
   */
  getVerifiedSignUpData(sessionId: string): PendingSignUp | null {
    const pendingSignUp = this.pendingSignUps.get(sessionId);
    
    if (!pendingSignUp || !pendingSignUp.otpVerified || Date.now() > pendingSignUp.expiresAt) {
      return null;
    }

    return pendingSignUp;
  }

  /**
   * Complete verification and cleanup session
   * Call this after successfully creating the user
   */
  completeVerification(sessionId: string): void {
    this.pendingSignUps.delete(sessionId);
  }

  /**
   * Cancel verification process
   */
  cancelVerification(sessionId: string): void {
    this.pendingSignUps.delete(sessionId);
  }

  /**
   * Get verification status
   */
  getVerificationStatus(sessionId: string): { 
    exists: boolean; 
    otpSent: boolean; 
    otpVerified: boolean; 
    expired: boolean;
    cooldownRemaining?: number;
  } {
    const pendingSignUp = this.pendingSignUps.get(sessionId);
    
    if (!pendingSignUp) {
      return { exists: false, otpSent: false, otpVerified: false, expired: false };
    }

    const isExpired = Date.now() > pendingSignUp.expiresAt;
    let cooldownRemaining: number | undefined;
    
    if (pendingSignUp.lastOtpSent) {
      const timeSinceLastOtp = Date.now() - pendingSignUp.lastOtpSent;
      if (timeSinceLastOtp < this.OTP_COOLDOWN) {
        cooldownRemaining = Math.ceil((this.OTP_COOLDOWN - timeSinceLastOtp) / 1000);
      }
    }

    return {
      exists: true,
      otpSent: pendingSignUp.otpSent,
      otpVerified: pendingSignUp.otpVerified,
      expired: isExpired,
      cooldownRemaining
    };
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.pendingSignUps.entries()) {
      if (now > session.expiresAt) {
        this.pendingSignUps.delete(sessionId);
      }
    }
  }

  /**
   * Development only: Get current session count
   */
  getSessionCount(): number {
    return this.pendingSignUps.size;
  }
}

export default new PhoneVerificationService();