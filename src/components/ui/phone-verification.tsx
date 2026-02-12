import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconPhone, IconShield, IconClock, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { PhoneNumberInput } from '@/components/ui/phone-number-input';
import { OTPInput } from '@/components/ui/otp-input';
import { KoliButton } from '@/components/ui/koli-button';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { cn } from '@/lib/utils';

interface PhoneVerificationProps {
  onVerificationComplete: (sessionId: string, phoneNumber: string) => void;
  onSendOTP: (phoneNumber: string) => Promise<{ success: boolean; sessionId?: string; error?: string; cooldownRemaining?: number }>;
  onVerifyOTP: (sessionId: string, code: string) => Promise<{ success: boolean; verified?: boolean; error?: string }>;
  onResendOTP: (sessionId: string) => Promise<{ success: boolean; error?: string; cooldownRemaining?: number }>;
  disabled?: boolean;
  initialPhoneNumber?: string;
}

type VerificationStep = 'phone' | 'otp' | 'verified';

export const PhoneVerification: React.FC<PhoneVerificationProps> = ({
  onVerificationComplete,
  onSendOTP,
  onVerifyOTP,
  onResendOTP,
  disabled = false,
  initialPhoneNumber = ''
}) => {
  const [step, setStep] = useState<VerificationStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [otpCode, setOtpCode] = useState('');
  const [sessionId, setSessionId] = useState<string>('');
  
  // Loading states
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resending, setResending] = useState(false);
  
  // Error states
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  
  // Cooldown for resend
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);
  
  // Cooldown timer effect
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  // Clear errors when inputs change
  useEffect(() => {
    if (phoneError) setPhoneError('');
  }, [phoneNumber]);

  useEffect(() => {
    if (otpError) setOtpError('');
  }, [otpCode]);

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) {
      setPhoneError('Phone number is required');
      return false;
    }

    if (!isValidPhoneNumber(phone)) {
      setPhoneError('Please enter a valid phone number');
      return false;
    }

    setPhoneError('');
    return true;
  };

  const handleSendOTP = async () => {
    if (!validatePhoneNumber(phoneNumber)) return;
    
    setSendingOtp(true);
    setPhoneError('');
    
    try {
      const result = await onSendOTP(phoneNumber);
      
      if (result.success && result.sessionId) {
        setSessionId(result.sessionId);
        setStep('otp');
        setCooldownSeconds(60); // 1 minute cooldown
        setResendAttempts(0);
      } else {
        setPhoneError(result.error || 'Failed to send verification code');
        if (result.cooldownRemaining) {
          setCooldownSeconds(result.cooldownRemaining);
        }
      }
    } catch (error) {
      setPhoneError('Service temporarily unavailable');
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
          onVerificationComplete(sessionId, phoneNumber);
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
        setResendAttempts(prev => prev + 1);
      } else {
        setOtpError(result.error || 'Failed to resend code');
        if (result.cooldownRemaining) {
          setCooldownSeconds(result.cooldownRemaining);
        }
      }
    } catch (error) {
      setOtpError('Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const handleEditPhoneNumber = () => {
    setStep('phone');
    setOtpCode('');
    setOtpError('');
    setCooldownSeconds(0);
    setSessionId('');
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4">
        <div className={cn(
          "flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium",
          step === 'phone' ? "bg-blue-100 text-blue-700" : step === 'verified' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        )}>
          <IconPhone size={16} />
          <span>Phone</span>
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
        {/* Phone Number Input Step */}
        {step === 'phone' && (
          <motion.div
            key="phone"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Enter your phone number</h3>
              <p className="text-sm text-gray-600 mt-1">We'll send you a verification code via SMS</p>
            </div>

            <PhoneNumberInput
              value={phoneNumber}
              onChange={(value) => setPhoneNumber(value || '')}
              error={phoneError}
              disabled={disabled || sendingOtp}
              placeholder="Enter your phone number"
              required
            />

            <KoliButton
              onClick={handleSendOTP}
              loading={sendingOtp}
              disabled={disabled || sendingOtp || !phoneNumber || !isValidPhoneNumber(phoneNumber) || cooldownSeconds > 0}
              className="w-full"
            >
              {cooldownSeconds > 0 ? (
                <span className="flex items-center gap-2">
                  <IconClock size={16} />
                  Wait {cooldownSeconds}s
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <IconPhone size={16} />
                  Send Verification Code
                </span>
              )}
            </KoliButton>
          </motion.div>
        )}

        {/* OTP Verification Step */}
        {step === 'otp' && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Enter verification code</h3>
              <p className="text-sm text-gray-600 mt-1">
                We sent a 6-digit code to{' '}
                <span className="font-medium">{phoneNumber}</span>
              </p>
              <button
                onClick={handleEditPhoneNumber}
                className="text-blue-600 hover:text-blue-700 text-sm mt-1"
                disabled={disabled}
              >
                Change phone number
              </button>
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
                  <span className="text-sm">Verifying...</span>
                </div>
              </div>
            )}

            <div className="text-center">
              <p className="text-sm text-gray-600">Didn't receive the code?</p>
              <button
                onClick={handleResendOTP}
                disabled={disabled || resending || cooldownSeconds > 0}
                className={cn(
                  "text-sm font-medium mt-1",
                  cooldownSeconds > 0 || disabled || resending
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-blue-600 hover:text-blue-700"
                )}
              >
                {resending ? (
                  <span className="flex items-center gap-1 justify-center">
                    <div className="animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full"></div>
                    Resending...
                  </span>
                ) : cooldownSeconds > 0 ? (
                  `Resend in ${cooldownSeconds}s`
                ) : (
                  `Resend Code${resendAttempts > 0 ? ` (${resendAttempts})` : ''}`
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
              <h3 className="text-lg font-semibold text-gray-900">Phone number verified!</h3>
              <p className="text-sm text-gray-600 mt-1">
                Your phone number <span className="font-medium">{phoneNumber}</span> has been successfully verified.
              </p>
            </div>
            
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-green-600">
                <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
                <span className="text-sm">Completing registration...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};