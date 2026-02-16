import React, { useEffect, useState } from "react";
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

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000;
const RATE_LIMIT_MESSAGE = "Too many failed attempts, you have been rate limited.";

type SignInRateState = {
  failedAttempts: number;
  cooldownUntil: number;
};

const getRateLimitStorageKey = (email: string) => `koli-signin-rate-limit:${email}`;

const readRateLimitState = (email: string): SignInRateState => {
  const key = getRateLimitStorageKey(email);
  const raw = localStorage.getItem(key);

  if (!raw) {
    return { failedAttempts: 0, cooldownUntil: 0 };
  }

  try {
    const parsed = JSON.parse(raw) as SignInRateState;
    return {
      failedAttempts: parsed.failedAttempts || 0,
      cooldownUntil: parsed.cooldownUntil || 0,
    };
  } catch {
    return { failedAttempts: 0, cooldownUntil: 0 };
  }
};

const writeRateLimitState = (email: string, state: SignInRateState) => {
  localStorage.setItem(getRateLimitStorageKey(email), JSON.stringify(state));
};

const clearRateLimitState = (email: string) => {
  localStorage.removeItem(getRateLimitStorageKey(email));
};

const formatCooldown = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

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
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    const normalizedEmail = formData.email.trim().toLowerCase();

    if (!normalizedEmail) {
      setCooldownSeconds(0);
      return;
    }

    const updateCooldown = () => {
      const state = readRateLimitState(normalizedEmail);
      const remainingMs = state.cooldownUntil - Date.now();
      setCooldownSeconds(remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [formData.email]);

  useEffect(() => {
    if (cooldownSeconds === 0 && error === RATE_LIMIT_MESSAGE) {
      setError("");
    }
  }, [cooldownSeconds, error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShowForgotPassword(false);
    
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    if (!navigator.onLine) {
      setError("No internet connection. Please reconnect and try again.");
      return;
    }

    const normalizedEmail = formData.email.trim().toLowerCase();
    const rateState = readRateLimitState(normalizedEmail);
    const remainingMs = rateState.cooldownUntil - Date.now();

    if (remainingMs > 0) {
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      setCooldownSeconds(remainingSeconds);
      setError(RATE_LIMIT_MESSAGE);
      return;
    }
    
    setLoading(true);
    try {
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
      clearRateLimitState(normalizedEmail);
      setCooldownSeconds(0);
    } catch (error: any) {
      console.error("Sign in error:", error);
      const errorCode = error?.code;
      const isWrongPassword = errorCode === "auth/wrong-password" || errorCode === "auth/invalid-credential";
      const isNetworkError =
        errorCode === "auth/network-request-failed" ||
        errorCode === "unavailable" ||
        errorCode === "deadline-exceeded";

      if (isWrongPassword) {
        setShowForgotPassword(true);
      }

      if (!isNetworkError) {
        const currentState = readRateLimitState(normalizedEmail);
        const nextFailedAttempts = (currentState.failedAttempts || 0) + 1;

        if (nextFailedAttempts >= RATE_LIMIT_MAX_ATTEMPTS) {
          const cooldownUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
          writeRateLimitState(normalizedEmail, {
            failedAttempts: 0,
            cooldownUntil,
          });
          const remainingSeconds = Math.ceil(RATE_LIMIT_COOLDOWN_MS / 1000);
          setCooldownSeconds(remainingSeconds);
          setError(RATE_LIMIT_MESSAGE);
          return;
        }

        writeRateLimitState(normalizedEmail, {
          failedAttempts: nextFailedAttempts,
          cooldownUntil: 0,
        });
      }

      const errorMessage = isWrongPassword
        ? "Incorrect password. Use Forgot password to reset it."
        : errorCode === "auth/user-not-found"
        ? "This email is not registered. Please sign up first."
        : errorCode === "auth/too-many-requests"
        ? "Too many failed attempts. Please try again later"
        : isNetworkError
        ? "Network error while signing in. Check your internet, disable blocker/spoofer extensions, and try again."
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
              disabled={cooldownSeconds > 0}
              className="w-full"
            >
              {cooldownSeconds > 0
                ? `Try again in ${formatCooldown(cooldownSeconds)}`
                : "Sign In"}
            </KoliButton>

            {cooldownSeconds > 0 && (
              <p className="text-destructive text-sm text-left leading-relaxed">
                {RATE_LIMIT_MESSAGE}
              </p>
            )}
          </motion.form>

          {/* Sign Up Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}  // ← ADD THIS LINE
            transition={{ delay: 0.4 }}
            className="text-center mt-8"
          >
            <p className="text-sm text-muted-foreground mb-4">
              Don't have an account?
            </p>
<KoliButton 
  onClick={() => navigate("/signup")} 
  className="w-full max-w-xs"
>
  Sign Up
</KoliButton>
          </motion.div>
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
