import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";

export type NotificationType =
  | "kyc_approved"
  | "donation_approved"
  | "transaction_approved"
  | "contract_near_withdrawal"
  | "contract_ready_withdrawal";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt?: Timestamp | string | number | null;
  updatedAt?: Timestamp | string | number | null;
  readAt?: Timestamp | string | number | null;
  relatedId?: string;
}

const sessionNotificationCache = new Set<string>();

interface CreateNotificationInput {
  userId: string;
  notificationId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
}

export async function createNotificationIfMissing({
  userId,
  notificationId,
  type,
  title,
  message,
  relatedId,
}: CreateNotificationInput): Promise<boolean> {
  if (!userId || !notificationId) {
    return false;
  }

  if (sessionNotificationCache.has(notificationId)) {
    return false;
  }

  const notificationRef = doc(db, "notifications", notificationId);
  const snapshot = await getDoc(notificationRef);
  if (snapshot.exists()) {
    sessionNotificationCache.add(notificationId);
    return false;
  }

  await setDoc(notificationRef, {
    userId,
    type,
    title,
    message,
    relatedId: relatedId || null,
    isRead: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  sessionNotificationCache.add(notificationId);
  return true;
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!notificationId) return;

  await updateDoc(doc(db, "notifications", notificationId), {
    isRead: true,
    readAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function markNotificationsAsRead(notificationIds: string[]): Promise<void> {
  if (!notificationIds.length) return;

  const batch = writeBatch(db);
  const uniqueIds = Array.from(new Set(notificationIds));

  uniqueIds.forEach((id) => {
    batch.update(doc(db, "notifications", id), {
      isRead: true,
      readAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

export function getNotificationTimeMs(value: unknown): number {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}
