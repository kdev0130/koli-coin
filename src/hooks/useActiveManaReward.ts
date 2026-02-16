import { useMemo } from "react";
import { useRealtimeDocument } from "@/hooks/useRealtimeDocument";

interface GlobalRewardDocument {
  activeCode?: string;
  expiresAt?: string;
  remainingPool?: number;
}

export function useActiveManaReward() {
  const { data, loading } = useRealtimeDocument<GlobalRewardDocument>(
    "globalRewards",
    "currentActiveReward"
  );

  const hasActiveCode = useMemo(() => {
    const code = data?.activeCode;
    const hasCode = typeof code === "string" && code.trim().length > 0;

    const hasPool = typeof data?.remainingPool === "number" && data.remainingPool > 0;

    const expiresValue = data?.expiresAt;
    const isNotExpired =
      typeof expiresValue === "string" &&
      expiresValue.trim().length > 0 &&
      !Number.isNaN(new Date(expiresValue).getTime()) &&
      new Date(expiresValue).getTime() > Date.now();

    return hasCode && hasPool && isNotExpired;
  }, [data?.activeCode, data?.remainingPool, data?.expiresAt]);

  return { hasActiveCode, loading };
}
