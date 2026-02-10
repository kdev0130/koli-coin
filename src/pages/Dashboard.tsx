import React, { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { 
  IconLogout, 
  IconHome, 
  IconGift, 
  IconUser,
  IconExternalLink,
  IconSparkles,
  IconWorld,
  IconCurrencyBitcoin,
} from "@tabler/icons-react";
import { Pickaxe } from "lucide-react";
import koliLogo from "@/assets/koli-logo.png";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusRibbon } from "@/components/dashboard/StatusRibbon";
import { NewsFeed } from "@/components/dashboard/NewsFeed";
import { ActivityCenter } from "@/components/dashboard/ActivityCenter";
import { ManaRewardModal } from "@/components/dashboard/ManaRewardModal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const { userData, user, logout } = useAuth();
  const [isManaModalOpen, setIsManaModalOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/signin");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const openExternalLink = (url: string, name: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    toast.info(`Opening ${name}`, {
      description: "Redirecting to external site...",
    });
  };

  return (
    <div className="page-with-navbar bg-background">
      {/* Header */}
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
              <p className="text-xs text-muted-foreground">Information Hub</p>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {(() => {
                const hour = new Date().getHours();
                const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
                return userData?.name ? `${greeting}, ${userData.name}!` : greeting;
              })()}
            </h1>
            <h2 className="text-xl text-muted-foreground">
              Welcome to the Kingdom
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Stay updated with the latest news, track KOLI coin progress, and never miss important notifications
            </p>
          </motion.div>

          {/* Official Ecosystem Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <IconWorld className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Official Ecosystem</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* KOLI International Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card 
                  className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent cursor-pointer hover:border-blue-500/50 transition-colors"
                  onClick={() => openExternalLink("https://kol-intl.com", "KOLI International")}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <IconWorld className="h-6 w-6 text-blue-500" />
                      </div>
                      <IconExternalLink className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">
                      KOLI International
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Explore our global community platform and connect with members worldwide
                    </p>
                    <div className="text-xs text-blue-400 font-mono">
                      kol-intl.com
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* KOLI Coin IO Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card 
                  className="border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent cursor-pointer hover:border-yellow-500/50 transition-colors"
                  onClick={() => openExternalLink("https://koli-coin.io", "KOLI Coin IO")}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-12 w-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                        <IconCurrencyBitcoin className="h-6 w-6 text-yellow-500" />
                      </div>
                      <IconExternalLink className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">
                      KOLI Coin IO
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Learn about $KOLI tokenomics, roadmap, and cryptocurrency features
                    </p>
                    <div className="text-xs text-yellow-400 font-mono">
                      koli-coin.io
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>

          {/* MANA Reward Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-transparent">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="h-16 w-16 flex-shrink-0 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center"
                    >
                      <IconSparkles className="h-8 w-8 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-1">
                        MANA Daily Rewards
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Enter secret codes from Telegram to win ₱1-₱5!
                      </p>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => setIsManaModalOpen(true)}
                    className="w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                  >
                    <IconGift className="mr-2 h-5 w-5" />
                    Claim Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Status Ribbon - KOLI Coin Creation Progress */}
          <StatusRibbon />

          {/* News Feed Section */}
          <NewsFeed />

          {/* Activity Center - Notifications */}
          <ActivityCenter />
        </div>
      </main>

      {/* MANA Reward Modal */}
      <ManaRewardModal
        open={isManaModalOpen}
        onClose={() => setIsManaModalOpen(false)}
        userId={user?.uid || ""}
        userName={userData?.name || "User"}
      />

      {/* Bottom Navigation */}
      <nav
        className="ios-fixed-nav fixed bottom-0 left-0 right-0 z-[9999] flex items-center justify-around px-4 py-2 pb-[env(safe-area-inset-bottom)] border-t border-border bg-card backdrop-blur-lg"
        style={{ 
          position: 'fixed',
          transform: 'translate3d(0, 0, 0)',
          WebkitTransform: 'translate3d(0, 0, 0)',
          touchAction: 'none'
        }}
      >
        {[
          { icon: IconHome, label: "Home", path: "/dashboard" },
          { icon: IconGift, label: "Donation", path: "/donation" },
          { icon: Pickaxe, label: "Mining", path: "/mining" },
          { icon: IconUser, label: "Profile", path: "/profile" },
        ].map((item, index) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
              index === 0 ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon size={22} />
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Dashboard;
