import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppNotification, getNotificationTimeMs } from "@/lib/notifications";

interface UseRealtimeNotificationsResult {
  data: AppNotification[];
  loading: boolean;
  error: Error | null;
  unreadCount: number;
}

export function useRealtimeNotifications(userId: string | null): UseRealtimeNotificationsResult {
  const [data, setData] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notifications = snapshot.docs.map((item) => {
          const payload = item.data() as Omit<AppNotification, "id">;
          return {
            id: item.id,
            ...payload,
          };
        });

        notifications.sort((a, b) => {
          const aTime = getNotificationTimeMs(a.createdAt);
          const bTime = getNotificationTimeMs(b.createdAt);
          return bTime - aTime;
        });

        setData(notifications);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error listening to notifications:", err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const unreadCount = useMemo(
    () => data.reduce((count, item) => (item.isRead ? count : count + 1), 0),
    [data]
  );

  return {
    data,
    loading,
    error,
    unreadCount,
  };
}
