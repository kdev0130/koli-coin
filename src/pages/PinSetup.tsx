import React, { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { IconLock, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import koliLogo from "@/assets/koli-logo.png";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { setupPin } from "@/lib/pinSecurity";
import { useAuth } from "@/contexts/AuthContext";

export const PinSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pin.length !== 6) {
      toast.error("PIN must be exactly 6 digits");
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      toast.error("PIN must contain only numbers");
      return;
    }

    if (pin !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }

    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    setLoading(true);
    try {
      await setupPin(user.uid, pin);
      toast.success("PIN setup successful!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("PIN setup error:", error);
      toast.error(error.message || "Failed to setup PIN");
    } finally {
      setLoading(false);
    }
  };

  const handlePinInput = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    // Only allow digits and max 6 characters
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setter(cleaned);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={koliLogo} alt="KOLI" className="w-20 h-20" />
        </div>

        <Card className="border-border">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <IconLock className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Setup Your PIN</CardTitle>
            <CardDescription>
              Create a 6-digit PIN to secure your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSetupPin} className="space-y-6">
              {/* PIN Requirements */}
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-2">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <IconAlertCircle className="h-4 w-4 text-blue-500" />
                  PIN Requirements
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                  <li className="flex items-center gap-2">
                    <IconCheck className="h-3 w-3" />
                    Must be exactly 6 digits
                  </li>
                  <li className="flex items-center gap-2">
                    <IconCheck className="h-3 w-3" />
                    Numbers only (0-9)
                  </li>
                  <li className="flex items-center gap-2">
                    <IconCheck className="h-3 w-3" />
                    Easy to remember, hard to guess
                  </li>
                </ul>
              </div>

              {/* PIN Input */}
              <div className="space-y-2">
                <Label htmlFor="pin">Create PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={pin}
                  onChange={(e) => handlePinInput(e.target.value, setPin)}
                  className="text-center text-2xl tracking-widest"
                  required
                />
                <p className="text-xs text-muted-foreground text-center">
                  {pin.length}/6 digits
                </p>
              </div>

              {/* Confirm PIN Input */}
              <div className="space-y-2">
                <Label htmlFor="confirmPin">Confirm PIN</Label>
                <Input
                  id="confirmPin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={confirmPin}
                  onChange={(e) => handlePinInput(e.target.value, setConfirmPin)}
                  className="text-center text-2xl tracking-widest"
                  required
                />
                {confirmPin.length === 6 && (
                  <p className={`text-xs text-center ${pin === confirmPin ? "text-green-500" : "text-red-500"}`}>
                    {pin === confirmPin ? "✓ PINs match" : "✗ PINs do not match"}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || pin.length !== 6 || confirmPin.length !== 6 || pin !== confirmPin}
              >
                {loading ? "Setting up..." : "Complete Setup"}
              </Button>

              {/* Security Note */}
              <p className="text-xs text-muted-foreground text-center">
                Your PIN will be required when you reopen the app. Keep it safe and don't share it with anyone.
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PinSetup;
