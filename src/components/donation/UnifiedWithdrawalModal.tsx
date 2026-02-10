import React, { useState, useMemo, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  IconAlertCircle,
  IconCircleCheck,
  IconLock,
  IconWallet,
  IconClock,
  IconShield,
  IconCoins,
  IconArrowRight,
} from "@tabler/icons-react";
import {
  DonationContract,
  calculateTotalWithdrawable,
  processPooledWithdrawal,
} from "@/lib/donationContract";
import { canUserWithdraw, isUserFullyVerified } from "@/lib/kycService";
import { validatePinFormat } from "@/lib/pinSecurity";
import { toast } from "sonner";

interface UnifiedWithdrawalModalProps {
  open: boolean;
  onClose: () => void;
  contracts: DonationContract[];
  userData: any;
  userId: string;
  onWithdrawSuccess: () => void;
}

export const UnifiedWithdrawalModal: React.FC<UnifiedWithdrawalModalProps> = ({
  open,
  onClose,
  contracts,
  userData,
  userId,
  onWithdrawSuccess,
}) => {
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [pin, setPin] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [processedPayouts, setProcessedPayouts] = useState<string[]>([]);
  const [withdrawalFee, setWithdrawalFee] = useState(0);
  const [netAmount, setNetAmount] = useState(0);
  
  // Track which contracts and MANA are selected for withdrawal
  const [selectedContractIds, setSelectedContractIds] = useState<Set<string>>(new Set());
  const [selectedMana, setSelectedMana] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Calculate total withdrawable (includes MANA balance)
  const userBalance = userData?.balance || 0;
  const { 
    totalAmount, 
    contractWithdrawals,
    manaBalance,
    eligibleContracts 
  } = calculateTotalWithdrawable(contracts, userBalance);

  // Calculate available from selected sources
  const selectedAvailable = useMemo(() => {
    let total = 0;
    eligibleContracts.forEach(({ contract, availableAmount }) => {
      if (selectedContractIds.has(contract.id)) {
        total += availableAmount;
      }
    });
    if (selectedMana && manaBalance > 0) {
      total += manaBalance;
    }
    return total;
  }, [eligibleContracts, selectedContractIds, selectedMana, manaBalance]);

  // Reset state when modal opens/closes - only run once when opening
  React.useEffect(() => {
    if (open && !initialized) {
      setWithdrawalAmount("");
      setPin("");
      setError(null);
      setIsProcessing(false);
      setShowSuccess(false);
      setProcessedPayouts([]);
      // Select all contracts and MANA by default
      setSelectedContractIds(new Set(eligibleContracts.map(c => c.contract.id)));
      setSelectedMana(manaBalance > 0);
      setInitialized(true);
    } else if (!open) {
      setInitialized(false);
    }
  }, [open, initialized, eligibleContracts, manaBalance]);

  // Check KYC status
  const { canWithdraw: kycAllowed, reason: kycReason } = canUserWithdraw(userData);
  const isVerified = isUserFullyVerified(userData);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d.]/g, "");
    // Allow only valid decimal numbers
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setWithdrawalAmount(value);
      // Calculate 10% fee and net amount
      const gross = parseFloat(value) || 0;
      const fee = gross * 0.10;
      const net = gross - fee;
      setWithdrawalFee(fee);
      setNetAmount(net);
      setError(null);
    }
  }, []);

  const handlePinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPin(value);
    setError(null);
  }, []);

  const setQuickAmount = useCallback((amount: number) => {
    setWithdrawalAmount(amount.toFixed(2));
    // Calculate 10% fee and net amount
    const fee = amount * 0.10;
    const net = amount - fee;
    setWithdrawalFee(fee);
    setNetAmount(net);
    setError(null);
  }, []);

  const toggleContractSelection = useCallback((contractId: string) => {
    setSelectedContractIds(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(contractId)) {
        newSelection.delete(contractId);
      } else {
        newSelection.add(contractId);
      }
      return newSelection;
    });
    setError(null);
  }, []);

  const toggleManaSelection = useCallback(() => {
    setSelectedMana(prev => !prev);
    setError(null);
  }, []);

  const handleWithdraw = async () => {
    try {
      setError(null);
      setIsProcessing(true);

      // Validate amount
      const amount = parseFloat(withdrawalAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid withdrawal amount");
      }

      // Check if at least one source is selected
      if (selectedContractIds.size === 0 && !selectedMana) {
        throw new Error("Please select at least one contract or MANA rewards to withdraw from");
      }

      // Validate gross amount against selected available balance
      if (amount > selectedAvailable) {
        const shortfall = amount - selectedAvailable;
        throw new Error(
          `Insufficient funds in selected sources. You need ₱${shortfall.toFixed(2)} more. Either reduce your withdrawal amount or select additional contracts.`
        );
      }

      if (amount > totalAmount) {
        throw new Error(
          `Amount exceeds total available balance of ₱${totalAmount.toFixed(2)}`
        );
      }

      // Calculate 10% platform fee
      const platformFee = amount * 0.10;
      const netWithdrawal = amount - platformFee;

      // Validate PIN format
      const pinValidation = validatePinFormat(pin);
      if (!pinValidation.valid) {
        throw new Error(pinValidation.error || "Invalid PIN format");
      }

      // Filter contracts to only include selected ones, sorted by creation date (oldest first)
      const selectedContracts = contracts
        .filter(c => selectedContractIds.has(c.id))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      // Process pooled withdrawal with net amount (after 10% fee deduction)
      const result = await processPooledWithdrawal(
        userId,
        pin,
        netWithdrawal, // Pass net amount after fee
        selectedContracts,
        selectedMana ? manaBalance : 0, // Pass MANA balance if selected
        platformFee, // Pass platform fee for tracking
        amount // Pass gross amount for tracking
      );

      setProcessedPayouts(result.payoutIds);
      setShowSuccess(true);

      // Show success toast with fee breakdown
      toast.success("Withdrawal Submitted!", {
        description: `₱${netWithdrawal.toFixed(2)} net amount (₱${amount.toFixed(2)} - ₱${platformFee.toFixed(2)} fee) will be processed.`,
      });

      // Call success callback after a delay
      setTimeout(() => {
        onWithdrawSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Withdrawal error:", err);
      setError(err.message || "Failed to process withdrawal");
      toast.error("Withdrawal Failed", {
        description: err.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  if (!kycAllowed) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconAlertCircle className="w-5 h-5 text-yellow-500" />
              KYC Verification Required
            </DialogTitle>
            <DialogDescription>
              Complete your KYC verification to enable withdrawals
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <IconShield className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              {kycReason}
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>To enable withdrawals, you need to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Complete identity verification (Tier 1)</li>
              <li>Submit proof of address (Tier 2)</li>
              <li>Wait for admin approval</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (eligibleContracts.length === 0) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconClock className="w-5 h-5 text-blue-500" />
              No Withdrawals Available
            </DialogTitle>
            <DialogDescription>
              {manaBalance > 0 
                ? "You have MANA rewards but need at least one eligible contract to withdraw"
                : "You don't have any contracts ready for withdrawal yet"}
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <IconClock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              {manaBalance > 0 
                ? `You have ₱${manaBalance.toFixed(2)} in MANA rewards, but you need at least one eligible contract to process a withdrawal. Withdrawals become available 30 days after contract approval.`
                : "Withdrawals become available 30 days after contract approval, then every 30 days thereafter."}
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {!showSuccess ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <IconWallet className="w-5 h-5 text-primary" />
                  Withdraw Funds
                </DialogTitle>
                <DialogDescription>
                  {eligibleContracts.length > 0 && manaBalance > 0
                    ? `Withdraw from ${eligibleContracts.length} contract${eligibleContracts.length > 1 ? "s" : ""} and MANA rewards`
                    : eligibleContracts.length > 0
                    ? `Choose your withdrawal amount from ${eligibleContracts.length} contract${eligibleContracts.length > 1 ? "s" : ""}`
                    : "Withdraw your MANA rewards"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Total Available Balance */}
                <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Available Balance
                      </p>
                      <p className="text-3xl font-bold text-primary">
                        ₱{totalAmount.toFixed(2)}
                      </p>
                      {selectedAvailable < totalAmount && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Selected: ₱{selectedAvailable.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <IconCoins className="w-12 h-12 text-primary/40" />
                  </div>
                </Card>

                {/* Source Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Select Withdrawal Sources
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Choose which contracts and/or MANA rewards to withdraw from
                  </p>
                  <div className="space-y-2 mt-3">
                    {eligibleContracts.map(({ contract, availableAmount }) => {
                      const singlePeriodAmount = contract.donationAmount * 0.3;
                      const periodsAvailable = Math.round(availableAmount / singlePeriodAmount);
                      
                      return (
                        <div
                          key={contract.id}
                          onClick={() => toggleContractSelection(contract.id)}
                          className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer hover:border-primary/50 ${
                            selectedContractIds.has(contract.id)
                              ? "border-primary bg-primary/5 dark:bg-primary/10"
                              : "border-border bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={selectedContractIds.has(contract.id)}
                              onCheckedChange={() => toggleContractSelection(contract.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  Contract #{contract.id.slice(-6)}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  ₱{contract.donationAmount.toFixed(0)}
                                </Badge>
                                {periodsAvailable > 1 && (
                                  <Badge variant="default" className="text-xs bg-green-600">
                                    {periodsAvailable}x stacked
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {periodsAvailable > 1 
                                  ? `${periodsAvailable} periods available` 
                                  : "Principal amount"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <IconArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span className="font-bold text-primary">
                              ₱{availableAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {manaBalance > 0 && (
                      <div
                        onClick={() => toggleManaSelection()}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer hover:border-yellow-500/50 ${
                          selectedMana
                            ? "border-yellow-500 bg-yellow-500/5 dark:bg-yellow-500/10"
                            : "border-border bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            checked={selectedMana}
                            onCheckedChange={() => toggleManaSelection()}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <IconCoins className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm font-medium">
                                MANA Rewards
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Claimed rewards balance
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-yellow-600">
                          ₱{manaBalance.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                  {selectedAvailable === 0 && (
                    <Alert variant="destructive" className="mt-2">
                      <IconAlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Please select at least one source to withdraw from
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <Separator />

                {/* Withdrawal Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Withdrawal Amount (Gross)</Label>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="Enter amount"
                    value={withdrawalAmount}
                    onChange={handleAmountChange}
                    disabled={isProcessing || selectedAvailable === 0}
                    className="text-lg"
                    autoComplete="off"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickAmount(selectedAvailable * 0.25)}
                      disabled={isProcessing || selectedAvailable === 0}
                    >
                      25%
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickAmount(selectedAvailable * 0.5)}
                      disabled={isProcessing || selectedAvailable === 0}
                    >
                      50%
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickAmount(selectedAvailable * 0.75)}
                      disabled={isProcessing || selectedAvailable === 0}
                    >
                      75%
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickAmount(selectedAvailable)}
                      disabled={isProcessing || selectedAvailable === 0}
                    >
                      Max
                    </Button>
                  </div>
                  {selectedAvailable > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Available from selected sources: ₱{selectedAvailable.toFixed(2)}
                    </p>
                  )}
                  {/* Fee Breakdown */}
                  {withdrawalAmount && parseFloat(withdrawalAmount) > 0 && (
                    <Card className="p-3 bg-muted/50 border-yellow-200 dark:border-yellow-800">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gross Amount:</span>
                          <span className="font-medium">₱{parseFloat(withdrawalAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-yellow-700 dark:text-yellow-400">
                          <span>Platform Fee (10%):</span>
                          <span className="font-medium">- ₱{withdrawalFee.toFixed(2)}</span>
                        </div>
                        <Separator className="my-1" />
                        <div className="flex justify-between font-bold text-primary">
                          <span>You'll Receive:</span>
                          <span>₱{netAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>

                {/* PIN Input */}
                <div className="space-y-2">
                  <Label htmlFor="pin" className="flex items-center gap-2">
                    <IconLock className="w-4 h-4" />
                    6-Digit Funding PIN
                  </Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    placeholder="Enter your PIN"
                    value={pin}
                    onChange={handlePinChange}
                    maxLength={6}
                    disabled={isProcessing}
                    className="text-lg tracking-widest"
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <Alert variant="destructive">
                    <IconAlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Info Box */}
                <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                  <IconShield className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs">
                    <strong>P2P Withdrawal Process:</strong> Your request will be
                    manually processed by our team within 24-48 hours. Funds will
                    be distributed from your selected sources only.
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleWithdraw}
                  disabled={
                    isProcessing ||
                    !withdrawalAmount ||
                    parseFloat(withdrawalAmount) <= 0 ||
                    pin.length !== 6
                  }
                  className="bg-primary hover:bg-primary/90"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <IconLock className="w-4 h-4" />
                      </motion.div>
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <IconWallet className="w-4 h-4" />
                      Withdraw ₱{withdrawalAmount || "0.00"}
                    </div>
                  )}
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                  }}
                >
                  <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    <IconCircleCheck className="w-12 h-12 text-primary" />
                  </div>
                </motion.div>

                <div>
                  <h3 className="text-2xl font-bold text-primary">
                    Withdrawal Submitted!
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    Your withdrawal request has been queued for processing
                  </p>
                </div>

                <Card className="p-4 w-full bg-muted/50">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gross Amount:</span>
                      <span className="font-medium">
                        ₱{parseFloat(withdrawalAmount).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-yellow-700 dark:text-yellow-400">
                      <span className="text-muted-foreground">Platform Fee (10%):</span>
                      <span className="font-medium">
                        - ₱{withdrawalFee.toFixed(2)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Net Amount:</span>
                      <span className="font-bold text-primary">
                        ₱{netAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contracts:</span>
                      <span className="font-medium">
                        {processedPayouts.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                  </div>
                </Card>

                <p className="text-xs text-muted-foreground">
                  Processing time: 24-48 hours
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
