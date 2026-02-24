import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  IconNews,
  IconCoin,
  IconUsers,
  IconTrendingUp,
} from "@tabler/icons-react";
import { collection, onSnapshot, type Timestamp } from "firebase/firestore";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";

type NewsType = "news" | "coin" | "community" | "update";

type NewsItem = {
  id: string;
  type: NewsType;
  categoryLabel: string;
  title: string;
  description: string;
  date: string;
  image?: string;
};

type FirestoreNewsDoc = {
  category?: string;
  type?: string;
  title?: string;
  details?: string;
  description?: string;
  imageUrl?: string;
  image?: string;
  postedAt?: string | number | Date | Timestamp;
  createdAt?: string | number | Date | Timestamp;
};

export const NewsFeed = () => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const relativeFormatter = useMemo(
    () => new Intl.RelativeTimeFormat("en", { numeric: "auto" }),
    [],
  );

  const getSafeDate = (value?: FirestoreNewsDoc["postedAt"]) => {
    if (!value) return null;

    if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatRelativeDate = (date: Date | null) => {
    if (!date) return "Just now";

    const seconds = Math.round((date.getTime() - Date.now()) / 1000);
    const absoluteSeconds = Math.abs(seconds);

    if (absoluteSeconds < 60) return relativeFormatter.format(seconds, "second");

    const minutes = Math.round(seconds / 60);
    if (Math.abs(minutes) < 60) return relativeFormatter.format(minutes, "minute");

    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return relativeFormatter.format(hours, "hour");

    const days = Math.round(hours / 24);
    return relativeFormatter.format(days, "day");
  };

  const normalizeType = (value?: string): NewsType => {
    const normalized = value?.trim().toLowerCase();

    if (!normalized) return "news";
    if (["coin", "coins", "token"].includes(normalized)) return "coin";
    if (["community", "member", "members"].includes(normalized)) return "community";
    if (["update", "platform", "announcement"].includes(normalized)) return "update";
    if (["news"].includes(normalized)) return "news";

    return "news";
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "news"),
      (snapshot) => {
        const mapped = snapshot.docs
          .map((doc) => {
            const data = doc.data() as FirestoreNewsDoc;
            const date = getSafeDate(data.postedAt ?? data.createdAt);

            return {
              id: doc.id,
              type: normalizeType(data.category ?? data.type),
              categoryLabel: (data.category ?? data.type ?? "News").toString().trim(),
              title: data.title?.trim() || "Untitled update",
              description: data.details?.trim() || data.description?.trim() || "No details provided.",
              date: formatRelativeDate(date),
              image: data.imageUrl || data.image,
              sortDate: date?.getTime() ?? 0,
            };
          })
          .sort((a, b) => b.sortDate - a.sortDate)
          .map(({ sortDate, ...item }) => item);

        setNewsItems(mapped);
        setIsLoading(false);
        setError(null);
      },
      (snapshotError) => {
        console.error("Failed to fetch news:", snapshotError);
        setError("Unable to load news right now.");
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [relativeFormatter]);

  const getTypeIcon = (type: NewsType) => {
    switch (type) {
      case "coin":
        return IconCoin;
      case "community":
        return IconUsers;
      case "update":
        return IconTrendingUp;
      default:
        return IconNews;
    }
  };

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
          {isLoading ? "Loading..." : `${newsItems.length} Updates`}
        </Badge>
      </div>

      {error ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          {error}
        </div>
      ) : null}

      <BentoGrid className="max-w-full mx-0">
        {!isLoading && newsItems.length === 0 ? (
          <BentoGridItem
            title="No news yet"
            description="New announcements will appear here once posted."
            header={
              <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100 items-center justify-center">
                <IconNews className="h-12 w-12 text-neutral-400 dark:text-neutral-600" />
              </div>
            }
          />
        ) : null}

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
                  {React.createElement(getTypeIcon(item.type), {
                    className: "h-12 w-12 text-neutral-400 dark:text-neutral-600",
                  })}
                </div>
              )
            }
            icon={
              <div className="flex items-center gap-2">
                <Badge className={getTypeColor(item.type)} variant="outline">
                  {item.categoryLabel}
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
