import React from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { IconLogout, IconWallet, IconChartBar, IconUser, IconSettings } from "@tabler/icons-react";
import { KoliButton } from "@/components/ui/koli-button";
import koliLogo from "@/assets/koli-logo.png";

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/");
  };

  const stats = [
    { label: "Balance", value: "$0.00", icon: IconWallet },
    { label: "KOLI Tokens", value: "0", icon: IconChartBar },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background safe-top safe-bottom">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-4 border-b border-border"
      >
        <div className="flex items-center gap-3">
          <img src={koliLogo} alt="KOLI" className="w-8 h-8" />
          <span className="font-bold text-lg text-gradient-gold">$KOLI</span>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <IconLogout size={20} className="text-muted-foreground" />
        </button>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto scrollbar-hide">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-xl font-bold text-foreground mb-1">
            Welcome to KOLI
          </h1>
          <p className="text-sm text-muted-foreground">
            You're now part of the Kingdom
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-4"
        >
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="bg-card rounded-xl p-4 border border-border"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={18} className="text-primary" />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Actions
          </h2>
          
          <div className="space-y-2">
            <KoliButton variant="secondary" className="w-full justify-start">
              <IconWallet size={20} />
              <span>Buy KOLI Tokens</span>
            </KoliButton>
            
            <KoliButton variant="secondary" className="w-full justify-start">
              <IconChartBar size={20} />
              <span>View Portfolio</span>
            </KoliButton>
            
            <KoliButton variant="secondary" className="w-full justify-start">
              <IconUser size={20} />
              <span>My Profile</span>
            </KoliButton>
            
            <KoliButton variant="secondary" className="w-full justify-start">
              <IconSettings size={20} />
              <span>Settings</span>
            </KoliButton>
          </div>
        </motion.div>

        {/* Lock-in Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-primary/10 rounded-xl p-4 border border-primary/20"
        >
          <h3 className="text-sm font-semibold text-primary mb-2">
            Investment Terms Active
          </h3>
          <p className="text-xs text-muted-foreground">
            Your investments are subject to a 30-day lock-in period with a maximum 30% withdrawal during this time.
          </p>
        </motion.div>
      </div>

      {/* Bottom Navigation Placeholder */}
      <motion.nav
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex items-center justify-around px-4 py-3 border-t border-border bg-card"
      >
        {[
          { icon: IconWallet, label: "Wallet" },
          { icon: IconChartBar, label: "Portfolio" },
          { icon: IconUser, label: "Profile" },
          { icon: IconSettings, label: "Settings" },
        ].map((item, index) => (
          <button
            key={item.label}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
              index === 0 ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon size={22} />
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </motion.nav>
    </div>
  );
};

export default Dashboard;
