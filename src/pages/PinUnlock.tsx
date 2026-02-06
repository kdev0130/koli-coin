import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { IconLock, IconAlertCircle } from "@tabler/icons-react";
import koliLogo from "@/assets/koli-logo.png";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { verifyPin, updateLastUnlock } from "@/lib/pinSecurity";
import { useAuth } from "@/contexts/AuthContext";

interface PinUnlockProps {
  onUnlock: () => void;
}

export const PinUnlock: React.FC<PinUnlockProps> = ({ onUnlock }) => {
  const { user, userData, logout } = useAuth();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const MAX_ATTEMPTS = 5;

  useEffect(() => {
    // Auto-focus on mount
    const input = document.getElementById("pinInput");
    if (input) {
      input.focus();
    }
  }, []);

  const handlePinInput = (value: string) => {
    // Only allow digits and max 6 characters
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setPin(cleaned);

    // Auto-verify when 6 digits entered
    if (cleaned.length === 6) {
      handleVerifyPin(cleaned);
    }
  };

  const handleVerifyPin = async (pinValue?: string) => {
    const pinToVerify = pinValue || pin;

    if (pinToVerify.length !== 6) {
      toast.error("Enter 6-digit PIN");
      return;
    }

    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    if (isLocked) {
      toast.error("Too many failed attempts. Please logout and login again.");
      return;
    }

    setLoading(true);
    try {
      const isValid = await verifyPin(user.uid, pinToVerify);

      if (isValid) {
        // Update last unlock timestamp
        await updateLastUnlock(user.uid);
        toast.success("PIN verified!");
        onUnlock();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin("");

        if (newAttempts >= MAX_ATTEMPTS) {
          setIsLocked(true);
          toast.error("Too many failed attempts. Please logout and login again.");
        } else {
          toast.error(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
        }
      }
    } catch (error: any) {
      console.error("PIN verification error:", error);
      toast.error("Failed to verify PIN");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.info("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <motion.img
            src={koliLogo}
            alt="KOLI"
            className="w-20 h-20"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
        </div>

        <Card className="border-border">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <IconLock className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Enter Your PIN</CardTitle>
            <CardDescription>
              Welcome back, {userData?.name || "User"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Warning if attempts are high */}
            {attempts > 0 && !isLocked && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border ${
                  attempts >= 3
                    ? "bg-red-500/10 border-red-500/20"
                    : "bg-yellow-500/10 border-yellow-500/20"
                }`}
              >
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <IconAlertCircle
                    className={`h-4 w-4 ${attempts >= 3 ? "text-red-500" : "text-yellow-500"}`}
                  />
                  {MAX_ATTEMPTS - attempts} attempts remaining
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Account will be locked after {MAX_ATTEMPTS} failed attempts
                </p>
              </motion.div>
            )}

            {/* Locked State */}
            {isLocked && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <p className="text-sm font-semibold text-red-500 flex items-center gap-2">
                  <IconAlertCircle className="h-4 w-4" />
                  Account Locked
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Too many failed PIN attempts. Please logout and login again with your email and password.
                </p>
              </motion.div>
            )}

            {/* PIN Input */}
            <div className="space-y-4">
              <Input
                id="pinInput"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="• • • • • •"
                value={pin}
                onChange={(e) => handlePinInput(e.target.value)}
                className="text-center text-3xl tracking-widest"
                disabled={loading || isLocked}
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                {pin.length}/6 digits
              </p>
            </div>

            {/* Verify Button */}
            <Button
              onClick={() => handleVerifyPin()}
              className="w-full"
              size="lg"
              disabled={loading || pin.length !== 6 || isLocked}
            >
              {loading ? "Verifying..." : "Unlock"}
            </Button>

            {/* Logout Option */}
            <div className="text-center">
              <button
                onClick={handleLogout}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                disabled={loading}
              >
                Not you? Logout
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Security Note */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          Your PIN protects your account. Never share it with anyone.
        </p>
      </motion.div>
    </div>
  );
};

export default PinUnlock;
