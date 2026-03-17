import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  IconBell,
  IconRocket,
  IconClock,
  IconCheck,
} from "@tabler/icons-react";
import { Pickaxe } from "lucide-react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import koliLogo from "@/assets/koli-logo.png";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNavigation } from "@/components/common/BottomNavigation";
import { HeaderWithdrawable } from "@/components/common/HeaderWithdrawable";
import { db } from "@/lib/firebase";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Mining = () => {
  const { userData } = useAuth();
  const [email, setEmail] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [alertSet, setAlertSet] = useState(false);
  const [isLoadingWaitlist, setIsLoadingWaitlist] = useState(true);
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);
  const [isUpdatingAlert, setIsUpdatingAlert] = useState(false);

  // Mock data - replace with actual data
  const coinCreationProgress = {
    current: 2500000,
    target: 1000000000,
  };
  const coinCreationPercentage = Math.min(100, Number(((coinCreationProgress.current / coinCreationProgress.target) * 100).toFixed(2)));

  useEffect(() => {
    let isCancelled = false;

    const loadWaitlistStatus = async () => {
      if (!userData?.uid) {
        if (!isCancelled) {
          setIsLoadingWaitlist(false);
        }
        return;
      }

      setIsLoadingWaitlist(true);
      try {
        const waitlistRef = doc(db, "waitlist", userData.uid);
        const waitlistSnapshot = await getDoc(waitlistRef);

        if (isCancelled) return;

        if (waitlistSnapshot.exists()) {
          const data = waitlistSnapshot.data();
          const storedEmail = typeof data.email === "string" ? data.email : "";
          const hasJoined = Boolean(data.hasJoined) || Boolean(storedEmail);

          setIsJoined(hasJoined);
          setAlertSet(Boolean(data.isAlertSet));
          setEmail(storedEmail || userData.email || "");
        } else {
          setIsJoined(false);
          setAlertSet(false);
          setEmail(userData.email || "");
        }
      } catch (error) {
        console.error("Error loading waitlist status:", error);
        if (!isCancelled) {
          toast.error("Couldn't load your waitlist status. Please refresh.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingWaitlist(false);
        }
      }
    };

    void loadWaitlistStatus();

    return () => {
      isCancelled = true;
    };
  }, [userData?.uid, userData?.email]);

  const handleJoinWaitlist = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("Please enter your email address");
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (isJoined) {
      toast.error("You already joined the waitlist with one email.");
      return;
    }

    if (!userData?.uid) {
      toast.error("Please sign in to join the waitlist.");
      return;
    }

    try {
      setIsJoiningWaitlist(true);
      await setDoc(
        doc(db, "waitlist", userData.uid),
        {
          userId: userData.uid,
          email: normalizedEmail,
          hasJoined: true,
          isAlertSet: alertSet,
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setEmail(normalizedEmail);
      setIsJoined(true);
      toast.success("Successfully joined the waitlist!", {
        description: "We'll notify you when mining launches.",
      });
    } catch (error) {
      console.error("Error joining waitlist:", error);
      toast.error("Failed to join waitlist. Please try again.");
    } finally {
      setIsJoiningWaitlist(false);
    }
  };

  const handleToggleAlert = async () => {
    if (!userData?.uid) {
      toast.error("Please sign in to set launch alerts.");
      return;
    }

    if (!isJoined) {
      toast.error("Join the waitlist first before setting launch alerts.");
      return;
    }

    const nextAlertValue = !alertSet;

    try {
      setIsUpdatingAlert(true);
      await setDoc(
        doc(db, "waitlist", userData.uid),
        {
          userId: userData.uid,
          isAlertSet: nextAlertValue,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setAlertSet(nextAlertValue);

      if (nextAlertValue) {
        toast.success("Alert set!", {
          description: "You'll receive a notification when mining is available.",
        });
      } else {
        toast.success("Alert removed", {
          description: "You can turn it back on anytime.",
        });
      }
    } catch (error) {
      console.error("Error updating launch alert:", error);
      toast.error("Couldn't update launch alert. Please try again.");
    } finally {
      setIsUpdatingAlert(false);
    }
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
                  Track the progress towards our 1B coin creation milestone
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
                    value={coinCreationPercentage} 
                    className="h-4"
                  />
                  
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-koli-gold">
                      {coinCreationPercentage}% Complete
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
                {isLoadingWaitlist ? (
                  <p className="text-sm text-muted-foreground">Loading your waitlist status...</p>
                ) : !isJoined ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isJoiningWaitlist}
                        className="w-full"
                      />
                    </div>

                    <Button
                      onClick={handleJoinWaitlist}
                      disabled={isJoiningWaitlist}
                      className="w-full bg-gradient-to-r from-koli-gold to-koli-gold-dark hover:from-koli-gold-dark hover:to-koli-gold text-koli-navy font-bold"
                      size="lg"
                    >
                      <IconRocket className="h-5 w-5 mr-2" />
                      {isJoiningWaitlist ? "Joining..." : "Join Waitlist"}
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
              <CardContent className="space-y-3">
                <Button
                  onClick={handleToggleAlert}
                  variant="outline"
                  disabled={isLoadingWaitlist || isUpdatingAlert || !isJoined}
                  className="w-full border-primary/50 hover:bg-primary/10 disabled:opacity-60"
                  size="lg"
                >
                  <IconBell className="h-5 w-5 mr-2" />
                  {isUpdatingAlert ? "Saving..." : alertSet ? "Unset Launch Alert" : "Set Alert for Launch"}
                </Button>

                {!isJoined ? (
                  <p className="text-xs text-muted-foreground text-center">
                    Join the waitlist first to enable launch alerts.
                  </p>
                ) : (
                  <div className={`flex items-center justify-center gap-2 py-1 ${alertSet ? "text-green-500" : "text-muted-foreground"}`}>
                    {alertSet && <IconCheck className="h-5 w-5" />}
                    <span className="font-semibold">
                      {alertSet ? "Alert is set" : "Alert is not set"}
                    </span>
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

      <BottomNavigation />
    </div>
  );
};

export default Mining;
