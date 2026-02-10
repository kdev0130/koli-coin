import React, { useState, useEffect } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  IconGift,
  IconAlertCircle,
  IconSparkles,
  IconTrophy,
  IconLock,
} from "@tabler/icons-react";
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface ManaRewardModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

interface GlobalReward {
  activeCode: string;
  totalPool: number;
  remainingPool: number;
  expiresAt: string;
}

export const ManaRewardModal: React.FC<ManaRewardModalProps> = ({
  open,
  onClose,
  userId,
  userName,
}) => {
  const [secretCode, setSecretCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rewardData, setRewardData] = useState<GlobalReward | null>(null);
  const [rewardAmount, setRewardAmount] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasAlreadyClaimed, setHasAlreadyClaimed] = useState(false);
  const [isCheckingClaim, setIsCheckingClaim] = useState(false);

  // Listen to global reward pool in real-time
  useEffect(() => {
    if (!open) return;

    const rewardRef = doc(db, "globalRewards", "currentActiveReward");
    const unsubscribe = onSnapshot(
      rewardRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setRewardData(docSnapshot.data() as GlobalReward);
        } else {
          setRewardData(null);
        }
      },
      (err) => {
        console.error("Error fetching reward data:", err);
      }
    );

    return () => unsubscribe();
  }, [open]);

  // Check if user already claimed the current code
  useEffect(() => {
    if (!open || !rewardData?.activeCode || !userId) return;

    const checkIfAlreadyClaimed = async () => {
      setIsCheckingClaim(true);
      try {
        const claimsRef = collection(db, "rewardClaims");
        const q = query(
          claimsRef,
          where("userId", "==", userId),
          where("secretCode", "==", rewardData.activeCode)
        );
        const snapshot = await getDocs(q);
        setHasAlreadyClaimed(!snapshot.empty);
      } catch (error) {
        console.error("Error checking claim status:", error);
        setHasAlreadyClaimed(false);
      } finally {
        setIsCheckingClaim(false);
      }
    };

    checkIfAlreadyClaimed();
  }, [open, rewardData?.activeCode, userId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSecretCode("");
      setError(null);
      setRewardAmount(null);
      setShowSuccess(false);
      setHasAlreadyClaimed(false);
    }
  }, [open]);

  const handleClaim = async () => {
    try {
      setError(null);
      setIsProcessing(true);

      if (!secretCode.trim()) {
        setError("Please enter the secret code");
        setIsProcessing(false);
        return;
      }

      if (!rewardData) {
        setError("Reward pool not available");
        setIsProcessing(false);
        return;
      }

      if (rewardData.remainingPool <= 0) {
        setError("The reward pool has been depleted. Try again next time!");
        setIsProcessing(false);
        return;
      }

      // Call Cloud Function
      const response = await fetch(
        "https://us-central1-koli-2bad9.cloudfunctions.net/claimManaReward",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            userName,
            secretCode: secretCode.trim().toUpperCase(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to claim reward");
      }

      // Success!
      setRewardAmount(result.amount);
      setShowSuccess(true);
      
      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#FFD700", "#FFA500", "#FF6347"],
      });

      toast.success("MANA Reward Claimed!", {
        description: `You won ₱${result.amount.toFixed(2)}!`,
      });

      // Close modal after delay
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err: any) {
      console.error("Claim error:", err);
      setError(err.message || "Failed to claim reward. Please try again.");
      toast.error("Claim Failed", {
        description: err.message || "Please try again",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const poolPercentage = rewardData
    ? (rewardData.remainingPool / rewardData.totalPool) * 100
    : 0;

  const isExpired = rewardData && rewardData.expiresAt
    ? new Date(rewardData.expiresAt) < new Date()
    : false;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <AnimatePresence mode="wait">
          {!showSuccess ? (
            <motion.div
              key="claim"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <IconGift size={24} className="text-yellow-500" />
                  Enter Secret MANA Code
                </DialogTitle>
                <DialogDescription>
                  Check our official Telegram channel for the random code! Be
                  fast—once the pool is empty, the reward expires.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Pool Depleted Warning */}
                {rewardData && rewardData.remainingPool <= 0 && (
                  <Alert className="bg-orange-500/10 border-orange-500/30 text-orange-400">
                    <IconLock className="h-4 w-4" />
                    <AlertDescription>
                      The reward pool is empty! Stay tuned for the next reward
                      event.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Secret Code Input */}
                <div className="space-y-2">
                  <Label htmlFor="secretCode" className="flex items-center gap-2">
                    <IconSparkles size={16} className="text-yellow-500" />
                    Secret Code
                  </Label>
                  <Input
                    id="secretCode"
                    type="text"
                    placeholder="Enter code here..."
                    value={secretCode}
                    onChange={(e) => {
                      setSecretCode(e.target.value.toUpperCase());
                      setError(null);
                    }}
                    disabled={isProcessing || (rewardData && rewardData.remainingPool <= 0)}
                    className="text-center text-lg font-mono tracking-wider"
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground">
                    Codes are case-insensitive and distributed via Telegram
                  </p>
                </div>

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

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleClaim}
                  disabled={
                    isProcessing ||
                    isCheckingClaim ||
                    !secretCode.trim() ||
                    !rewardData ||
                    rewardData.remainingPool <= 0 ||
                    isExpired ||
                    hasAlreadyClaimed
                  }
                  className="bg-gradient-to-r from-yellow-500 to-orange-500"
                >
                  {isCheckingClaim ? (
                    "Checking..."
                  ) : hasAlreadyClaimed ? (
                    "Already Claimed"
                  ) : isExpired ? (
                    "Code Expired"
                  ) : isProcessing ? (
                    <>
                      <IconSparkles size={16} className="mr-2 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <IconGift size={16} className="mr-2" />
                      Claim Reward
                    </>
                  )}
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6 }}
                className="mb-4"
              >
                <IconTrophy size={80} className="text-yellow-500 mx-auto" />
              </motion.div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Congratulations!
              </h3>
              <p className="text-4xl font-bold text-yellow-500 mb-4">
                ₱{rewardAmount?.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                MANA Reward has been added to your account!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
