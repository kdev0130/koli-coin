import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IconExternalLink, IconWallet, IconLoader, IconLock } from "@tabler/icons-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import odhexLogo from "@/assets/odhex-logo.png";
import binanceLogo from "@/assets/binance.png";
import coinbaseLogo from "@/assets/coinbase.png";
import cryptoLogo from "@/assets/crypto.png";
import okxLogo from "@/assets/okx.png";

interface ExternalWithdrawModalProps {
  open: boolean;
  onClose: () => void;
  withdrawableAmount: number;
  onLocalWithdraw: () => void;
}

export const ExternalWithdrawModal: React.FC<ExternalWithdrawModalProps> = ({
  open,
  onClose,
  withdrawableAmount,
  onLocalWithdraw,
}) => {
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleODHexWithdrawal = () => {
    if (!user?.email) return;
    
    setChecking(true);
    
    // Determine ODHex base URL based on environment
    const currentUrl = new URL(window.location.href);
    let odhexBaseUrl: string;
    
    if (currentUrl.hostname === 'koli-2bad9.web.app') {
      // Production: Use ODHex production URL
      odhexBaseUrl = 'https://odhex-exchange.web.app';
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
    
    // Always redirect to signup page - ODHex will handle existing users
    const targetUrl = `${odhexBaseUrl}/signup?${params.toString()}`;
    
    // Redirect to ODHex (same tab for mobile compatibility)
    window.location.href = targetUrl;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Exchange Platform</DialogTitle>
          <DialogDescription>
            Select an external exchanger to withdraw your ₱{withdrawableAmount.toFixed(2)} KOLI coins
          </DialogDescription>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
};
