import React from "react";
import { IconWallet } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeContracts } from "@/hooks/useRealtimeContracts";
import { calculateTotalWithdrawable } from "@/lib/donationContract";

interface HeaderWithdrawableProps {
  onClick?: () => void;
  className?: string;
}

export const HeaderWithdrawable: React.FC<HeaderWithdrawableProps> = ({ onClick, className = "" }) => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { data: contracts, loading } = useRealtimeContracts(user?.uid || null);

  const userBalance = userData?.balance || 0;
  const { totalAmount } = calculateTotalWithdrawable(contracts, userBalance);

  const content = (
    <>
      <span className="text-sm font-bold leading-none text-green-400">
        {loading ? "..." : totalAmount.toLocaleString()} KOLI
      </span>
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-secondary/50 text-green-500 sm:h-7 sm:w-7">
        <IconWallet size={12} className="sm:h-[14px] sm:w-[14px]" />
      </span>
    </>
  );

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    navigate("/donation");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-1.5 sm:gap-2 ${className}`}
      aria-label="Open withdraw options"
      title="Open withdraw options"
    >
      {content}
    </button>
  );
};
