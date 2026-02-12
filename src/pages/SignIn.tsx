import React, { useState } from "react";
import { motion } from "motion/react";
import { useNavigate, Link } from "react-router-dom";
import { IconMail, IconLock } from "@tabler/icons-react";
import { Eye, EyeOff } from "lucide-react";
import { Spotlight } from "@/components/ui/spotlight";
import { AnimatedInput } from "@/components/ui/animated-input";
import { KoliButton } from "@/components/ui/koli-button";
import koliLogo from "@/assets/koli-logo.png";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";

const SignIn = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShowForgotPassword(false);
    
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    try {
      const normalizedEmail = formData.email.trim().toLowerCase();
      const rawEmail = formData.email.trim();
      const membersRef = collection(db, "members");

      const [normalizedSnapshot, rawSnapshot] = await Promise.all([
        getDocs(query(membersRef, where("email", "==", normalizedEmail))),
        normalizedEmail === rawEmail
          ? Promise.resolve(null)
          : getDocs(query(membersRef, where("email", "==", rawEmail))),
      ]);

      const isRegistered = !normalizedSnapshot.empty || !!rawSnapshot?.docs?.length;

      if (!isRegistered) {
        setError("This email is not registered. Please sign up first.");
        return;
      }

      // Sign in with Firebase Auth - AuthGuard will handle navigation
      await signInWithEmailAndPassword(auth, normalizedEmail, formData.password);
    } catch (error: any) {
      console.error("Sign in error:", error);
          const errorCode = error?.code;
          const isWrongPassword = errorCode === "auth/wrong-password" || errorCode === "auth/invalid-credential";

          if (isWrongPassword) {
            setShowForgotPassword(true);
          }

          const errorMessage = isWrongPassword
            ? "Incorrect password. Use Forgot password to reset it."
            : errorCode === "auth/user-not-found"
            ? "This email is not registered. Please sign up first."
            : errorCode === "auth/too-many-requests"
            ? "Too many failed attempts. Please try again later"
            : "Failed to sign in. Please try again";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
    if (field === "email") {
      setShowForgotPassword(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background safe-top safe-bottom relative overflow-hidden">
      <Spotlight />
      
      <div className="flex-1 flex flex-col px-6 py-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center"
        >
          <img src={koliLogo} alt="KOLI" className="w-12 h-12" />
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Welcome Back
            </h1>
            <p className="text-muted-foreground text-sm">
              Sign in to your KOLI account
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit}
            className="w-full space-y-5"
          >
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
            </div>

            {/* Forgot Password */}
            {showForgotPassword && (
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  state={{ email: formData.email.trim().toLowerCase() }}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-destructive text-sm text-left leading-relaxed"
              >
                {error}
              </motion.p>
            )}

            <KoliButton
              type="submit"
              loading={loading}
              className="w-full"
            >
              Sign In
            </KoliButton>
          </motion.form>

          {/* Sign Up Link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-sm text-muted-foreground mt-8"
          >
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Sign Up
            </Link>
          </motion.p>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-muted-foreground"
        >
          Kingdom of Love International © 2024
        </motion.p>
      </div>
    </div>
  );
};

export default SignIn;
