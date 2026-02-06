import React from "react";
import { motion } from "motion/react";
import {
  IconNews,
  IconCoin,
  IconUsers,
  IconTrendingUp,
  IconBell,
  IconCalendar,
} from "@tabler/icons-react";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export const NewsFeed = () => {
  // Mock news data - replace with actual data from your API/Admin
  const newsItems = [
    {
      id: 1,
      type: "news",
      title: "Platform Launch Update",
      description:
        "KOLI platform is officially live! Join thousands of users already participating in the community.",
      date: "2 hours ago",
      icon: IconNews,
      image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=500&q=80",
    },
    {
      id: 2,
      type: "coin",
      title: "Token Milestone Reached",
      description:
        "We've reached 2.5M KOLI coins! 25% of our initial goal achieved. Keep building!",
      date: "5 hours ago",
      icon: IconCoin,
      image: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&q=80",
    },
    {
      id: 3,
      type: "community",
      title: "Community Milestone",
      description:
        "10,000 members joined the KOLI Kingdom! Special rewards coming for early adopters.",
      date: "1 day ago",
      icon: IconUsers,
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&q=80",
    },
    {
      id: 4,
      type: "update",
      title: "New Features Announced",
      description:
        "Wallet integration and staking features launching next week. Stay tuned for more updates!",
      date: "2 days ago",
      icon: IconTrendingUp,
    },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case "news":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "coin":
        return "bg-koli-gold/10 text-koli-gold border-koli-gold/20";
      case "community":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "update":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <IconNews className="h-5 w-5 text-primary" />
          News Feed
        </h2>
        <Badge variant="secondary" className="text-xs">
          {newsItems.length} Updates
        </Badge>
      </div>

      <BentoGrid className="max-w-full mx-0">
        {newsItems.map((item, index) => (
          <BentoGridItem
            key={item.id}
            title={item.title}
            description={item.description}
            header={
              item.image ? (
                <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100 items-center justify-center">
                  <item.icon className="h-12 w-12 text-neutral-400 dark:text-neutral-600" />
                </div>
              )
            }
            icon={
              <div className="flex items-center gap-2">
                <Badge className={getTypeColor(item.type)} variant="outline">
                  {item.type}
                </Badge>
                <span className="text-xs text-muted-foreground">{item.date}</span>
              </div>
            }
            className={index === 0 ? "md:col-span-2" : ""}
          />
        ))}
      </BentoGrid>
    </motion.div>
  );
};
