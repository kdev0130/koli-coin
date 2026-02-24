import React from "react";
import { motion } from "motion/react";
import {
  IconBell,
  IconLock,
  IconLockOpen,
  IconCalendar,
  IconBuilding,
  IconSettings,
  IconRocket,
  IconPick,
  IconChartArcs,
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export const ActivityCenter = () => {
  const logs = [
    {
      section: "Account & Deposit History",
      entries: [
        {
          id: 1,
          title: "Deposit Unlock Schedule",
          message:
            "Reflecting your personal timeline: Your next scheduled unlock event is set for Feb 23, 2026. This is a system-generated log based on your account's specific vesting period.",
          loggedAt: "Logged: Feb 19, 2026 - 09:10 AM",
          icon: IconLock,
        },
        {
          id: 2,
          title: "Deposit Status — LOCKED",
          message:
            "Your deposit is currently locked and will be accessible once the lock-up period ends.",
          loggedAt: "Logged: Feb 19, 2026 - 09:25 AM",
          icon: IconLockOpen,
        },
      ],
    },
    {
      section: "Platform Status Logs",
      entries: [
        {
          id: 3,
          title: "System Maintenance",
          message:
            "Status: Stable. There are currently no maintenance schedules. For real-time updates or emergency alerts, please refer to the Official Telegram Group. (Note: During active updates, this log will reflect: \"Ongoing maintenance: Bugs may appear intermittently today.\")",
          loggedAt: "Logged: Feb 19, 2026 - 09:40 AM",
          icon: IconSettings,
        },
        {
          id: 4,
          title: "New Feature Deployment",
          message:
            "Status: Update Pending. New features are rolled out based on the roadmap. Please refer to the Telegram Group for the full list of recent announcements and version history.",
          loggedAt: "Logged: Feb 19, 2026 - 09:45 AM",
          icon: IconRocket,
        },
      ],
    },
    {
      section: "Upcoming Protocols (Pending Logs)",
      entries: [
        {
          id: 5,
          title: "Mining Activity",
          message:
            "STATUS: INACTIVE (COMING SOON). The mining protocol is currently being integrated into the dashboard. History for this section will populate once the feature is live.",
          loggedAt: "Logged: Feb 19, 2026 - 09:55 AM",
          icon: IconPick,
        },
        {
          id: 6,
          title: "Staking Rewards",
          message:
            "STATUS: PENDING (COMING SOON). Staking yield history and reward distribution logs are awaiting protocol launch. Refer to the Telegram Group for staking reward announcements.",
          loggedAt: "Logged: Feb 19, 2026 - 10:05 AM",
          icon: IconChartArcs,
        },
      ],
    },
  ];

  const getSectionTheme = (section: string) => {
    if (section === "Account & Deposit History") {
      return {
        sectionIcon: "text-green-500",
        sectionTitle: "text-green-400",
        entryCard: "bg-green-500/5 border-green-500/20",
        iconWrap: "bg-green-500/10",
        iconColor: "text-green-400",
        badgeClass: "bg-green-500/10 text-green-400 border-green-500/20",
        badgeLabel: "Account Logs",
      };
    }

    if (section === "Platform Status Logs") {
      return {
        sectionIcon: "text-blue-500",
        sectionTitle: "text-blue-400",
        entryCard: "bg-blue-500/5 border-blue-500/20",
        iconWrap: "bg-blue-500/10",
        iconColor: "text-blue-400",
        badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        badgeLabel: "Platform Logs",
      };
    }

    return {
      sectionIcon: "text-koli-gold",
      sectionTitle: "text-koli-gold",
      entryCard: "bg-koli-gold/5 border-koli-gold/20",
      iconWrap: "bg-koli-gold/10",
      iconColor: "text-koli-gold",
      badgeClass: "bg-koli-gold/10 text-koli-gold border-koli-gold/20",
      badgeLabel: "Pending Logs",
    };
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
              Activity Center (History & Logs)
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              Informational
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {logs.map((group, groupIndex) => (
                <div key={group.section} className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <IconBuilding className={`h-4 w-4 ${getSectionTheme(group.section).sectionIcon}`} />
                      <h3 className={`text-sm font-semibold ${getSectionTheme(group.section).sectionTitle}`}>{group.section}</h3>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${getSectionTheme(group.section).badgeClass}`}>
                      {getSectionTheme(group.section).badgeLabel}
                    </Badge>
                  </div>

                  {group.entries.map((entry, index) => (
                    <React.Fragment key={entry.id}>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (groupIndex + index) * 0.08 }}
                        className={`flex gap-4 p-3 rounded-lg border ${getSectionTheme(group.section).entryCard}`}
                      >
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getSectionTheme(group.section).iconWrap} ${getSectionTheme(group.section).iconColor}`}>
                          <entry.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <h4 className="text-sm font-semibold text-foreground">
                            {entry.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {entry.message}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <IconCalendar className="h-3 w-3" />
                            <span>{entry.loggedAt}</span>
                          </div>
                        </div>
                      </motion.div>
                      {index < group.entries.length - 1 && <Separator />}
                    </React.Fragment>
                  ))}

                  {groupIndex < logs.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
};
