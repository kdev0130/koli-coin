import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface RewardHistoryItem {
  id: string;
  userId: string;
  userName?: string;
  type: string;
  amount: number;
  secretCode?: string;
  claimedAt?: any;
  claimedDate?: string;
}

export function useRealtimeRewardsHistory(userId: string | null) {
  const [data, setData] = useState<RewardHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "rewardsHistory"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rewards: RewardHistoryItem[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as RewardHistoryItem[];

        rewards.sort((a, b) => {
          const getTime = (value: any) => {
            if (!value) return 0;
            if (typeof value?.toDate === "function") {
              return value.toDate().getTime();
            }
            if (typeof value?.seconds === "number") {
              return value.seconds * 1000;
            }
            const parsed = new Date(value).getTime();
            return Number.isNaN(parsed) ? 0 : parsed;
          };

          return getTime(b.claimedAt) - getTime(a.claimedAt);
        });

        setData(rewards);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { data, loading, error };
}
