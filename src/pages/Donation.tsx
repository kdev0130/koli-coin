import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  IconLogout,
  IconHome,
  IconGift,
  IconUser,
  IconWallet,
  IconLock,
  IconClock,
  IconTrendingUp,
  IconPlus,
  IconBell,
  IconCheck,
  IconHourglass,
  IconCircleCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import { Pickaxe } from "lucide-react";
import koliLogo from "@/assets/koli-logo.png";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SkeletonList } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeContracts } from "@/hooks/useRealtimeContracts";
import { HeaderWithdrawable } from "@/components/common/HeaderWithdrawable";
import { AddDonationModal } from "@/components/donation/AddDonationModal";
import { ExternalWithdrawModal } from "@/components/donation/ExternalWithdrawModal";
import {
  DonationContract,
  canWithdraw,
  getWithdrawalDetails,
  getDaysUntilNextWithdrawal,
  isContractActive,
  calculateTotalWithdrawable,
} from "@/lib/donationContract";
import { toast } from "sonner";
import { canUserWithdraw, getKycDisclaimer, isUserFullyVerified } from "@/lib/kycService";

const Donation = () => {
  const navigate = useNavigate();
  const { logout, userData, user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExternalWithdrawOpen, setIsExternalWithdrawOpen] = useState(false);

  // Fetch user's donation contracts from Firestore in real-time
  const { data: contracts, loading: contractsLoading } = useRealtimeContracts(user?.uid || null);

  // Debug logging
  useEffect(() => {
    console.log("=== DONATION PAGE DEBUG ===");
    console.log("User ID:", user?.uid);
    console.log("Contracts loading:", contractsLoading);
    console.log("Contracts count:", contracts.length);
    console.log("Contracts:", contracts);
    console.log("User KYC Status:", userData?.kycStatus);
  }, [contracts, contractsLoading, user, userData]);

  // Separate contracts by status
  const pendingContracts = contracts.filter(c => c.status === "pending");
  const activeContracts = contracts.filter(c => isContractActive(c));
  const completedContracts = contracts.filter(c => c.status === "completed");
  const expiredContracts = contracts.filter(c => c.status === "expired");

  // Calculate totals
  const totalPrincipal = activeContracts.reduce((sum, c) => sum + c.donationAmount, 0);
  const totalWithdrawn = activeContracts.reduce((sum, c) => {
    const details = getWithdrawalDetails(c);
    return sum + details.totalWithdrawn;
  }, 0);
  
  // Use new pooled withdrawal calculation (includes MANA balance)
  const userBalance = userData?.balance || 0;
  const { 
    totalAmount: totalWithdrawable, 
    contractWithdrawals,
    manaBalance,
    eligibleContracts 
  } = calculateTotalWithdrawable(contracts, userBalance);
  const availableWithdrawalsCount = eligibleContracts.length;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/signin");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleQuickWithdrawClick = () => {
    if (totalWithdrawable <= 0) {
      toast.error("No withdrawable amount available yet.");
      return;
    }

    if (userData && isUserFullyVerified(userData)) {
      setIsExternalWithdrawOpen(true);
      return;
    }

    toast.error("Complete KYC verification to withdraw.");
  };

  const calculateTimeRemaining = (unlockDate: Date | string) => {
    const now = currentTime;
    const targetDate = unlockDate instanceof Date ? unlockDate : new Date(unlockDate);
    const diff = targetDate.getTime() - now.getTime();
    
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  };

  return (
    <div className="page-with-navbar bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 backdrop-blur-lg bg-background/80 border-b border-border"
      >
        <div className="max-w-7xl mx-auto flex items-start justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={koliLogo} alt="KOLI" className="w-8 h-8" />
            <div>
              <span className="font-bold text-lg text-gradient-gold">$KOLI</span>
              <p className="text-xs text-muted-foreground">Donation to the Kingdom</p>
            </div>
          </div>

          <HeaderWithdrawable onClick={handleQuickWithdrawClick} className="self-center" />
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
              Donation Contracts Center
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              1-year contracts with 12 monthly withdrawals. Principal never decreases, withdraw 30% every 30 days.
            </p>
          </motion.div>

          {/* KYC Disclaimer */}
          {userData && !isUserFullyVerified(userData) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card className="border-yellow-500/20 bg-yellow-500/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <IconAlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold text-yellow-500">KYC Verification Required</p>
                    <p className="text-xs text-muted-foreground">
                      {getKycDisclaimer(userData?.kycStatus || "NOT_SUBMITTED")}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10"
                      onClick={() => navigate("/kyc-submission")}
                    >
                      Complete KYC Verification
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ZONE 1: STATUS ZONE - Portfolio Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <IconWallet size={24} className="text-primary" />
              Portfolio Overview
            </h2>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border bg-gradient-to-br from-koli-gold/10 to-transparent">
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs">Total Principal</CardDescription>
                  <CardTitle className="text-3xl font-bold text-koli-gold">
                    {contractsLoading ? "..." : totalPrincipal.toLocaleString()} KOLI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Total donated (never decreases)
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border bg-gradient-to-br from-blue-500/10 to-transparent">
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs">Total Withdrawn</CardDescription>
                  <CardTitle className="text-3xl font-bold text-blue-400">
                    {contractsLoading ? "..." : totalWithdrawn.toLocaleString()} KOLI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Total withdrawn from all contracts
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border bg-gradient-to-br from-green-500/10 to-transparent">
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs">Available Now</CardDescription>
                  <CardTitle className="text-3xl font-bold text-green-400">
                    {contractsLoading ? "..." : totalWithdrawable.toLocaleString()} KOLI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Breakdown */}
                    {(contractWithdrawals > 0 || manaBalance > 0) && (
                      <div className="space-y-1 text-xs">
                        {contractWithdrawals > 0 && (
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Contracts:</span>
                            <span className="font-medium">{contractWithdrawals.toLocaleString()} KOLI</span>
                          </div>
                        )}
                        {manaBalance > 0 && (
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>MANA Rewards:</span>
                            <span className="font-medium text-yellow-500">{manaBalance.toLocaleString()} KOLI</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {availableWithdrawalsCount > 0 ? "Ready to withdraw" : "Total available"}
                      </p>
                      {availableWithdrawalsCount > 0 && (
                        <Badge variant="default" className="bg-green-500">
                          {availableWithdrawalsCount} ready
                        </Badge>
                      )}
                    </div>
                    {availableWithdrawalsCount > 0 && (
                      <>
                        {userData && isUserFullyVerified(userData) ? (
                          <Button
                            onClick={handleQuickWithdrawClick}
                            className="w-full bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <IconWallet className="w-4 h-4 mr-2" />
                            Withdraw Now
                          </Button>
                        ) : (
                          <div className="space-y-2">
                            <Button
                              disabled
                              className="w-full"
                              size="sm"
                              variant="outline"
                            >
                              <IconLock className="w-4 h-4 mr-2" />
                              KYC Required
                            </Button>
                            <p className="text-xs text-destructive text-center">
                              Complete KYC verification to withdraw
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contract Stats */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Contract Statistics</CardTitle>
                <CardDescription className="text-xs">Your donation contracts overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-orange-500">{pendingContracts.length}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{activeContracts.length}</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">{completedContracts.length}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-muted-foreground">{expiredContracts.length}</div>
                    <div className="text-xs text-muted-foreground">Expired</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ZONE 2: ACTION ZONE - Add New Donation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={() => setIsAddModalOpen(true)}
              size="lg"
              className="w-full md:w-auto"
            >
              <IconPlus size={20} className="mr-2" />
              Create New Donation Contract
            </Button>
          </motion.div>

          {/* ZONE 3: HISTORY ZONE - Contract List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <IconClock size={24} className="text-primary" />
              Donation Contracts
            </h2>

            {contractsLoading ? (
              <SkeletonList count={3} />
            ) : contracts.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="space-y-4">
                  <div className="text-6xl">📦</div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">No Contracts Yet</h3>
                    <p className="text-muted-foreground">
                      Start earning 30% returns every 30 days for 12 months. Create your first donation contract today!
                    </p>
                  </div>
                  <Button onClick={() => setIsAddModalOpen(true)} className="mt-4">
                    Create Your First Contract
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Pending Contracts */}
                {pendingContracts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wide flex items-center gap-2">
                      <IconBell size={16} />
                      Pending Admin Approval ({pendingContracts.length})
                    </h3>
                    {pendingContracts.map((contract, index) => (
                      <motion.div
                        key={contract.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="border-2 border-orange-500/50 bg-orange-500/5">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-2xl text-foreground">
                                    {contract.donationAmount.toLocaleString()} KOLI
                                  </h3>
                                  <Badge variant="outline" className="border-orange-500 text-orange-500">
                                    <IconHourglass size={12} className="mr-1" /> Pending
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Submitted: {new Date(contract.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30 mb-4">
                              <p className="text-sm text-orange-400 font-medium flex items-center gap-2">
                                <IconAlertCircle size={16} />
                                Awaiting admin approval. Contract will activate once approved.
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Once approved, your 1-year contract begins and first withdrawal unlocks after 30 days.
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 rounded-lg bg-secondary border border-border">
                                <p className="text-xs text-muted-foreground mb-1">Will Withdraw Per Period</p>
                                <p className="text-lg font-bold text-green-400">
                                  {Math.floor(contract.donationAmount * 0.3).toLocaleString()} KOLI
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-secondary border border-border">
                                <p className="text-xs text-muted-foreground mb-1">Max Total (12 times)</p>
                                <p className="text-lg font-bold text-primary">
                                  {Math.floor(contract.donationAmount * 0.3 * 12).toLocaleString()} KOLI
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Active Contracts */}
                {activeContracts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-green-500 uppercase tracking-wide flex items-center gap-2">
                      <IconCheck size={16} />
                      Active Contracts ({activeContracts.length})
                    </h3>
                    {activeContracts.map((contract, index) => {
                  const { canWithdraw: canWithdrawNow, reason, nextWithdrawalDate, availablePeriods = 0 } = canWithdraw(contract);
                  const details = getWithdrawalDetails(contract);
                  const daysUntil = getDaysUntilNextWithdrawal(contract);
                  const startDate = new Date(contract.donationStartDate);
                  const endDate = new Date(contract.contractEndDate);
                  const now = new Date();
                  
                  // Calculate available amount (can be multiple periods stacked)
                  const availableAmount = details.withdrawalPerPeriod * (availablePeriods > 0 ? availablePeriods : 1);
                  
                  // Calculate contract progress (0-100%)
                  const totalDuration = endDate.getTime() - startDate.getTime();
                  const elapsed = now.getTime() - startDate.getTime();
                  const progressPercentage = Math.min((elapsed / totalDuration) * 100, 100);

                  return (
                    <motion.div
                      key={contract.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className={`border-2 ${
                        canWithdrawNow 
                          ? "border-green-500/50 bg-green-500/5" 
                          : "border-primary/30 bg-primary/5"
                      }`}>
                        <CardContent className="p-5">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-2xl text-foreground">
                                  {contract.donationAmount.toLocaleString()} KOLI
                                </h3>
                                <Badge 
                                  variant={canWithdrawNow ? "default" : "outline"} 
                                  className={
                                    canWithdrawNow 
                                      ? "bg-green-500 text-white" 
                                      : "border-primary text-primary"
                                  }
                                >
                                  {canWithdrawNow ? (
                                    <><IconCircleCheck size={12} className="mr-1" /> Ready</>
                                  ) : (
                                    <><IconClock size={12} className="mr-1" /> Growing</>
                                  )}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Started: {startDate.toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Withdrawals</p>
                              <p className="text-lg font-bold text-foreground">
                                {details.withdrawalsUsed}/{12}
                              </p>
                            </div>
                          </div>

                          {/* Withdrawal Info */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="p-3 rounded-lg bg-secondary border border-border">
                              <p className="text-xs text-muted-foreground mb-1">Per Withdrawal</p>
                              <p className="text-lg font-bold text-green-400">
                                {details.withdrawalPerPeriod.toLocaleString()} KOLI
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">30% each time</p>
                            </div>
                            <div className="p-3 rounded-lg bg-secondary border border-border">
                              <p className="text-xs text-muted-foreground mb-1">Total Withdrawn</p>
                              <p className="text-lg font-bold text-blue-400">
                                {details.totalWithdrawn.toLocaleString()} KOLI
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Remaining: {details.totalRemaining.toLocaleString()} KOLI
                              </p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Contract Progress</span>
                              <span className="font-semibold text-foreground">
                                {Math.round(progressPercentage)}%
                              </span>
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{startDate.toLocaleDateString()}</span>
                              <span>{endDate.toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Status Message with Countdown Timer */}
                          <div className={`p-3 rounded-lg mb-4 ${
                            canWithdrawNow 
                              ? "bg-green-500/10 border border-green-500/30" 
                              : "bg-orange-500/10 border border-orange-500/30"
                          }`}>
                            {canWithdrawNow ? (
                              <div className="space-y-1">
                                <p className="text-sm font-medium flex items-center gap-2 text-green-400">
                                  <IconCircleCheck size={16} />
                                  Ready to withdraw {availableAmount.toLocaleString()} KOLI!
                                </p>
                                {availablePeriods > 1 && (
                                  <p className="text-xs text-muted-foreground">
                                    {availablePeriods} periods stacked ({details.withdrawalPerPeriod.toLocaleString()} KOLI × {availablePeriods})
                                  </p>
                                )}
                              </div>
                            ) : nextWithdrawalDate ? (
                              <div className="space-y-2">
                                <p className="text-sm font-medium flex items-center gap-2 text-orange-400">
                                  <IconAlertCircle size={16} />
                                  {reason}
                                </p>
                                {(() => {
                                  const timeLeft = calculateTimeRemaining(nextWithdrawalDate);
                                  if (timeLeft.days > 0 || timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0) {
                                    return (
                                      <div className="flex items-center justify-center gap-2 pt-2">
                                        <div className="text-center">
                                          <div className="text-2xl font-bold font-mono text-foreground">
                                            {String(timeLeft.days).padStart(2, "0")}
                                          </div>
                                          <div className="text-xs text-muted-foreground">days</div>
                                        </div>
                                        <span className="text-xl font-bold text-muted-foreground">:</span>
                                        <div className="text-center">
                                          <div className="text-2xl font-bold font-mono text-foreground">
                                            {String(timeLeft.hours).padStart(2, "0")}
                                          </div>
                                          <div className="text-xs text-muted-foreground">hours</div>
                                        </div>
                                        <span className="text-xl font-bold text-muted-foreground">:</span>
                                        <div className="text-center">
                                          <div className="text-2xl font-bold font-mono text-foreground">
                                            {String(timeLeft.minutes).padStart(2, "0")}
                                          </div>
                                          <div className="text-xs text-muted-foreground">mins</div>
                                        </div>
                                        <span className="text-xl font-bold text-muted-foreground">:</span>
                                        <div className="text-center">
                                          <div className="text-2xl font-bold font-mono text-foreground">
                                            {String(timeLeft.seconds).padStart(2, "0")}
                                          </div>
                                          <div className="text-xs text-muted-foreground">secs</div>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            ) : (
                              <p className="text-sm font-medium flex items-center gap-2 text-orange-400">
                                <IconAlertCircle size={16} />
                                {reason}
                              </p>
                            )}
                          </div>

                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
                  </div>
                )}
              </div>
            )}

            {/* Contract Terms Notice */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <IconLock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      Contract Terms
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Principal amount never decreases</li>
                      <li>• First withdrawal available after 30 days</li>
                      <li>• Withdraw 30% of original donation every 30 days</li>
                      <li>• Maximum 12 withdrawals over 1 year</li>
                      <li>• Contract expires after 1 year</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </main>

      {/* Add Donation Modal */}
      <AddDonationModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* External Withdraw Modal */}
      <ExternalWithdrawModal
        open={isExternalWithdrawOpen}
        onClose={() => setIsExternalWithdrawOpen(false)}
        withdrawableAmount={totalWithdrawable}
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
              index === 1 ? "text-primary" : "text-muted-foreground hover:text-foreground"
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

export default Donation;
