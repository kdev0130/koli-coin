import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconMail, IconShield, IconClock, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { OTPInput } from '@/components/ui/otp-input';
import { KoliButton } from '@/components/ui/koli-button';
import { cn } from '@/lib/utils';

interface EmailVerificationProps {
  email: string;
  onVerificationComplete: (sessionId: string) => void;
  onSendOTP: (email: string) => Promise<{ success: boolean; sessionId?: string; error?: string; cooldownRemaining?: number }>;
  onVerifyOTP: (sessionId: string, code: string) => Promise<{ success: boolean; verified?: boolean; error?: string }>;
  onResendOTP: (sessionId: string) => Promise<{ success: boolean; error?: string; cooldownRemaining?: number }>;
  disabled?: boolean;
  onBack?: () => void;
}

type VerificationStep = 'sending' | 'otp' | 'verified';

export const EmailVerification: React.FC<EmailVerificationProps> = ({
  email,
  onVerificationComplete,
  onSendOTP,
  onVerifyOTP,
  onResendOTP,
  disabled = false,
  onBack
}) => {
  const [step, setStep] = useState<VerificationStep>('sending');
  const [sessionId, setSessionId] = useState<string>('');
  const [otpCode, setOtpCode] = useState('');
  
  // Loading states
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resending, setResending] = useState(false);
  
  // Error states
  const [otpError, setOtpError] = useState('');
  
  // Cooldown for resend
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);
  
  // OTP expiry countdown
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(300); // 5 minutes

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  // OTP expiry timer effect
  useEffect(() => {
    if (step === 'otp' && otpExpirySeconds > 0) {
      const timer = setTimeout(() => {
        setOtpExpirySeconds(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [step, otpExpirySeconds]);

  // Clear OTP error when input changes
  useEffect(() => {
    if (otpError) setOtpError('');
  }, [otpCode]);

  // Auto-send OTP when component mounts
  useEffect(() => {
    handleInitialSendOTP();
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInitialSendOTP = async () => {
    setSendingOtp(true);
    setOtpError('');
    
    try {
      const result = await onSendOTP(email);
      
      if (result.success && result.sessionId) {
        setSessionId(result.sessionId);
        setStep('otp');
        setCooldownSeconds(60);
        setOtpExpirySeconds(300); // Reset to 5 minutes
        setResendAttempts(0);
      } else {
        setOtpError(result.error || 'Failed to send verification email');
        if (result.cooldownRemaining) {
          setCooldownSeconds(result.cooldownRemaining);
        }
      }
    } catch (error) {
      setOtpError('Service temporarily unavailable');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOTP = async (code: string) => {
    if (!code || code.length !== 6) {
      setOtpError('Please enter a valid 6-digit code');
      return;
    }

    setVerifyingOtp(true);
    setOtpError('');
    
    try {
      const result = await onVerifyOTP(sessionId, code);
      
      if (result.success && result.verified) {
        setStep('verified');
        // Call completion callback after a brief success display
        setTimeout(() => {
          onVerificationComplete(sessionId);
        }, 1500);
      } else {
        setOtpError(result.error || 'Invalid verification code');
        setOtpCode(''); // Clear the OTP input
      }
    } catch (error) {
      setOtpError('Verification failed. Please try again.');
      setOtpCode('');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOTP = async () => {
    if (cooldownSeconds > 0) return;
    
    setResending(true);
    setOtpError('');
    setOtpCode('');
    
    try {
      const result = await onResendOTP(sessionId);
      
      if (result.success) {
        setCooldownSeconds(60);
        setOtpExpirySeconds(300); // Reset to 5 minutes
        setResendAttempts(prev => prev + 1);
      } else {
        setOtpError(result.error || 'Failed to resend verification email');
        if (result.cooldownRemaining) {
          setCooldownSeconds(result.cooldownRemaining);
        }
      }
    } catch (error) {
      setOtpError('Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4">
        <div className={cn(
          "flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium",
          step === 'sending' ? "bg-blue-100 text-blue-700" : step === 'verified' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        )}>
          <IconMail size={16} />
          <span>Email</span>
        </div>
        
        <div className={cn(
          "w-8 h-0.5",
          step === 'otp' || step === 'verified' ? "bg-blue-500" : "bg-gray-300"
        )}></div>
        
        <div className={cn(
          "flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium",
          step === 'otp' ? "bg-blue-100 text-blue-700" : step === 'verified' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        )}>
          <IconShield size={16} />
          <span>Verify</span>
        </div>
        
        <div className={cn(
          "w-8 h-0.5",
          step === 'verified' ? "bg-green-500" : "bg-gray-300"
        )}></div>
        
        <div className={cn(
          "flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium",
          step === 'verified' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        )}>
          <IconCheck size={16} />
          <span>Complete</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Sending Email Step */}
        {step === 'sending' && (
          <motion.div
            key="sending"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Sending verification email</h3>
              <p className="text-sm text-gray-600 mt-1">
                We're sending a verification code to{' '}
                <span className="font-medium">{email}</span>
              </p>
            </div>

            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-sm">Sending email...</span>
              </div>
            </div>

            {otpError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-3"
              >
                <p className="text-red-600 text-sm flex items-center gap-2">
                  <IconAlertCircle size={16} />
                  {otpError}
                </p>
                {cooldownSeconds <= 0 && (
                  <button
                    onClick={handleInitialSendOTP}
                    disabled={sendingOtp}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Try again
                  </button>
                )}
              </motion.div>
            )}

            {onBack && (
              <div className="text-center">
                <button
                  onClick={onBack}
                  className="text-sm text-gray-500 hover:text-gray-700"
                  disabled={sendingOtp}
                >
                  ← Back to form
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* OTP Entry Step */}
        {step === 'otp' && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Check your email</h3>
              <p className="text-sm text-gray-600 mt-1">
                We sent a 6-digit code to{' '}
                <span className="font-medium">{email}</span>
              </p>
              {onBack && (
                <button
                  onClick={onBack}
                  className="text-blue-600 hover:text-blue-700 text-sm mt-1"
                  disabled={disabled}
                >
                  Change email
                </button>
              )}
            </div>

            {/* OTP Expiry Timer */}
            <div className="text-center">
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm",
                otpExpirySeconds <= 60 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
              )}>
                <IconClock size={14} />
                <span>Code expires in {formatTime(otpExpirySeconds)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <OTPInput
                length={6}
                onComplete={handleVerifyOTP}
                className="justify-center"
              />
              
              {otpError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-600 text-center flex items-center justify-center gap-1"
                >
                  <IconAlertCircle size={16} />
                  {otpError}
                </motion.p>
              )}
            </div>

            {verifyingOtp && (
              <div className="flex justify-center">
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span className="text-sm">Verifying code...</span>
                </div>
              </div>
            )}

            {/* Email Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 font-medium mb-2">Don't see the email?</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Check your spam/junk folder</li>
                <li>• Make sure {email} is correct</li>
                <li>• Wait a few minutes for delivery</li>
              </ul>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">Didn't receive the email?</p>
              <button
                onClick={handleResendOTP}
                disabled={disabled || resending || cooldownSeconds > 0 || otpExpirySeconds <= 0}
                className={cn(
                  "text-sm font-medium mt-1",
                  cooldownSeconds > 0 || disabled || resending || otpExpirySeconds <= 0
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-blue-600 hover:text-blue-700"
                )}
              >
                {resending ? (
                  <span className="flex items-center gap-1 justify-center">
                    <div className="animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full"></div>
                    Sending...
                  </span>
                ) : cooldownSeconds > 0 ? (
                  `Resend in ${cooldownSeconds}s`
                ) : otpExpirySeconds <= 0 ? (
                  'Code expired - please restart'
                ) : (
                  `Resend email${resendAttempts > 0 ? ` (${resendAttempts})` : ''}`
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Verification Complete Step */}
        {step === 'verified' && (
          <motion.div
            key="verified"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <IconCheck className="w-8 h-8 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Email verified!</h3>
              <p className="text-sm text-gray-600 mt-1">
                Your email <span className="font-medium">{email}</span> has been successfully verified.
              </p>
            </div>
            
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-green-600">
                <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
                <span className="text-sm">Creating your account...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};