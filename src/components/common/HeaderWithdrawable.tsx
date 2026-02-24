import React from "react";
import { IconBell, IconWallet } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeContracts } from "@/hooks/useRealtimeContracts";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { calculateTotalWithdrawable } from "@/lib/donationContract";

interface HeaderWithdrawableProps {
  onClick?: () => void;
  className?: string;
}

export const HeaderWithdrawable: React.FC<HeaderWithdrawableProps> = ({ onClick, className = "" }) => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { data: contracts, loading } = useRealtimeContracts(user?.uid || null);
  const { unreadCount } = useRealtimeNotifications(user?.uid || null);

  const userBalance = userData?.balance || 0;
  const { totalAmount } = calculateTotalWithdrawable(contracts, userBalance);

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    navigate("/donation");
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 sm:gap-2"
        aria-label="Open withdraw options"
        title="Open withdraw options"
      >
        <span className="text-sm font-bold leading-none text-green-400">
          {loading ? "..." : totalAmount.toLocaleString()} KOLI
        </span>
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-secondary/50 text-green-500 sm:h-7 sm:w-7">
          <IconWallet size={12} className="sm:h-[14px] sm:w-[14px]" />
        </span>
      </button>

      <button
        type="button"
        onClick={() => navigate("/notifications")}
        className="relative inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-secondary/50 text-primary transition-colors hover:bg-secondary sm:h-7 sm:w-7"
        aria-label="Open notifications"
        title="Open notifications"
      >
        <IconBell size={12} className="sm:h-[14px] sm:w-[14px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-background bg-red-500" />
        )}
      </button>
    </div>
  );
};
