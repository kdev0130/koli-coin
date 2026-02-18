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
import { donate } from "@/lib/donationContract";

interface AddDonationModalProps {
  open: boolean;
  onClose: () => void;
}

export const AddDonationModal: React.FC<AddDonationModalProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const eWalletOptions = ["GCash", "Maya", "GrabPay", "ShopeePay"];
  const bankOptions = ["BPI", "BDO", "UnionBank", "Metrobank", "LandBank"];
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentService, setPaymentService] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // Calculate maturity date (30 days from now)
  const calculate30DaysFromNow = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  // Calculate contract end date (1 year from now)
  const calculateContractEndDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  // Calculate 30% payout per withdrawal period
  const getWithdrawableAmount = () => {
    const numAmount = parseFloat(amount) || 0;
    return (numAmount * 0.3).toLocaleString();
  };

  // Calculate total withdrawable over 12 months
  const getTotalWithdrawable = () => {
    const numAmount = parseFloat(amount) || 0;
    return (numAmount * 0.3 * 12).toLocaleString();
  };

  const handleCopyAccountNumber = async () => {
    const accountNumber = "09123456789";
    
    try {
      // Method 1: Modern Clipboard API (works on HTTPS and localhost)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(accountNumber);
        setCopied(true);
        toast.success("Copied: 0912 345 6789");
        setTimeout(() => setCopied(false), 2000);
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
        setCopied(true);
        toast.success("Copied: 0912 345 6789");
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error('execCommand failed');
      }
    } catch (err) {
      console.error('All copy methods failed:', err);
      toast.error("Copy failed. Number: 0912 345 6789", {
        duration: 5000,
      });
    }
  };

  const handleNext = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }
    if (!paymentService) {
      toast.error("Please select a payment option");
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
    if (!receipt) {
      toast.error("Please upload payment receipt");
      return;
    }

    if (!user?.uid) {
      toast.error("Please sign in again and retry.");
      return;
    }

    setLoading(true);
    try {
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
        receiptURL,
        fileName
      );

      toast.success("Donation contract submitted!", {
        description: "Awaiting admin approval. Contract will activate once approved.",
      });

      // Reset form
      setAmount("");
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
                <Label className="text-sm font-medium">Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) => {
                    setPaymentMethod(value);
                    setPaymentService("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gcash">E-Wallet</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Option */}
              {paymentMethod && (
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
                      {(paymentMethod === "gcash" ? eWalletOptions : bankOptions).map((option) => (
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
                      <span className="text-muted-foreground">Principal (Never Reduces):</span>
                      <span className="font-bold text-foreground">
                        {parseFloat(amount).toLocaleString()} KOLI
                      </span>
                    </div>

                    {/* First Withdrawal Date */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <IconCalendar size={14} />
                        <span>First Withdrawal:</span>
                      </div>
                      <span className="font-semibold text-foreground">
                        {calculate30DaysFromNow()}
                      </span>
                    </div>

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

                    {/* Max Total Withdrawal */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                      <span className="text-muted-foreground">Max Total Withdrawal:</span>
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
                  </motion.div>
                )}
              </AnimatePresence>

              <Button 
                onClick={handleNext} 
                className="w-full" 
                size="lg"
                disabled={!amount || !paymentMethod || !paymentService}
              >
                Continue to Payment
              </Button>
            </div>
          ) : (
            /* STEP 2: PAYMENT DETAILS & UPLOAD */
            <div className="space-y-6">
              {/* Payment Instructions */}
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg space-y-3">
                <p className="text-sm font-bold text-foreground">
                  Send {parseFloat(amount).toLocaleString()} KOLI to:
                </p>
                <div className="flex justify-between items-center gap-3">
                  <code className="text-lg font-mono font-bold text-primary flex-1">
                    0912 345 6789
                  </code>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleCopyAccountNumber}
                    className="gap-2 shrink-0"
                  >
                    {copied ? (
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
                  Account Name: <span className="font-semibold text-foreground">KOLI COMMUNITY</span>
                </p>
              </div>

              {/* Receipt Upload */}
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

              {/* Submit Button */}
              <Button
                onClick={handleSubmitDonation}
                className="w-full"
                size="lg"
                disabled={loading || !receipt}
              >
                {loading ? "Submitting..." : "Confirm Payment & Submit"}
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
