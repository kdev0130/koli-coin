import React from "react";
import { IconBell, IconGift, IconHome, IconUser } from "@tabler/icons-react";
import { Pickaxe } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

const navItems = [
  { icon: IconHome, label: "Home", path: "/dashboard" },
  { icon: IconGift, label: "Donation", path: "/donation" },
  { icon: Pickaxe, label: "Mining", path: "/mining" },
  { icon: IconBell, label: "Alerts", path: "/notifications" },
  { icon: IconUser, label: "Profile", path: "/profile" },
];

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCount } = useRealtimeNotifications(user?.uid || null);

  return (
    <nav
      className="ios-fixed-nav fixed bottom-0 left-0 right-0 z-[9999] flex items-center justify-around px-4 py-2 pb-[env(safe-area-inset-bottom)] border-t border-border bg-card backdrop-blur-lg"
      style={{
        position: "fixed",
        transform: "translate3d(0, 0, 0)",
        WebkitTransform: "translate3d(0, 0, 0)",
        touchAction: "none",
      }}
    >
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const showUnreadDot = item.path === "/notifications" && unreadCount > 0;

        return (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`relative flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon size={22} />
            <span className="text-xs">{item.label}</span>
            {showUnreadDot && (
              <span className="absolute top-0 right-2 h-2.5 w-2.5 rounded-full border border-background bg-red-500" />
            )}
          </button>
        );
      })}
    </nav>
  );
};

