import React from "react";
import { motion } from "motion/react";
import { IconCoin, IconTrendingUp } from "@tabler/icons-react";
import { Progress } from "@/components/ui/progress";

export const StatusRibbon = () => {
  // Mock data - replace with actual data from your API
  const coinProgress = {
    current: 2500000,
    target: 1000000000,
  };
  const percentage = Math.min(100, Number(((coinProgress.current / coinProgress.target) * 100).toFixed(2)));

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-koli-gold/10 via-koli-navy/10 to-koli-gold/10 p-4 backdrop-blur-sm"
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <IconCoin className="h-5 w-5 text-koli-gold" />
            <h3 className="font-bold text-foreground">KOLI Coin Creation Progress</h3>
          </div>
          <div className="flex items-center gap-1 text-sm text-koli-gold">
            <IconTrendingUp className="h-4 w-4" />
            <span className="font-semibold">{percentage}%</span>
          </div>
        </div>

        <Progress value={percentage} className="h-2 mb-2" />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{coinProgress.current.toLocaleString()} KOLI</span>
          <span>{coinProgress.target.toLocaleString()} KOLI Goal</span>
        </div>
      </div>

      {/* Animated background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-koli-gold/5 to-transparent"
        animate={{
          x: ["-100%", "100%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </motion.div>
  );
};
