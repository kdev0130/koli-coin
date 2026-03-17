import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IconX, IconWallet, IconUpload, IconCalendar, IconCoins, IconCopy, IconCheck } from "@tabler/icons-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import {
  DonationContract,
  DonationContractType,
  calculateCompoundedContractValue,
  donate,
  donateFromWithdrawablePool,
} from "@/lib/donationContract";

interface AddDonationModalProps {
  open: boolean;
  onClose: () => void;
  contracts: DonationContract[];
  userBalance: number;
  withdrawablePoolAmount: number;
}

type DonationAccount = {
  accountNumber: string;
  accountName: string;
};

const donationAccounts: Record<string, DonationAccount[]> = {
  BPI: [
    {
      accountNumber: "007303008572",
      accountName: "JBT PRINTING SHOP",
    },
  ],
  BDO: [
    {
      accountNumber: "040300123868",
      accountName: "JENNY C TANGARO",
    },
    {
      accountNumber: "040300126778",
      accountName: "JBT PRINTING SHOP",
    },
  ],
  GoTyme: [
    {
      accountNumber: "015570262869",
      accountName: "JENNY TANGARO",
    },
  ],
};

type ContractOption = {
  value: DonationContractType;
  title: string;
  description: string;
  lockInMonths: number;
  compoundLockIn: boolean;
};

const contractOptions: ContractOption[] = [
  {
    value: "monthly_12_no_principal",
    title: "30% Monthly for 1 Year",
    description: "Withdraw every 30 days; principal remains unchanged.",
    lockInMonths: 12,
    compoundLockIn: false,
  },
  {
    value: "lockin_6_compound",
    title: "6-Month Lock-In (Compounded)",
    description: "No withdrawals for 6 months; returns are compounded monthly.",
    lockInMonths: 6,
    compoundLockIn: true,
  },
  {
    value: "lockin_12_compound",
    title: "12-Month Lock-In (Compounded)",
    description: "No withdrawals for 12 months; returns are compounded monthly.",
    lockInMonths: 12,
    compoundLockIn: true,
  },
];

