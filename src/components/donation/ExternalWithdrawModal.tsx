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
import { IconExternalLink, IconWallet, IconLoader, IconLock } from "@tabler/icons-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { canUserWithdraw } from "@/lib/kycService";
import { validatePinFormat, verifyPin } from "@/lib/pinSecurity";
import odhexLogo from "@/assets/odhex-logo.png";
import binanceLogo from "@/assets/binance.png";
import coinbaseLogo from "@/assets/coinbase.png";
import cryptoLogo from "@/assets/crypto.png";
import okxLogo from "@/assets/okx.png";

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

  useEffect(() => {
    if (open) {
      setPin("");
      setPinError(null);
      setIsPinVerified(false);
      setChecking(false);
    }
  }, [open]);

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

  const handleODHexWithdrawal = () => {
    if (!user?.email) return;

    const kyc = canUserWithdraw(userData);
    if (!kyc.canWithdraw) {
      toast.error(kyc.reason || "KYC verification required before withdrawal.");
      return;
    }
    
    setChecking(true);
    
    // Determine ODHex base URL based on environment
    const currentUrl = new URL(window.location.href);
    let odhexBaseUrl: string;
    
    if (currentUrl.hostname === 'koli-2bad9.web.app') {
      // Production: Use ODHex production URL
      odhexBaseUrl = 'https://odhex.com';
    } else if (currentUrl.hostname === 'localhost') {
      // Development: Use localhost with port 8082
      odhexBaseUrl = `${currentUrl.protocol}//localhost:8082`;
    } else {
      // Mobile dev (IP address): Use same hostname with port 8082
      odhexBaseUrl = `${currentUrl.protocol}//${currentUrl.hostname}:8082`;
    }
    
    // Encode parameters
    const params = new URLSearchParams({
      email: user.email,
      amount: withdrawableAmount.toFixed(2),
      source: "koli-coin",
      timestamp: new Date().toISOString(),
    });
    
    // Route to ODHex authentication first (SignIn/SignUp flow), then authorize
    const targetUrl = `${odhexBaseUrl}/signin?${params.toString()}`;
    
    // Open ODHex in a new tab
    window.open(targetUrl, "_blank", "noopener,noreferrer");
    onClose();
    setChecking(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isPinVerified ? "Choose Exchange Platform" : "Verify PIN"}</DialogTitle>
          <DialogDescription>
            {isPinVerified
              ? `Select an external exchanger to withdraw your ${withdrawableAmount.toFixed(2)} KOLI coins`
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
          {/* ODHex - Available */}
          <div 
            className="flex items-center justify-between p-3 border-2 border-green-500 rounded-full hover:bg-green-500/10 transition-colors cursor-pointer group"
            onClick={handleODHexWithdrawal}
          >
            <div className="flex items-center gap-3">
              <img src={odhexLogo} alt="ODHex" className="w-8 h-8 rounded-full object-cover" />
              <div className="font-semibold text-sm">ODHex Exchange</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500 text-white text-xs">Available</Badge>
              {checking ? (
                <IconLoader className="w-4 h-4 animate-spin text-green-500" />
              ) : (
                <IconExternalLink className="w-4 h-4 text-green-500 group-hover:translate-x-1 transition-transform" />
              )}
            </div>
          </div>

          {/* Binance - Coming Soon */}
          <div className="flex items-center justify-between p-3 border-2 border-muted rounded-full opacity-60 cursor-not-allowed">
            <div className="flex items-center gap-3">
              <img src={binanceLogo} alt="Binance" className="w-8 h-8 rounded-full object-cover" />
              <div className="font-semibold text-sm">Binance</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              <IconLock className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Coinbase - Coming Soon */}
          <div className="flex items-center justify-between p-3 border-2 border-muted rounded-full opacity-60 cursor-not-allowed">
            <div className="flex items-center gap-3">
              <img src={coinbaseLogo} alt="Coinbase" className="w-8 h-8 rounded-full object-cover" />
              <div className="font-semibold text-sm">Coinbase</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              <IconLock className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Crypto.com - Coming Soon */}
          <div className="flex items-center justify-between p-3 border-2 border-muted rounded-full opacity-60 cursor-not-allowed">
            <div className="flex items-center gap-3">
              <img src={cryptoLogo} alt="Crypto.com" className="w-8 h-8 rounded-full object-cover" />
              <div className="font-semibold text-sm">Crypto.com</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              <IconLock className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* OKX - Coming Soon */}
          <div className="flex items-center justify-between p-3 border-2 border-muted rounded-full opacity-60 cursor-not-allowed">
            <div className="flex items-center gap-3">
              <img src={okxLogo} alt="OKX" className="w-8 h-8 rounded-full object-cover" />
              <div className="font-semibold text-sm">OKX</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              <IconLock className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> ODHex is currently the only available exchange partner. More platforms will be added soon. Your withdrawal amount will be transferred to your selected exchange account.
          </p>
        </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
