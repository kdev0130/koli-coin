import React, { useState } from "react";
import { motion } from "motion/react";
import { useNavigate, Link } from "react-router-dom";
import { IconMail, IconLock, IconUser, IconGift, IconCheck } from "@tabler/icons-react";
import { Spotlight } from "@/components/ui/spotlight";
import { AnimatedInput } from "@/components/ui/animated-input";
import { KoliButton } from "@/components/ui/koli-button";
import koliLogo from "@/assets/koli-logo.png";

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
    agreedToTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 8) newErrors.password = "Min 8 characters";
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
    
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    navigate("/verify-otp", { state: { email: formData.email } });
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
              Create your KOLI investor account
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <IconUser size={16} className="text-primary" />
                Full Name
              </label>
              <AnimatedInput
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
              {errors.name && (
                <p className="text-destructive text-xs">{errors.name}</p>
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
                <p className="text-destructive text-xs">{errors.email}</p>
              )}
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
              <h3 className="text-sm font-semibold text-foreground">Investment Terms</h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• 30-day lock-in period for all investments</p>
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
            >
              Create Account
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
