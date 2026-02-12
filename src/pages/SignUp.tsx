import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate, Link } from "react-router-dom";
import { IconMail, IconLock, IconUser, IconGift, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import { Eye, EyeOff } from "lucide-react";
import { Spotlight } from "@/components/ui/spotlight";
import { AnimatedInput } from "@/components/ui/animated-input";
import { KoliButton } from "@/components/ui/koli-button";
import { EmailVerification } from "@/components/ui/email-verification";
import koliLogo from "@/assets/koli-logo.png";
import { sendOTP, verifyOTP, completeSignUp, resendOTP } from "@/api/authApi";

type SignUpStep = 'form' | 'email-verification' | 'completing';

const STORAGE_KEY = 'koli_signup_session';

const SignUp = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<SignUpStep>('form');
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
    agreedToTerms: false,
  });
  
  const [verificationData, setVerificationData] = useState({
    sessionId: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem(STORAGE_KEY);
    if (savedSession) {
      try {
        const { formData: savedFormData, verificationData: savedVerificationData, step: savedStep } = JSON.parse(savedSession);
        setFormData(savedFormData);
        setVerificationData(savedVerificationData);
        setStep(savedStep);
        console.log('📦 Restored signup session from storage');
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (step === 'email-verification' && verificationData.sessionId) {
      const sessionData = {
        formData,
        verificationData,
        step,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
      console.log('💾 Saved signup session to storage');
    }
  }, [step, formData, verificationData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else {
      if (formData.password.length < 8) {
        newErrors.password = "At least 8 characters required";
      } else if (!/[A-Z]/.test(formData.password)) {
        newErrors.password = "One capital letter required";
      } else if (!/[0-9]/.test(formData.password)) {
        newErrors.password = "At least one number required";
      } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
        newErrors.password = "One special character required";
      }
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }
    
    if (!formData.agreedToTerms) {
      newErrors.terms = "You must agree to the terms";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setStep('email-verification');
  };

  // Email verification handlers
  const handleSendOTP = async (email: string) => {
    try {
      const result = await sendOTP({
        email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password,
        referralCode: formData.referralCode
      });

      if (result.success && result.sessionId) {
        setVerificationData({
          sessionId: result.sessionId,
        });
      }

      return result;
    } catch (error) {
      console.error('Send OTP error:', error);
      return { success: false, error: 'Failed to send verification email' };
    }
  };

  const handleVerifyOTP = async (sessionId: string, code: string) => {
    try {
      return await verifyOTP({ sessionId, code });
    } catch (error) {
      console.error('Verify OTP error:', error);
      return { success: false, error: 'Verification failed' };
    }
  };

  const handleResendOTP = async (sessionId: string) => {
    try {
      return await resendOTP({ sessionId });
    } catch (error) {
      console.error('Resend OTP error:', error);
      return { success: false, error: 'Failed to resend code' };
    }
  };

  const handleVerificationComplete = async (sessionId: string) => {
    setStep('completing');
    
    try {
      const result = await completeSignUp({ sessionId });
      
      if (result.success) {
        // Clear saved session from localStorage
        localStorage.removeItem(STORAGE_KEY);
        console.log('🧹 Cleared signup session from storage');
        
        // Registration successful, navigate to dashboard
        navigate("/dashboard");
      } else {
        // Handle error - go back to form
        setErrors({ general: result.error || 'Registration failed' });
        setStep('form');
      }
    } catch (error) {
      console.error('Complete signup error:', error);
      setErrors({ general: 'Registration failed. Please try again.' });
      setStep('form');
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background safe-top safe-bottom relative overflow-hidden">
      <Spotlight />
      
      <div className="flex-1 flex flex-col px-6 py-6 relative z-10 overflow-y-auto scrollbar-hide">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center mb-6"
        >
          <img src={koliLogo} alt="KOLI" className="w-10 h-10" />
        </motion.div>

        {/* Main Content */}
        <div className="max-w-sm mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-6"
          >
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {step === 'email-verification' ? 'Verify Your Email' : step === 'completing' ? 'Creating Account' : 'Join the Kingdom'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {step === 'email-verification' 
                ? 'We need to verify your email address for security'
                : step === 'completing'
                ? 'Please wait while we create your account...'
                : 'Create your KOLI donor account'
              }
            </p>
          </motion.div>

          {step === 'form' && (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onSubmit={handleFormSubmit}
              className="space-y-4"
            >
              {/* General Error */}
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm flex items-center gap-2">
                    <IconAlertCircle size={16} />
                    {errors.general}
                  </p>
                </div>
              )}

              {/* First Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <IconUser size={16} className="text-primary" />
                  First Name
                </label>
                <AnimatedInput
                  type="text"
                  placeholder="Enter your first name"
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                />
                {errors.firstName && (
                  <p className="text-destructive text-xs">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <IconUser size={16} className="text-primary" />
                  Last Name
                </label>
                <AnimatedInput
                  type="text"
                  placeholder="Enter your last name"
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                />
                {errors.lastName && (
                  <p className="text-destructive text-xs">{errors.lastName}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <IconMail size={16} className="text-primary" />
                  Email Address
                </label>
                <AnimatedInput
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
                {errors.email && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <IconAlertCircle size={14} />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <IconLock size={16} className="text-primary" />
                  Password
                </label>
                <div className="relative">
                  <AnimatedInput
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-destructive text-xs">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <IconLock size={16} className="text-primary" />
                  Confirm Password
                </label>
                <div className="relative">
                  <AnimatedInput
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-destructive text-xs">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Referral Code */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <IconGift size={16} className="text-primary" />
                  Referral Code <span className="text-muted-foreground">(optional)</span>
                </label>
                <AnimatedInput
                  type="text"
                  placeholder="Enter referral code"
                  value={formData.referralCode}
                  onChange={(e) => handleChange("referralCode", e.target.value)}
                />
              </div>

              {/* Terms Agreement */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-secondary/50 rounded-xl p-4 space-y-3"
              >
                <h3 className="text-sm font-semibold text-foreground">Donation Terms</h3>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>• 30-day lock-in period for all donations</p>
                  <p>• Maximum 30% withdrawal during lock-in</p>
                  <p>• Early withdrawal fees may apply</p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => handleChange("agreedToTerms", !formData.agreedToTerms)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      formData.agreedToTerms
                        ? "bg-primary border-primary"
                        : "border-border"
                    }`}
                  >
                    {formData.agreedToTerms && (
                      <IconCheck size={14} className="text-primary-foreground" />
                    )}
                  </button>
                  <span className="text-sm text-foreground">
                    I agree to the 30-day lock-in and 30% withdrawal terms
                  </span>
                </label>
                {errors.terms && (
                  <p className="text-destructive text-xs">{errors.terms}</p>
                )}
              </motion.div>

              <KoliButton
                type="submit"
                loading={loading}
                className="w-full mt-6"
                disabled={!formData.agreedToTerms}
              >
                Continue to Email Verification
              </KoliButton>
            </motion.form>
          )}

          {step === 'email-verification' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <EmailVerification
                email={formData.email}
                onVerificationComplete={handleVerificationComplete}
                onSendOTP={handleSendOTP}
                onVerifyOTP={handleVerifyOTP}
                onResendOTP={handleResendOTP}
                disabled={loading}
                onBack={() => setStep('form')}
              />
            </motion.div>
          )}

          {step === 'completing' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-12"
            >
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Creating your account</h3>
                <p className="text-sm text-gray-600">
                  Please wait while we set up your KOLI account...
                </p>
              </div>
            </motion.div>
          )}

          {/* Sign In Link */}
          {step === 'form' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center text-sm text-muted-foreground mt-6"
            >
              Already have an account?{" "}
              <Link to="/signin" className="text-primary font-medium hover:underline">
                Sign In
              </Link>
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignUp;
