import React from "react";
import { IconAlertTriangle, IconClock } from "@tabler/icons-react";
import koliLogo from "@/assets/koli-logo.png";
import maintenanceGif from "@/assets/maintenance.gif";

interface MaintenanceModeProps {
  message?: string;
  endAtText?: string | null;
}

const MaintenanceMode: React.FC<MaintenanceModeProps> = ({ message, endAtText }) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <img src={koliLogo} alt="KOLI" className="h-8 w-8" />
          <div>
            <p className="text-lg font-bold text-gradient-gold">$KOLI</p>
            <p className="text-xs text-muted-foreground">Platform Maintenance</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-5xl items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-background to-koli-navy/30 p-6 md:p-8">
          <div className="mb-6 flex items-center gap-2 text-yellow-500">
            <IconAlertTriangle className="h-5 w-5" />
            <p className="text-sm font-semibold uppercase tracking-wide">Scheduled Maintenance</p>
          </div>

          <div className="grid gap-6 md:grid-cols-[1fr_220px] md:items-center">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">We’ll be back shortly</h1>
              <p className="mt-3 text-sm text-muted-foreground md:text-base">
                {message?.trim() || "KOLI is temporarily unavailable while we perform maintenance. Please check back soon."}
              </p>

              {endAtText && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
                  <IconClock className="h-4 w-4 text-primary" />
                  Estimated end: <span className="font-medium text-foreground">{endAtText}</span>
                </div>
              )}
            </div>

            <div className="flex justify-center md:justify-end">
              <img
                src={maintenanceGif}
                alt="Maintenance in progress"
                className="h-auto w-full max-w-[220px] object-contain"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MaintenanceMode;