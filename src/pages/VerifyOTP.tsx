import React, { useState } from "react";
import { motion } from "motion/react";
import { useNavigate, useLocation } from "react-router-dom";
import { IconMail, IconRefresh } from "@tabler/icons-react";
import { Spotlight } from "@/components/ui/spotlight";
import { OTPInput } from "@/components/ui/otp-input";
import { KoliButton } from "@/components/ui/koli-button";
import koliLogo from "@/assets/koli-logo.png";

const VerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "your@email.com";
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const handleComplete = async (otp: string) => {
    setError("");
    setLoading(true);
    
    // Simulate API verification
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // For demo, accept any 6-digit code
    if (otp.length === 6) {
      navigate("/dashboard");
    } else {
      setError("Invalid verification code");
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    
    setResending(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setResending(false);
    
    // Start countdown
    setResendCountdown(60);
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-8"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <IconMail size={40} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Verify Your Email
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We've sent a 6-digit verification code to
            </p>
            <p className="text-primary font-medium mt-1">{email}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full space-y-6"
          >
            <OTPInput
              length={6}
              onComplete={handleComplete}
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-destructive text-sm text-center"
              >
                {error}
              </motion.p>
            )}

            {loading && (
              <div className="flex justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
                />
              </div>
            )}

            {/* Resend */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Didn't receive the code?
              </p>
              <button
                onClick={handleResend}
                disabled={resendCountdown > 0 || resending}
                className="text-primary font-medium text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                {resending ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <IconRefresh size={16} />
                    </motion.div>
                    Sending...
                  </>
                ) : resendCountdown > 0 ? (
                  `Resend in ${resendCountdown}s`
                ) : (
                  <>
                    <IconRefresh size={16} />
                    Resend Code
                  </>
                )}
              </button>
            </div>

            {/* Demo hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-xs text-muted-foreground text-center bg-secondary/50 rounded-lg p-3"
            >
              Demo: Enter any 6 digits to continue
            </motion.p>
          </motion.div>
        </div>

        {/* Back button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <KoliButton
            variant="ghost"
            className="w-full"
            onClick={() => navigate(-1)}
          >
            Go Back
          </KoliButton>
        </motion.div>
      </div>
    </div>
  );
};

export default VerifyOTP;
