import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, QueryConstraint } from "firebase/firestore";
import { db } from "../lib/firebase";
import { DonationContract } from "../lib/donationContract";

/**
 * Real-time hook for donation contracts
 * @param userId - User ID to fetch contracts for
 * @returns Contracts data, loading state, and error
 */
export function useRealtimeContracts(userId: string | null) {
  const [data, setData] = useState<DonationContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setData([]);
      setLoading(false);
      return;
    }

    console.log(`[Real-time Update] donationContracts for user: ${userId}`);
    setLoading(true);

    const constraints: QueryConstraint[] = [where("userId", "==", userId)];
    const q = query(collection(db, "donationContracts"), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const contracts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as DonationContract[];

        console.log(`[Real-time Update] donationContracts: Found ${contracts.length} contracts`);
        setData(contracts);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[Real-time Error] donationContracts:", err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => {
      console.log("[Unsubscribe] donationContracts");
      unsubscribe();
    };
  }, [userId]);

  return { data, loading, error };
}
