import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  IconBell,
  IconHome,
  IconGift,
  IconUser,
  IconCheck,
  IconClock,
} from "@tabler/icons-react";
import { Pickaxe } from "lucide-react";
import koliLogo from "@/assets/koli-logo.png";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { HeaderWithdrawable } from "@/components/common/HeaderWithdrawable";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import {
  AppNotification,
  getNotificationTimeMs,
  markNotificationAsRead,
  markNotificationsAsRead,
} from "@/lib/notifications";
import { toast } from "sonner";

const formatNotificationTime = (notification: AppNotification) => {
  const timestamp = getNotificationTimeMs(notification.createdAt);
  if (!timestamp) {
    return "Just now";
  }
  return new Date(timestamp).toLocaleString();
};

const getTypeLabel = (type: AppNotification["type"]) => {
  switch (type) {
    case "kyc_approved":
      return "KYC";
    case "donation_approved":
      return "Donation";
    case "transaction_approved":
      return "Transaction";
    case "contract_near_withdrawal":
      return "Contract";
    case "contract_ready_withdrawal":
      return "Withdraw";
    default:
      return "Notification";
  }
};

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: notifications, loading, unreadCount } = useRealtimeNotifications(user?.uid || null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [markingIds, setMarkingIds] = useState<Record<string, boolean>>({});

  const unreadIds = useMemo(
    () => notifications.filter((item) => !item.isRead).map((item) => item.id),
    [notifications]
  );

  const handleMarkAllAsRead = async () => {
    if (!unreadIds.length || isMarkingAll) return;

    try {
      setIsMarkingAll(true);
      await markNotificationsAsRead(unreadIds);
      toast.success("All notifications marked as read.");
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
      toast.error("Could not mark all notifications as read.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleMarkSingleAsRead = async (notificationId: string, isRead: boolean) => {
    if (isRead || markingIds[notificationId]) return;

    try {
      setMarkingIds((prev) => ({ ...prev, [notificationId]: true }));
      await markNotificationAsRead(notificationId);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      toast.error("Could not mark this notification as read.");
    } finally {
      setMarkingIds((prev) => {
        const updated = { ...prev };
        delete updated[notificationId];
        return updated;
      });
    }
  };

  return (
    <div className="page-with-navbar bg-background">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 backdrop-blur-lg bg-background/80 border-b border-border"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={koliLogo} alt="KOLI" className="w-8 h-8" />
            <div>
              <span className="font-bold text-lg text-gradient-gold">$KOLI</span>
              <p className="text-xs text-muted-foreground">Notifications</p>
            </div>
          </div>
          <HeaderWithdrawable />
        </div>
      </motion.header>

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <IconBell className="h-5 w-5 text-primary" />
                    Notification Center
                  </CardTitle>
                  <CardDescription>
                    {unreadCount > 0
                      ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                      : "All notifications are read"}
                  </CardDescription>
                </div>

                {unreadCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMarkAllAsRead}
                    disabled={isMarkingAll}
                  >
                    {isMarkingAll ? "Marking..." : "Mark all as read"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading notifications...</p>
              ) : notifications.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground">No notifications yet.</p>
                </div>
              ) : (
                notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      item.isRead
                        ? "border-border bg-card"
                        : "border-red-500/40 bg-red-500/5 hover:bg-red-500/10"
                    }`}
                    onClick={() => handleMarkSingleAsRead(item.id, item.isRead)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{item.title}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {getTypeLabel(item.type)}
                          </Badge>
                          {!item.isRead && <span className="h-2 w-2 rounded-full bg-red-500" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{item.message}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <IconClock className="h-3.5 w-3.5" />
                        <span>{formatNotificationTime(item)}</span>
                      </div>
                    </div>
                    {!item.isRead && (
                      <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
                        <IconCheck className="h-3.5 w-3.5" />
                        Tap to mark as read
                      </div>
                    )}
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <nav
        className="ios-fixed-nav fixed bottom-0 left-0 right-0 z-[9999] flex items-center justify-around px-4 py-2 pb-[env(safe-area-inset-bottom)] border-t border-border bg-card backdrop-blur-lg"
        style={{
          position: "fixed",
          transform: "translate3d(0, 0, 0)",
          WebkitTransform: "translate3d(0, 0, 0)",
          touchAction: "none",
        }}
      >
        {[
          { icon: IconHome, label: "Home", path: "/dashboard" },
          { icon: IconGift, label: "Donation", path: "/donation" },
          { icon: Pickaxe, label: "Mining", path: "/mining" },
          { icon: IconUser, label: "Profile", path: "/profile" },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <item.icon size={22} />
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Notifications;
