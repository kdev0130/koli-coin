import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  IconAlertCircle,
  IconCircleCheck,
  IconLock,
  IconWallet,
  IconClock,
  IconShield,
} from "@tabler/icons-react";
import { DonationContract, getWithdrawalDetails } from "@/lib/donationContract";
import { canUserWithdraw, isUserFullyVerified } from "@/lib/kycService";
import { validatePinFormat, verifyPin } from "@/lib/pinSecurity";
import { toast } from "sonner";

interface WithdrawalModalProps {
  open: boolean;
  onClose: () => void;
  contract: DonationContract | null;
  userData: any;
  userId: string;
  onWithdrawSuccess: () => void;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  open,
  onClose,
  contract,
  userData,
  userId,
  onWithdrawSuccess,
}) => {
  const [pin, setPin] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setPin("");
      setError(null);
      setIsProcessing(false);
    }
  }, [open]);

  if (!contract) return null;

  const details = getWithdrawalDetails(contract);
  const withdrawalAmount = details.withdrawalPerPeriod;

  // Check KYC status
  const { canWithdraw: kycAllowed, reason: kycReason } = canUserWithdraw(userData);
  const isVerified = isUserFullyVerified(userData);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPin(value);
    setError(null);
  };

  const handleWithdraw = async () => {
    try {
      setError(null);
      setIsProcessing(true);

      // Validate PIN format
      const pinValidation = validatePinFormat(pin);
      if (!pinValidation.valid) {
        setError(pinValidation.error || "Invalid PIN format");
        setIsProcessing(false);
        return;
      }

      // Verify PIN
      const isPinValid = await verifyPin(userId, pin);
      if (!isPinValid) {
        setError("Incorrect PIN. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Import withdraw function dynamically to avoid circular deps
      const { withdrawWithPin } = await import("@/lib/donationContract");
      
      // Process withdrawal with PIN verification
      await withdrawWithPin(contract.id!, userId, pin);

      toast.success("Withdrawal Request Submitted!", {
        description: `${withdrawalAmount.toLocaleString()} KOLI will be sent to your registered account within 24 hours.`,
      });

      // Close modal and notify parent
      onClose();
      onWithdrawSuccess();
    } catch (err: any) {
      console.error("Withdrawal error:", err);
      setError(err.message || "Failed to process withdrawal");
      toast.error("Withdrawal Failed", {
        description: err.message || "Please try again later",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconWallet size={24} className="text-primary" />
            P2P Withdrawal Request
          </DialogTitle>
          <DialogDescription>
            Verify your identity to initiate a peer-to-peer withdrawal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* KYC Status Check */}
          {!isVerified && (
            <Alert variant="destructive">
              <IconAlertCircle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-semibold">KYC Verification Required</span>
                <p className="text-xs mt-1">{kycReason}</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Contract Details */}
          <Card className="p-4 bg-secondary/50 border-border">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground">Contract Principal</p>
                  <p className="text-lg font-bold text-foreground">
                    {contract.donationAmount.toLocaleString()} KOLI
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Withdrawals</p>
                  <p className="text-sm font-semibold text-foreground">
                    {details.withdrawalsUsed + 1}/12
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Withdrawal Amount</span>
                  <span className="text-sm font-semibold text-foreground">30%</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xs text-muted-foreground">You will receive</span>
                  <span className="text-2xl font-bold text-green-400">
                    {withdrawalAmount.toLocaleString()} KOLI
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total Withdrawn</span>
                  <span className="font-medium text-blue-400">
                    {details.totalWithdrawn.toLocaleString()} KOLI
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">After This Withdrawal</span>
                  <span className="font-medium text-foreground">
                    {(details.totalWithdrawn + withdrawalAmount).toLocaleString()} KOLI
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Remaining Potential</span>
                  <span className="font-medium text-muted-foreground">
                    {(details.totalRemaining - withdrawalAmount).toLocaleString()} KOLI
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* P2P Information */}
          {isVerified && (
            <Alert className="bg-blue-500/10 border-blue-500/30 text-blue-400">
              <IconClock className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <span className="font-semibold">P2P Transaction</span>
                <p className="mt-1">
                  Your request will be processed manually by the admin within 24 hours. 
                  Funds will be sent to your registered E-wallet/Bank account.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* PIN Input */}
          {isVerified && (
            <div className="space-y-2">
              <Label htmlFor="pin" className="flex items-center gap-2 text-sm font-semibold">
                <IconShield size={16} className="text-primary" />
                Enter Your 6-Digit Funding PIN
              </Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={handlePinChange}
                placeholder="••••••"
                className="text-center text-2xl tracking-widest font-mono"
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground">
                Your PIN is required for all withdrawal transactions
              </p>
            </div>
          )}

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Alert variant="destructive">
                  <IconAlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleWithdraw}
            disabled={!isVerified || pin.length !== 6 || isProcessing}
            className="w-full sm:w-auto"
          >
            {isProcessing ? (
              <>
                <IconLock size={16} className="mr-2 animate-pulse" />
                Processing...
              </>
            ) : (
              <>
                <IconCircleCheck size={16} className="mr-2" />
                Confirm Withdrawal
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
