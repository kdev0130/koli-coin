import React, { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  IconLogout,
  IconHome,
  IconGift,
  IconUser,
  IconBell,
  IconRocket,
  IconClock,
  IconCheck,
} from "@tabler/icons-react";
import { Pickaxe } from "lucide-react";
import koliLogo from "@/assets/koli-logo.png";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { HeaderWithdrawable } from "@/components/common/HeaderWithdrawable";

const Mining = () => {
  const navigate = useNavigate();
  const { logout, userData } = useAuth();
  const [email, setEmail] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [alertSet, setAlertSet] = useState(false);

  // Mock data - replace with actual data
  const coinCreationProgress = {
    current: 2500000,
    target: 10000000,
    percentage: 25,
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/signin");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleJoinWaitlist = () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    // Simulate API call
    setIsJoined(true);
    toast.success("Successfully joined the waitlist!", {
      description: "We'll notify you when mining launches.",
    });
  };

  const handleSetAlert = () => {
    setAlertSet(true);
    toast.success("Alert set!", {
      description: "You'll receive a notification when mining is available.",
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
              <p className="text-xs text-muted-foreground">Mining</p>
            </div>
          </div>
          <HeaderWithdrawable />
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
          {/* Coming Soon Hero */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-6"
          >
            <div className="relative inline-block">
              <motion.div
                animate={{
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Pickaxe className="h-24 w-24 text-koli-gold mx-auto" />
              </motion.div>
              
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 blur-3xl opacity-50"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Pickaxe className="h-24 w-24 text-koli-gold mx-auto" />
              </motion.div>
            </div>

            <div className="space-y-3">
              <Badge className="bg-koli-gold/10 text-koli-gold border-koli-gold/20 px-4 py-1">
                <IconClock className="h-4 w-4 mr-1" />
                Coming Soon
              </Badge>
              
              <h1 className="text-4xl md:text-6xl font-bold text-foreground">
                KOLI Mining
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Mine KOLI coins and earn rewards. Join the waitlist to be among the first to start mining when we launch!
              </p>
            </div>
          </motion.div>

          {/* Coin Creation Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-koli-gold/20 bg-gradient-to-br from-koli-gold/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-koli-gold">
                  <IconRocket className="h-6 w-6" />
                  KOLI Coin Creation Progress
                </CardTitle>
                <CardDescription>
                  Track the progress towards our 10M coin creation milestone
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Supply</span>
                    <span className="font-bold text-foreground">
                      {coinCreationProgress.current.toLocaleString()} KOLI
                    </span>
                  </div>
                  
                  <Progress 
                    value={coinCreationProgress.percentage} 
                    className="h-4"
                  />
                  
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-koli-gold">
                      {coinCreationProgress.percentage}% Complete
                    </span>
                    <span className="text-muted-foreground">
                      {coinCreationProgress.target.toLocaleString()} KOLI Goal
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Mining will become available once we reach 100% coin creation. Be ready to start earning KOLI rewards!
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Waitlist Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconBell className="h-5 w-5 text-primary" />
                  Join the Mining Waitlist
                </CardTitle>
                <CardDescription>
                  Be the first to know when KOLI mining launches
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isJoined ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    <Button
                      onClick={handleJoinWaitlist}
                      className="w-full bg-gradient-to-r from-koli-gold to-koli-gold-dark hover:from-koli-gold-dark hover:to-koli-gold text-koli-navy font-bold"
                      size="lg"
                    >
                      <IconRocket className="h-5 w-5 mr-2" />
                      Join Waitlist
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-4 space-y-3">
                    <div className="flex justify-center">
                      <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                        <IconCheck className="h-8 w-8 text-green-500" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">
                        You're on the list!
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        We'll email you at <span className="font-semibold">{email}</span> when mining launches.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Set Alert Option */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconBell className="h-5 w-5 text-primary" />
                  Set Launch Alert
                </CardTitle>
                <CardDescription>
                  Get notified in-app when mining is available
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!alertSet ? (
                  <Button
                    onClick={handleSetAlert}
                    variant="outline"
                    className="w-full border-primary/50 hover:bg-primary/10"
                    size="lg"
                  >
                    <IconBell className="h-5 w-5 mr-2" />
                    Set Alert for Launch
                  </Button>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-3 text-green-500">
                    <IconCheck className="h-5 w-5" />
                    <span className="font-semibold">Alert Set Successfully</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Features Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>What to Expect from KOLI Mining</CardTitle>
                <CardDescription>Features coming with the mining launch</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-koli-gold/10 flex items-center justify-center">
                      <Pickaxe className="h-5 w-5 text-koli-gold" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Earn KOLI Rewards</h4>
                      <p className="text-sm text-muted-foreground">
                        Mine KOLI coins and earn daily rewards based on your mining power
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <IconRocket className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Boost Your Mining Power</h4>
                      <p className="text-sm text-muted-foreground">
                        Increase your mining efficiency with upgrades and bonuses
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <IconCheck className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Instant Payouts</h4>
                      <p className="text-sm text-muted-foreground">
                        Withdraw your mined KOLI coins directly to your wallet
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

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
              index === 2 ? "text-primary" : "text-muted-foreground hover:text-foreground"
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

export default Mining;
