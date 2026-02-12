import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import crypto from 'crypto-js';

interface PendingOTP {
  email: string;
  hashedOTP: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  lastSentAt?: Timestamp;
}

/**
 * Email OTP service using Firebase for secure email verification
 * Ensures no user is created until email is verified
 */
class EmailOTPService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ATTEMPTS = 3;
  private readonly RESEND_COOLDOWN = 60 * 1000; // 1 minute
  private readonly COLLECTION_NAME = 'pendingOTPs';

  /**
   * Generate a secure 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash OTP with email as salt for security
   */
  private hashOTP(otp: string, email: string): string {
    const secret = import.meta.env.VITE_OTP_SECRET || 'koli-otp-secret-2024';
    return crypto.SHA256(otp + email + secret).toString();
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
   * Send OTP to email address
   */
  async sendEmailOTP(email: string): Promise<{
    success: boolean;
    otpId?: string;
    error?: string;
    cooldownRemaining?: number;
  }> {
    try {
      const { valid, error } = this.validateEmail(email);
      if (!valid) {
        return { success: false, error };
      }

      const normalizedEmail = email.toLowerCase().trim();
      const otpId = crypto.SHA256(normalizedEmail + Date.now()).toString();

      // Check for existing pending OTP
      const existingDoc = await getDoc(doc(db, this.COLLECTION_NAME, otpId));
      if (existingDoc.exists()) {
        const existingData = existingDoc.data() as PendingOTP;
        
        // Check cooldown period
        if (existingData.lastSentAt) {
          const timeSinceLastSent = Date.now() - existingData.lastSentAt.toMillis();
          if (timeSinceLastSent < this.RESEND_COOLDOWN) {
            const remainingMs = this.RESEND_COOLDOWN - timeSinceLastSent;
            return {
              success: false,
              error: 'Please wait before requesting another OTP',
              cooldownRemaining: Math.ceil(remainingMs / 1000)
            };
          }
        }

        // Check if max attempts reached
        if (existingData.attempts >= this.MAX_ATTEMPTS) {
          return {
            success: false,
            error: 'Maximum OTP attempts exceeded. Please try again later.'
          };
        }
      }

      // Generate new OTP
      const otp = this.generateOTP();
      const hashedOTP = this.hashOTP(otp, normalizedEmail);
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(Date.now() + this.OTP_EXPIRY);

      // Store hashed OTP in Firestore
      const otpData: PendingOTP = {
        email: normalizedEmail,
        hashedOTP,
        attempts: existingDoc.exists() ? (existingDoc.data() as PendingOTP).attempts + 1 : 1,
        maxAttempts: this.MAX_ATTEMPTS,
        createdAt: existingDoc.exists() ? (existingDoc.data() as PendingOTP).createdAt : now,
        expiresAt,
        lastSentAt: now,
      };

      await setDoc(doc(db, this.COLLECTION_NAME, otpId), otpData);

      // Send email via Firebase (will be implemented via Cloud Function or Extension)
      await this.sendOTPEmail(normalizedEmail, otp, otpId);

      console.log(`📧 OTP sent to ${normalizedEmail} (ID: ${otpId})`);
      console.log(`🔐 Development OTP: ${otp} (expires in 5 minutes)`);

      return {
        success: true,
        otpId
      };

    } catch (error) {
      console.error('Failed to send email OTP:', error);
      return {
        success: false,
        error: 'Failed to send verification email. Please try again.'
      };
    }
  }

  /**
   * Send OTP email (to be implemented with Firebase Functions or Email Extension)
   */
  private async sendOTPEmail(email: string, otp: string, otpId: string): Promise<void> {
    try {
      // In production, this would trigger a Firebase Cloud Function or use Firebase Extensions
      // For now, we'll store the email request in Firestore to be processed
      await setDoc(doc(db, 'emailQueue', otpId), {
        to: email,
        subject: 'Your KOLI Verification Code',
        html: this.generateEmailHTML(otp),
        text: `Your KOLI verification code is: ${otp}. This code expires in 5 minutes.`,
        createdAt: Timestamp.now(),
        processed: false,
        otp: otp, // For development - remove in production
      });

      console.log(`📬 Email queued for ${email} with OTP: ${otp}`);
    } catch (error) {
      console.error('Failed to queue email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Generate HTML email template
   */
  private generateEmailHTML(otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>KOLI Email Verification</title>
          <link href="https://fonts.googleapis.com/css?family=Montserrat:400,500,700&display=swap" rel="stylesheet" />
          <style>
            body {
              background: #f8fafc;
              font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 480px;
              margin: 40px auto;
              background: #fff;
              border-radius: 16px;
              box-shadow: 0 4px 24px rgba(30,41,59,0.08);
              padding: 32px 24px;
              text-align: center;
            }
            .logo {
              width: 64px;
              margin-bottom: 16px;
            }
            .title {
              color: #6366f1;
              font-size: 2rem;
              font-weight: 700;
              margin-bottom: 8px;
              letter-spacing: 1px;
              font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
            }
            .subtitle {
              font-size: 1.25rem;
              font-weight: 500;
              margin-bottom: 24px;
              font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
            }
            .code-box {
              border: 2px solid #6366f1;
              border-radius: 12px;
              padding: 24px 0;
              margin: 24px 0;
              font-size: 2.5rem;
              font-weight: 700;
              color: #6366f1;
              letter-spacing: 0.3em;
              background: #f1f5ff;
              font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
            }
            .expires {
              font-size: 0.95rem;
              color: #64748b;
              margin-top: 8px;
              font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
            }
            .security {
              background: #fef2f2;
              border-left: 4px solid #ef4444;
              color: #b91c1c;
              padding: 16px;
              margin: 24px 0 0 0;
              border-radius: 8px;
              text-align: left;
              font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
            }
            .footer {
              margin-top: 32px;
              font-size: 0.95rem;
              color: #64748b;
              font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="https://koli-2bad9.web.app/koli-logo.png" alt="KOLI Logo" class="logo" />
            <div class="title">KOLI</div>
            <div class="subtitle">Email Verification</div>
            <p>Hello,<br>Thank you for signing up for KOLI! Please use the verification code below to complete your registration:</p>
            <div class="code-box">${otp}</div>
            <div class="expires">This code expires in 5 minutes</div>
            <div class="security">
              <strong>Security Notice:</strong>
              <ul>
                <li>Never share this code with anyone</li>
                <li>KOLI will never ask for this code via phone or email</li>
                <li>If you didn't request this code, please ignore this email</li>
              </ul>
            </div>
            <div class="footer">
              If you have any questions, please contact our support team.<br>
              <br>
              &copy; 2026 KOLI. All rights reserved.<br>
              <span style="font-size:0.85em;">This is an automated email, please do not reply.</span>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Verify OTP code
   */
  async verifyEmailOTP(otpId: string, code: string, email: string): Promise<{
    success: boolean;
    verified?: boolean;
    error?: string;
  }> {
    try {
      if (!otpId || !code || !email) {
        return {
          success: false,
          error: 'OTP ID, code, and email are required'
        };
      }

      // Validate OTP format
      if (!/^\d{6}$/.test(code)) {
        return {
          success: false,
          error: 'Please enter a valid 6-digit verification code'
        };
      }

      const normalizedEmail = email.toLowerCase().trim();
      const otpDoc = await getDoc(doc(db, this.COLLECTION_NAME, otpId));

      if (!otpDoc.exists()) {
        return {
          success: false,
          error: 'Verification session not found or expired'
        };
      }

      const otpData = otpDoc.data() as PendingOTP;

      // Check if OTP has expired
      if (Date.now() > otpData.expiresAt.toMillis()) {
        await deleteDoc(doc(db, this.COLLECTION_NAME, otpId));
        return {
          success: false,
          error: 'Verification code has expired'
        };
      }

      // Check if email matches
      if (otpData.email !== normalizedEmail) {
        return {
          success: false,
          error: 'Email does not match verification session'
        };
      }

      // Verify OTP
      const hashedInputOTP = this.hashOTP(code, normalizedEmail);
      if (hashedInputOTP !== otpData.hashedOTP) {
        return {
          success: false,
          error: 'Invalid verification code'
        };
      }

      // Success! Clean up
      await deleteDoc(doc(db, this.COLLECTION_NAME, otpId));
      console.log(`✅ Email ${normalizedEmail} verified successfully!`);

      return {
        success: true,
        verified: true
      };

    } catch (error) {
      console.error('OTP verification error:', error);
      return {
        success: false,
        error: 'Verification failed. Please try again.'
      };
    }
  }

  /**
   * Get OTP status for debugging (development only)
   */
  async getOTPStatus(otpId: string): Promise<{
    exists: boolean;
    expired?: boolean;
    attempts?: number;
    maxAttempts?: number;
    cooldownRemaining?: number;
  }> {
    try {
      const otpDoc = await getDoc(doc(db, this.COLLECTION_NAME, otpId));
      
      if (!otpDoc.exists()) {
        return { exists: false };
      }

      const otpData = otpDoc.data() as PendingOTP;
      const now = Date.now();
      const isExpired = now > otpData.expiresAt.toMillis();
      
      let cooldownRemaining: number | undefined;
      if (otpData.lastSentAt) {
        const timeSinceLastSent = now - otpData.lastSentAt.toMillis();
        if (timeSinceLastSent < this.RESEND_COOLDOWN) {
          cooldownRemaining = Math.ceil((this.RESEND_COOLDOWN - timeSinceLastSent) / 1000);
        }
      }

      return {
        exists: true,
        expired: isExpired,
        attempts: otpData.attempts,
        maxAttempts: otpData.maxAttempts,
        cooldownRemaining
      };

    } catch (error) {
      console.error('Failed to get OTP status:', error);
      return { exists: false };
    }
  }

  /**
   * Clean up expired OTPs (should be called periodically)
   */
  async cleanupExpiredOTPs(): Promise<number> {
    try {
      const now = Timestamp.now();
      const expiredQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('expiresAt', '<', now)
      );
      
      const expiredDocs = await getDocs(expiredQuery);
      let deletedCount = 0;

      for (const docSnap of expiredDocs.docs) {
        await deleteDoc(docSnap.ref);
        deletedCount++;
      }

      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} expired OTPs`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup expired OTPs:', error);
      return 0;
    }
  }
}

export default new EmailOTPService();