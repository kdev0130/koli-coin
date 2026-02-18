import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { IconAlertTriangle, IconClock } from "@tabler/icons-react";
import { db } from "@/lib/firebase";

interface MaintenanceScheduler {
  enabled?: boolean;
  message?: string;
  startAt?: string;
  endAt?: string;
  durationHours?: number;
  startInHours?: number;
  timezone?: string;
}

const formatDateInTimezone = (date: Date, timeZone?: string) => {
  try {
    return new Intl.DateTimeFormat("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timeZone || undefined,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

const parseDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatCountdown = (milliseconds: number) => {
  if (milliseconds <= 0) return "Starting now";

  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
};

export const MaintenanceBanner = () => {
  const location = useLocation();
  const [settings, setSettings] = useState<MaintenanceScheduler | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const ref = doc(db, "systemSettings", "maintenanceScheduler");
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      if (!snapshot.exists()) {
        setSettings(null);
        return;
      }

      setSettings(snapshot.data() as MaintenanceScheduler);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(timer);
  }, []);

  const hiddenPaths = new Set(["/signin", "/signup", "/forgot-password", "/verify-reset-otp", "/reset-password"]);
  if (hiddenPaths.has(location.pathname)) {
    return null;
  }

  if (!settings) {
    return null;
  }

  const startAt = parseDate(settings.startAt);
  let endAt = parseDate(settings.endAt);

  if (!endAt && startAt && typeof settings.durationHours === "number" && settings.durationHours > 0) {
    endAt = new Date(startAt.getTime() + settings.durationHours * 60 * 60 * 1000);
  }

  if (endAt && now > endAt) {
    return null;
  }

  const isScheduled = !!startAt && now < startAt;
  const isOngoing = !!settings.enabled && !!startAt && now >= startAt && (!endAt || now <= endAt);

  if (!isScheduled && !isOngoing) {
    return null;
  }

  const statusText = isOngoing ? "Maintenance Ongoing" : "Scheduled Maintenance";

  const message = settings.message?.trim() || "The platform will undergo scheduled maintenance.";

  let scheduleText: string | null = null;
  if (startAt) {
    const timeZone = settings.timezone || "Asia/Manila";
    const startText = formatDateInTimezone(startAt, timeZone);
    const endText = endAt ? formatDateInTimezone(endAt, timeZone) : null;
    scheduleText = endText
      ? `${startText} - ${endText} (${timeZone})`
      : `${startText} (${timeZone})`;
  }

  const countdownText = isScheduled && startAt ? formatCountdown(startAt.getTime() - now.getTime()) : null;

  return (
    <div className="sticky top-0 z-[10001] border-b border-yellow-500/30 bg-yellow-500/10 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-2">
        <IconAlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-yellow-500">{statusText}</p>
          <p className="text-xs text-foreground/90">{message}</p>
          {countdownText && (
            <p className="mt-1 text-xs font-medium text-yellow-500">
              Starts in: {countdownText}
            </p>
          )}
          {scheduleText && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <IconClock className="h-3 w-3" />
              {scheduleText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceBanner;