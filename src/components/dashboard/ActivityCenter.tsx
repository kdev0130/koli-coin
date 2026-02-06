import React from "react";
import { motion } from "motion/react";
import {
  IconBell,
  IconLock,
  IconLockOpen,
  IconCalendar,
  IconAlertCircle,
  IconInfoCircle,
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export const ActivityCenter = () => {
  // Mock notifications - replace with actual data from your API
  const notifications = [
    {
      id: 1,
      type: "unlock",
      title: "Deposit Unlock Scheduled",
      message: "Your locked deposit of 500 KOLI will unlock in 3 days",
      time: "10 minutes ago",
      icon: IconLockOpen,
      priority: "high",
    },
    {
      id: 2,
      type: "announcement",
      title: "Platform Maintenance",
      message: "Scheduled maintenance on Feb 5, 2026 at 2:00 AM UTC",
      time: "2 hours ago",
      icon: IconAlertCircle,
      priority: "medium",
    },
    {
      id: 3,
      type: "info",
      title: "Staking Rewards Available",
      message: "You've earned 25 KOLI in staking rewards this week",
      time: "5 hours ago",
      icon: IconInfoCircle,
      priority: "low",
    },
    {
      id: 4,
      type: "unlock",
      title: "Deposit Unlocked",
      message: "Your deposit of 1,000 KOLI has been unlocked",
      time: "1 day ago",
      icon: IconLockOpen,
      priority: "high",
    },
    {
      id: 5,
      type: "announcement",
      title: "New Features Released",
      message: "Check out the new portfolio analytics dashboard",
      time: "2 days ago",
      icon: IconBell,
      priority: "low",
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "low":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "unlock":
        return "text-green-500";
      case "announcement":
        return "text-yellow-500";
      case "info":
        return "text-blue-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-4"
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <IconBell className="h-5 w-5 text-primary" />
              Activity Center
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {notifications.filter((n) => n.priority === "high").length} High Priority
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex gap-4 group cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors"
                  >
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center ${getIconColor(
                        notification.type
                      )}`}
                    >
                      <notification.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {notification.title}
                        </h4>
                        <Badge
                          className={getPriorityColor(notification.priority)}
                          variant="outline"
                        >
                          {notification.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <IconCalendar className="h-3 w-3" />
                        <span>{notification.time}</span>
                      </div>
                    </div>
                  </motion.div>
                  {index < notifications.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
};