export const AddDonationModal: React.FC<AddDonationModalProps> = ({
  open,
  onClose,
  contracts,
  userBalance,
  withdrawablePoolAmount,
}) => {
  const { user } = useAuth();
  const eWalletOptions = ["GoTyme"];
  const bankOptions = ["BPI", "BDO", "GoTyme"];
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [contractType, setContractType] = useState<DonationContractType>("monthly_12_no_principal");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentService, setPaymentService] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState("");

  const selectedAccounts = donationAccounts[paymentService] || [];
  const availableServices =
    paymentMethod === "gcash"
      ? eWalletOptions
      : paymentMethod === "bank"
        ? bankOptions
        : paymentMethod === "kash"
          ? ["Kash"]
          : [];
  const isPoolRedonation = paymentMethod === "redonate_pool";
  const isKashMethod = paymentMethod === "kash";
  const requiresPaymentService = paymentMethod === "gcash" || paymentMethod === "bank";
  const requiresReceiptUpload = !isPoolRedonation;
  const selectedContractOption =
    contractOptions.find((option) => option.value === contractType) || contractOptions[0];

  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // Calculate first unlock date
  const calculateFirstUnlockDate = () => {
    const date = new Date();
    if (selectedContractOption.compoundLockIn) {
      date.setMonth(date.getMonth() + selectedContractOption.lockInMonths);
      return formatDate(date);
    }
    date.setDate(date.getDate() + 30);
    return formatDate(date);
  };

  // Calculate contract end date
  const calculateContractEndDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + selectedContractOption.lockInMonths);
    return formatDate(date);
  };

  // Calculate 30% payout per withdrawal period
  const getWithdrawableAmount = () => {
    const numAmount = parseFloat(amount) || 0;
    return (numAmount * 0.3).toLocaleString();
  };

  // Calculate total withdrawable estimate based on selected contract option
  const getTotalWithdrawable = () => {
    const numAmount = parseFloat(amount) || 0;
    if (selectedContractOption.compoundLockIn) {
      return calculateCompoundedContractValue(
        numAmount,
        selectedContractOption.lockInMonths,
        0.3
      ).toLocaleString();
    }

    return (numAmount * 0.3 * 12).toLocaleString();
  };

  const getCompoundProjection = () => {
    const numAmount = parseFloat(amount) || 0;
    if (!selectedContractOption.compoundLockIn || numAmount <= 0) {
      return [] as Array<{ month: number; principalStart: number; interest: number; principalEnd: number }>;
    }

    const rows: Array<{ month: number; principalStart: number; interest: number; principalEnd: number }> = [];
    let runningPrincipal = numAmount;

    for (let month = 1; month <= selectedContractOption.lockInMonths; month += 1) {
      const principalStart = runningPrincipal;
      const interest = principalStart * 0.3;
      const principalEnd = principalStart + interest;

      rows.push({
        month,
        principalStart,
        interest,
        principalEnd,
      });

      runningPrincipal = principalEnd;
    }

    return rows;
  };

  const handleCopyAccountNumber = async (accountNumber: string) => {
    
    try {
      // Method 1: Modern Clipboard API (works on HTTPS and localhost)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(accountNumber);
        setCopiedAccount(accountNumber);
        toast.success(`Copied: ${accountNumber}`);
        setTimeout(() => setCopiedAccount(""), 2000);
        return;
      }
    } catch (err) {
      console.log('Clipboard API failed, trying fallback');
    }
    
    // Method 2: execCommand fallback
    try {
      const textarea = document.createElement('textarea');
      textarea.value = accountNumber;
      
      // Make it invisible but accessible
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '1px';
      textarea.style.height = '1px';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (successful) {
        setCopiedAccount(accountNumber);
        toast.success(`Copied: ${accountNumber}`);
        setTimeout(() => setCopiedAccount(""), 2000);
      } else {
        throw new Error('execCommand failed');
      }
    } catch (err) {
      console.error('All copy methods failed:', err);
      toast.error(`Copy failed. Number: ${accountNumber}`, {
        duration: 5000,
      });
    }
  };

  const handleNext = () => {
    const parsedAmount = parseFloat(amount);

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (isPoolRedonation && parsedAmount > withdrawablePoolAmount) {
      toast.error(`Amount exceeds your withdrawable pool (${withdrawablePoolAmount.toLocaleString()} KOLI)`);
      return;
    }

    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (requiresPaymentService && !paymentService) {
      toast.error("Please select a payment option");
      return;
    }

    if (requiresPaymentService && (!availableServices.includes(paymentService) || selectedAccounts.length === 0)) {
      toast.error("Selected payment option is not supported yet");
      return;
    }

    setStep(2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceipt(e.target.files[0]);
    }
  };

  const handleSubmitDonation = async () => {
    if (requiresReceiptUpload && !receipt) {
      toast.error("Please upload payment receipt");
      return;
    }

    if (!user?.uid) {
      toast.error("Please sign in again and retry.");
      return;
    }

    setLoading(true);
    try {
      if (isPoolRedonation) {
        await donateFromWithdrawablePool(
          user.uid,
          parseFloat(amount),
          contractType,
          contracts,
          userBalance
        );

        toast.success("Re-donation submitted from withdrawable pool!", {
          description: "Your new contract is now active.",
        });

        setAmount("");
        setContractType("monthly_12_no_principal");
        setPaymentMethod("");
        setPaymentService("");
        setReceipt(null);
        setStep(1);
        onClose();
        return;
      }

      // Upload via Firebase SDK (more reliable on Android than raw fetch + auth headers)
      const timestamp = Date.now();
      const safeName = receipt.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = `receipts/${user.uid}/${timestamp}_${safeName}`;
      const storageRef = ref(storage, fileName);

      await withTimeout(
        uploadBytes(storageRef, receipt, {
          contentType: receipt.type || "application/octet-stream",
        }),
        120000,
        "Upload timed out. Please try again on a stable connection."
      );

      const receiptURL = await getDownloadURL(storageRef);

      const paymentDetails = paymentService ? `${paymentMethod}:${paymentService}` : paymentMethod;

      // Create donation contract using the new contract system
      await donate(
        user.uid,
        parseFloat(amount),
        paymentDetails,
        contractType,
        receiptURL,
        fileName
      );

      toast.success("Donation contract submitted!", {
        description: "Awaiting admin approval. Contract will activate once approved.",
      });

      // Reset form
      setAmount("");
      setContractType("monthly_12_no_principal");
      setPaymentMethod("");
      setPaymentService("");
      setReceipt(null);
      setStep(1);
      onClose();
    } catch (error: any) {
      console.error("Error submitting donation:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        serverResponse: error.serverResponse,
        customData: error.customData,
        stack: error.stack
      });
      
      let errorMessage = "Failed to submit donation. Please try again.";
      
      if (error.code === "storage/unknown") {
        errorMessage = "Storage upload failed. Please check your Firebase Storage configuration and make sure the bucket exists.";
      } else if (error.code === "storage/unauthorized") {
        errorMessage = "You don't have permission to upload files. Please check storage rules.";
      } else if (error.code === "storage/canceled") {
        errorMessage = "Upload was canceled. Please try again.";
      } else if (error.code === "storage/quota-exceeded") {
        errorMessage = "Storage quota exceeded. Please contact support.";
      } else if (error.code === "storage/retry-limit-exceeded" || error.code === "storage/network-request-failed") {
        errorMessage = "Network issue while uploading receipt. Please retry with a stronger connection.";
      } else if (typeof error.message === "string" && error.message.toLowerCase().includes("timed out")) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setAmount("");
    setContractType("monthly_12_no_principal");
    setPaymentMethod("");
    setPaymentService("");
    setReceipt(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
            <IconCoins className="text-primary" size={28} />
            {step === 1 ? "Add New Donation" : "Payment Details"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {step === 1 ? (
            /* STEP 1: AMOUNT & METHOD */
            <div className="space-y-6">
              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium">
                  Donation Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ₱
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter Donation Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 text-lg font-semibold"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Contract Option</Label>
                <Select value={contractType} onValueChange={(value) => setContractType(value as DonationContractType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select contract option" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{selectedContractOption.description}</p>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) => {
                    setPaymentMethod(value);
                    if (value === "kash") {
                      setPaymentService("Kash");
                    } else if (value === "redonate_pool") {
                      setPaymentService("Withdrawable Pool");
                    } else {
                      setPaymentService("");
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gcash">E-Wallet</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="kash">Kash</SelectItem>
                    <SelectItem value="redonate_pool">Re-Donate from Withdrawable Pool</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isPoolRedonation && (
                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                  <p className="text-xs text-muted-foreground">Withdrawable Pool Available</p>
                  <p className="text-lg font-semibold text-primary">
                    {withdrawablePoolAmount.toLocaleString()} KOLI
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Re-donation uses your currently withdrawable contracts + MANA rewards.
                  </p>
                </div>
              )}

              {/* Payment Option */}
              {paymentMethod && requiresPaymentService && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {paymentMethod === "gcash" ? "E-Wallet Service" : "Bank"}
                  </Label>
                  <Select value={paymentService} onValueChange={setPaymentService}>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          paymentMethod === "gcash"
                            ? "Select e-wallet service"
                            : "Select bank"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableServices.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Real-time Math Improvement */}
              <AnimatePresence>
                {amount && parseFloat(amount) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-secondary rounded-lg space-y-3 border border-border"
                  >
                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                      CONTRACT PREVIEW
                    </div>
                    
                    {/* Principal Amount */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Initial Principal:</span>
                      <span className="font-bold text-foreground">
                        {parseFloat(amount).toLocaleString()} KOLI
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Selected Plan:</span>
                      <span className="font-semibold text-foreground text-right">
                        {selectedContractOption.title}
                      </span>
                    </div>

                    {/* First Withdrawal Date */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <IconCalendar size={14} />
                        <span>{selectedContractOption.compoundLockIn ? "Unlock Date:" : "First Withdrawal:"}</span>
                      </div>
                      <span className="font-semibold text-foreground">
                        {calculateFirstUnlockDate()}
                      </span>
                    </div>

                    {!selectedContractOption.compoundLockIn ? (
                      <>
                        {/* Per-Period Withdrawal */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <IconWallet size={14} />
                            <span>Per Withdrawal (30%):</span>
                          </div>
                          <span className="font-bold text-green-500">
                            {getWithdrawableAmount()} KOLI
                          </span>
                        </div>

                        {/* Total Withdrawals */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Total Withdrawals:</span>
                          <span className="font-semibold text-foreground">12 (Once per 30 days)</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Lock-In:</span>
                          <span className="font-semibold text-foreground">
                            {selectedContractOption.lockInMonths} months (no withdrawals)
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Compounding:</span>
                          <span className="font-semibold text-green-500">
                            30% monthly (principal grows)
                          </span>
                        </div>
                      </>
                    )}

                    {/* Max Total Withdrawal */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                      <span className="text-muted-foreground">
                        {selectedContractOption.compoundLockIn ? "Est. Unlock Amount:" : "Max Total Withdrawal:"}
                      </span>
                      <span className="font-bold text-primary">
                        {getTotalWithdrawable()} KOLI
                      </span>
                    </div>

                    {/* Contract End Date */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Contract Ends:</span>
                      <span className="font-semibold text-foreground">
                        {calculateContractEndDate()}
                      </span>
                    </div>

                    {selectedContractOption.compoundLockIn && (
                      <div className="pt-2 border-t border-border space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">
                          LOCK-IN BREAKDOWN (ESTIMATED)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          No withdrawals during lock period. At maturity, you can withdraw the full compounded balance.
                        </p>
                        <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-background/50">
                          {getCompoundProjection().map((row) => (
                            <div
                              key={row.month}
                              className="grid grid-cols-4 gap-2 px-3 py-2 text-[11px] border-b border-border last:border-b-0"
                            >
                              <span className="text-muted-foreground">M{row.month}</span>
                              <span className="text-muted-foreground">{row.principalStart.toLocaleString()}</span>
                              <span className="text-green-500">+{row.interest.toLocaleString()}</span>
                              <span className="font-semibold text-foreground">{row.principalEnd.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <Button 
                onClick={handleNext} 
                className="w-full" 
                size="lg"
                disabled={!amount || !paymentMethod || (requiresPaymentService && !paymentService)}
              >
                Continue to Payment
              </Button>
            </div>
          ) : (
            /* STEP 2: PAYMENT DETAILS & UPLOAD */
            <div className="space-y-6">
              {/* Payment Instructions */}
              {!isPoolRedonation ? (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg space-y-3">
                  <p className="text-sm font-bold text-foreground">
                    {isKashMethod
                      ? `Pay ${parseFloat(amount).toLocaleString()} KOLI using Kash and upload proof below.`
                      : `Send ${parseFloat(amount).toLocaleString()} KOLI to ${paymentService}:`}
                  </p>
                  {!isKashMethod && selectedAccounts.length > 0 ? (
                    <div className="space-y-3">
                      {selectedAccounts.map((account) => (
                        <div key={`${paymentService}-${account.accountNumber}`} className="space-y-2 rounded-md border border-primary/20 bg-background/50 p-3">
                          <div className="flex justify-between items-center gap-3">
                            <code className="text-base font-mono font-bold text-primary flex-1 break-all">
                              {account.accountNumber}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyAccountNumber(account.accountNumber)}
                              className="gap-2 shrink-0"
                            >
                              {copiedAccount === account.accountNumber ? (
                                <>
                                  <IconCheck size={16} />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <IconCopy size={16} />
                                  Copy
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Account Name: <span className="font-semibold text-foreground">{account.accountName}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg space-y-2">
                  <p className="text-sm font-bold text-foreground">
                    Re-Donate from Withdrawable Pool
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Pool available: {withdrawablePoolAmount.toLocaleString()} KOLI</p>
                    <p>Amount to re-donate: {parseFloat(amount).toLocaleString()} KOLI</p>
                    <p>
                      Estimated pool after re-donation: {Math.max(0, withdrawablePoolAmount - (parseFloat(amount) || 0)).toLocaleString()} KOLI
                    </p>
                  </div>
                </div>
              )}

              {/* Receipt Upload */}
              {requiresReceiptUpload && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Upload Screenshot of Receipt</Label>
                  <div className="relative">
                    <input
                      type="file"
                      id="receipt"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="receipt"
                      className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer bg-muted/20"
                    >
                      <IconUpload size={20} className="text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {receipt ? receipt.name : "Click to upload payment screenshot"}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSubmitDonation}
                className="w-full"
                size="lg"
                disabled={loading || (requiresReceiptUpload && !receipt)}
              >
                {loading
                  ? "Submitting..."
                  : isPoolRedonation
                    ? "Confirm Re-Donation"
                    : "Confirm Payment & Submit"}
              </Button>

              {/* Back Button */}
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="w-full"
                disabled={loading}
              >
                Back
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
