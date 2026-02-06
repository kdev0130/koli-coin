import React, { useState } from "react";
import { motion } from "motion/react";
import { useNavigate, Link } from "react-router-dom";
import { IconMail, IconLock, IconUser, IconGift, IconCheck, IconPhone, IconAlertCircle } from "@tabler/icons-react";
import { Spotlight } from "@/components/ui/spotlight";
import { AnimatedInput } from "@/components/ui/animated-input";
import { KoliButton } from "@/components/ui/koli-button";
import koliLogo from "@/assets/koli-logo.png";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import PhoneInput from 'react-phone-number-input';
import { isValidPhoneNumber } from 'libphonenumber-js';
import 'react-phone-number-input/style.css';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
    agreedToTerms: false,
    phoneDisclaimerAccepted: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email";
    }
    
    // International phone validation
    if (!formData.phoneNumber) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!isValidPhoneNumber(formData.phoneNumber)) {
      newErrors.phoneNumber = "Invalid phone number for selected country";
    }
    
    if (!formData.phoneDisclaimerAccepted) {
      newErrors.phoneDisclaimer = "You must accept the phone number terms";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    if (!otpSent) {
      // Step 1: Send OTP
      setLoading(true);
      try {
        // For development: Show OTP in console
        // In production, this will send actual SMS
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`OTP for ${formData.phoneNumber}: ${otp}`);
        
        // Store OTP temporarily (in production, better-auth handles this)
        sessionStorage.setItem('signup_otp', otp);
        sessionStorage.setItem('signup_phone', formData.phoneNumber);
        
        setOtpSent(true);
      } catch (error) {
        console.error("Error sending OTP:", error);
        setErrors({ phoneNumber: "Failed to send OTP. Please try again." });
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Step 2: Verify OTP and create account
    setVerifyingOtp(true);
    try {
      // Verify OTP (in production, use better-auth)
      const storedOtp = sessionStorage.getItem('signup_otp');
      if (otpCode !== storedOtp) {
        setErrors({ otp: "Invalid OTP code" });
        setVerifyingOtp(false);
        return;
      }

      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      // Store additional user data in Firestore members collection
      await setDoc(doc(db, "members", userCredential.user.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: `${formData.firstName} ${formData.lastName}`,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        referralCode: formData.referralCode || null,
        agreedToTerms: formData.agreedToTerms,
        phoneDisclaimerAccepted: formData.phoneDisclaimerAccepted,
        phoneVerified: true,
        emailVerified: true,
        createdAt: new Date().toISOString(),
        balance: 0,
        deposit: 0,
        role: "member",
        // PIN Security - will be set during KYC
        hasPinSetup: false,
        pinHash: null,
        // KYC - not submitted (address collected during KYC)
        kycStatus: "NOT_SUBMITTED",
      });
      
      // Clear OTP session data
      sessionStorage.removeItem('signup_otp');
      sessionStorage.removeItem('signup_phone');
      
      // Navigate directly to dashboard (no PIN setup yet)
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Sign up error:", error);
      const errorMessage = error.code === "auth/email-already-in-use"
        ? "This email is already registered"
        : error.code === "auth/weak-password"
        ? "Password should be at least 6 characters"
        : "Failed to create account. Please try again";
      setErrors({ email: errorMessage });
    } finally {
      setVerifyingOtp(false);
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
              Join the Kingdom
            </h1>
            <p className="text-muted-foreground text-sm">
              Create your KOLI donor account
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
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

            {/* Phone Number with International Support */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <IconPhone size={16} className="text-primary" />
                Mobile Number
              </label>
              <PhoneInput
                international
                defaultCountry="PH"
                value={formData.phoneNumber}
                onChange={(value) => handleChange("phoneNumber", value || "")}
                className="phone-input-custom"
              />
              {errors.phoneNumber && (
                <p className="text-destructive text-xs flex items-center gap-1">
                  <IconAlertCircle size={14} />
                  {errors.phoneNumber}
                </p>
              )}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-2">
                  <IconAlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>Your phone number will be used for account verification and important notifications. Make sure it's accurate and accessible.</span>
                </p>
                <label className="flex items-start gap-2 cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={formData.phoneDisclaimerAccepted}
                    onChange={(e) => handleChange("phoneDisclaimerAccepted", e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-xs text-foreground">I understand and accept</span>
                </label>
                {errors.phoneDisclaimer && (
                  <p className="text-destructive text-xs mt-1">{errors.phoneDisclaimer}</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <IconLock size={16} className="text-primary" />
                Password
              </label>
              <AnimatedInput
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
              />
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
              <AnimatedInput
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
              />
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

            {/* OTP Input (shown after phone verification) */}
            {otpSent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-1.5 bg-primary/5 border border-primary/20 rounded-lg p-4"
              >
                <label className="text-sm font-medium text-foreground">
                  Enter OTP Code
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  We've sent a 6-digit code to {formData.phoneNumber}
                </p>
                <AnimatedInput
                  type="text"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value);
                    if (errors.otp) setErrors((prev) => ({ ...prev, otp: "" }));
                  }}
                  maxLength={6}
                  className="text-center text-lg tracking-wider"
                />
                {errors.otp && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <IconAlertCircle size={14} />
                    {errors.otp}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode("");
                  }}
                  className="text-xs text-primary hover:underline mt-2"
                >
                  Change phone number
                </button>
              </motion.div>
            )}

            <KoliButton
              type="submit"
              loading={loading || verifyingOtp}
              className="w-full mt-6"
            >
              {!otpSent ? "Send OTP" : "Verify & Create Account"}
            </KoliButton>
          </motion.form>

          {/* Sign In Link */}
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
        </div>
      </div>
    </div>
  );
};

export default SignUp;
