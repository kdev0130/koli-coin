// API routes for email verification and user signup
import emailVerificationService from '../services/emailVerificationService';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

export interface SignUpRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  referralCode?: string;
}

export interface SendOTPRequest {
  sessionId?: string; // For resend
}

export interface VerifyOTPRequest {
  sessionId: string;
  code: string;
}

export interface CompleteSignUpRequest {
  sessionId: string;
}

/**
 * Step 1: Initiate email verification and send OTP
 * POST /api/auth/send-otp
 */
export const sendOTP = async (signUpData: SignUpRequest): Promise<{
  success: boolean;
  sessionId?: string;
  error?: string;
  cooldownRemaining?: number;
}> => {
  try {
    console.log('📝 Validating signup data...');
    
    // Basic validation
    if (!signUpData.email || !signUpData.firstName || !signUpData.lastName || !signUpData.password) {
      return { success: false, error: 'All required fields must be provided' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signUpData.email)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Validate password strength
    if (signUpData.password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }

    // Note: Email uniqueness will be checked during user creation in completeSignUp

    // Initiate email verification
    const result = await emailVerificationService.initiateVerification(signUpData);
    
    return result;
  } catch (error) {
    console.error('Send OTP API error:', error);
    return { success: false, error: 'Service temporarily unavailable' };
  }
};

/**
 * Step 2: Verify OTP code
 * POST /api/auth/verify-otp
 */
export const verifyOTP = async (request: VerifyOTPRequest): Promise<{
  success: boolean;
  verified?: boolean;
  error?: string;
}> => {
  try {
    if (!request.sessionId || !request.code) {
      return { success: false, error: 'Session ID and verification code are required' };
    }

    const result = await emailVerificationService.verifyOTP(request.sessionId, request.code);
    
    return result;
  } catch (error) {
    console.error('Verify OTP API error:', error);
    return { success: false, error: 'Verification failed. Please try again.' };
  }
};

/**
 * Step 3: Complete signup after OTP verification
 * POST /api/auth/complete-signup
 */
export const completeSignUp = async (request: CompleteSignUpRequest): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> => {
  try {
    if (!request.sessionId) {
      return { success: false, error: 'Session ID is required' };
    }

    // Complete signup through email verification service
    const result = await emailVerificationService.completeSignUp(request.sessionId);
    
    return result;
  } catch (error) {
    console.error('Complete signup API error:', error);
    return { success: false, error: 'Signup failed. Please try again.' };
  }
};

/**
 * Resend OTP to existing session
 * POST /api/auth/resend-otp
 */
export const resendOTP = async (request: SendOTPRequest): Promise<{
  success: boolean;
  error?: string;
  cooldownRemaining?: number;
}> => {
  try {
    if (!request.sessionId) {
      return { success: false, error: 'Session ID is required' };
    }

    const result = await emailVerificationService.resendOTP(request.sessionId);
    
    return result;
  } catch (error) {
    console.error('Resend OTP API error:', error);
    return { success: false, error: 'Failed to resend verification email. Please try again.' };
  }
};

/**
 * Get verification status
 * GET /api/auth/verification-status/:sessionId
 */
export const getVerificationStatus = (sessionId: string) => {
  if (!sessionId) {
    return { exists: false, otpSent: false, otpVerified: false, expired: false };
  }
  
  return emailVerificationService.getVerificationStatus(sessionId);
};