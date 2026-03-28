import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IconLoader, IconLock } from "@tabler/icons-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { canUserWithdraw } from "@/lib/kycService";
import { validatePinFormat, verifyPin } from "@/lib/pinSecurity";

interface ExternalWithdrawModalProps {
  open: boolean;
  onClose: () => void;
  withdrawableAmount: number;
}

export const ExternalWithdrawModal: React.FC<ExternalWithdrawModalProps> = ({
  open,
  onClose,
  withdrawableAmount,
}) => {
  const { user, userData } = useAuth();
  const [checking, setChecking] = useState(false);
  const [pin, setPin] = useState("");
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tokenServiceUrl =
    import.meta.env.VITE_TOKEN_SERVICE_URL || "http://localhost:3000/api";

  useEffect(() => {
    if (open) {
      setPin("");
      setPinError(null);
      setIsPinVerified(false);
      setChecking(false);
      setAmount(withdrawableAmount ? withdrawableAmount.toFixed(2) : "");
      setIsSubmitting(false);
    }
  }, [open, withdrawableAmount]);

  const handlePinChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setPin(cleaned);
    setPinError(null);
  };

  const handleVerifyPin = async () => {
    if (!user?.uid) {
      setPinError("User session not found. Please sign in again.");
      return;
    }

    if (!userData?.hasPinSetup) {
      setPinError("PIN is not set up yet for this account.");
      return;
    }

    const validation = validatePinFormat(pin);
    if (!validation.valid) {
      setPinError(validation.error || "Invalid PIN format");
      return;
    }

    try {
      setChecking(true);
      const valid = await verifyPin(user.uid, pin);

      if (!valid) {
        setPinError("Incorrect PIN.");
        return;
      }

      setIsPinVerified(true);
      toast.success("PIN verified");
    } catch (error: any) {
      console.error("PIN verification failed:", error);
      setPinError(error?.message || "Failed to verify PIN.");
    } finally {
      setChecking(false);
    }
  };

  const handleKKashWithdrawal = async () => {
    if (!user?.email) return;

    const kyc = canUserWithdraw(userData);
    if (!kyc.canWithdraw) {
      toast.error(kyc.reason || "KYC verification required before withdrawal.");
      return;
    }

    const requestedAmount = Number(amount);
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      toast.error("Enter a valid amount to withdraw.");
      return;
    }

    if (requestedAmount > withdrawableAmount) {
      toast.error("Amount exceeds withdrawable balance.");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await user.getIdToken(true);

      const res = await fetch(`${tokenServiceUrl}/kash/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: requestedAmount, pin }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Withdrawal failed.");
      }

      toast.success("Withdrawal sent to K-Kash wallet.");
      onClose();
    } catch (error: any) {
      console.error("K-Kash withdrawal failed:", error);
      toast.error(error?.message || "Withdrawal failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isPinVerified ? "Withdraw to K-Kash" : "Verify PIN"}</DialogTitle>
          <DialogDescription>
            {isPinVerified
              ? `Withdraw up to ${withdrawableAmount.toFixed(2)} KOLI to your K-Kash wallet.`
              : "Enter your 6-digit PIN to continue with withdrawal."}
          </DialogDescription>
        </DialogHeader>

        {!isPinVerified ? (
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="withdraw-pin" className="flex items-center gap-2">
                <IconLock className="w-4 h-4" />
                6-Digit PIN
              </Label>
              <Input
                id="withdraw-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                placeholder="Enter your PIN"
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                disabled={checking}
                className="text-lg tracking-widest"
              />
              <p className="text-xs text-muted-foreground">{pin.length}/6 digits</p>
            </div>

            {pinError && (
              <Alert variant="destructive">
                <AlertDescription>{pinError}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleVerifyPin}
              disabled={checking || pin.length !== 6}
              className="w-full"
            >
              {checking ? (
                <span className="flex items-center gap-2">
                  <IconLoader className="w-4 h-4 animate-spin" />
                  Verifying PIN...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <IconLock className="w-4 h-4" />
                  Continue
                </span>
              )}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3 mt-4">
              <div className="space-y-2">
                <Label htmlFor="withdraw-amount">Amount to Withdraw (KOLI)</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Available: {withdrawableAmount.toLocaleString()} KOLI
                </p>
              </div>
            </div>
            <Button
              onClick={handleKKashWithdrawal}
              disabled={isSubmitting}
              className="w-full mt-4 bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "Processing..." : "Withdraw to K-Kash"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
