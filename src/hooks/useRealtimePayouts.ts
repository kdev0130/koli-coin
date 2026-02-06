import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface PayoutRequest {
  id: string;
  userId: string;
  contractId?: string;
  amount: number;
  status: "pending" | "processing" | "completed" | "failed";
  userFullName: string;
  userPhoneNumber: string;
  userEmail: string;
  withdrawalNumber?: number;
  totalWithdrawals?: number;
  contractPrincipal?: number;
  withdrawalType?: "MANA_REWARDS" | "CONTRACT";
  isPooled?: boolean;
  periodsWithdrawn?: number;
  requestedAt: string;
  processedAt: string | null;
  processedBy: string | null;
  notes: string;
}

export function useRealtimePayouts(userId: string | null) {
  const [data, setData] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log('🔍 Fetching payouts for user:', userId);

    // Try without orderBy first to avoid index issues
    const q = query(
      collection(db, "payout_queue"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('📦 Payout snapshot received, size:', snapshot.size);
        const payouts: PayoutRequest[] = [];
        snapshot.forEach((doc) => {
          console.log('📄 Payout doc:', doc.id, doc.data());
          payouts.push({
            id: doc.id,
            ...doc.data(),
          } as PayoutRequest);
        });
        
        // Sort in memory instead of Firestore
        payouts.sort((a, b) => {
          const dateA = new Date(a.requestedAt).getTime();
          const dateB = new Date(b.requestedAt).getTime();
          return dateB - dateA; // Descending order (newest first)
        });
        
        console.log('✅ Payouts loaded:', payouts.length);
        setData(payouts);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("❌ Error fetching payouts:", err);
        console.error("Error details:", {
          code: err.code,
          message: err.message,
          name: err.name
        });
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { data, loading, error };
}
