import React, { useState } from "react";
import { motion } from "motion/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { sendPasswordResetOTP } from "@/lib/authClient";

const ForgotPasswordPage: React.FC = () => {
  const location = useLocation();
  const prefilledEmail = ((location.state as { email?: string } | null)?.email || "").toLowerCase();
  const [method, setMethod] = useState<"phone" | "email">("email");
  const [email, setEmail] = useState(prefilledEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      console.log("[ForgotPasswordPage] Sending email:", email);
      await sendPasswordResetOTP(email);
      setSuccess("If the email exists, an OTP has been sent.");
      setTimeout(() => navigate("/verify-reset-otp", { state: { email } }), 1200);
    } catch (err: any) {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex min-h-screen items-center justify-center bg-background px-4 py-10"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-xl rounded-xl border border-border bg-card/80 p-6 shadow-[0_8px_32px_-8px_hsla(0,0%,0%,0.5)] sm:p-8"
      >
        <h1 className="text-3xl font-bold text-foreground sm:text-5xl text-[hsl(43,85%,46%)]">Reset password</h1>
        <p className="mt-4 max-w-lg text-sm text-muted-foreground sm:text-lg">
          To protect your account, you won’t be able to withdraw funds for 24 hours after you reset or
          change your account password.
        </p>

        <div className="mt-8 flex items-center gap-6 border-b border-border/80">
          <button
            type="button"
            onClick={() => setMethod("email")}
            className={`pb-2 text-base font-medium transition-colors ${method === "email" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setMethod("phone")}
            className={`pb-2 text-base font-medium transition-colors ${method === "phone" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Phone
          </button>
        </div>

        {method === "phone" ? (
          <div className="mt-4 rounded-lg border border-border bg-input/30 px-3 py-3 sm:px-4">
            <p className="text-sm text-muted-foreground">
              Phone reset is currently unavailable. Please use the email method to reset your password.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="rounded-lg border border-border bg-input px-3 py-2 sm:px-4 sm:py-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <button
              type="submit"
              className="mt-2 w-full rounded-full bg-gradient-to-r from-koli-gold to-koli-gold-dark py-3 text-base font-semibold text-koli-navy transition-all hover:from-koli-gold-dark hover:to-koli-gold disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading}
            >
              {loading ? "Sending..." : "Next"}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link to="/signin" className="text-base font-semibold text-primary underline-offset-2 hover:underline">
            Return to login
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ForgotPasswordPage;
