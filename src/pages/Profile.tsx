import React, { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  IconLogout,
  IconHome,
  IconGift,
  IconUser,
  IconShield,
  IconCheck,
  IconAlertCircle,
  IconWallet,
  IconArrowDown,
  IconArrowUp,
  IconLink,
  IconUsers,
  IconCopy,
  IconHistory,
  IconMoon,
  IconSun,
  IconKey,
  IconEdit,
  IconFileText,
  IconChevronRight,
  IconClock,
  IconHourglass,
} from "@tabler/icons-react";
import { Pickaxe } from "lucide-react";
import koliLogo from "@/assets/koli-logo.png";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeContracts } from "@/hooks/useRealtimeContracts";
import { getKycStatusDisplay, isUserFullyVerified } from "@/lib/kycService";
import {
  getWithdrawalDetails,
  isContractActive,
  canWithdraw,
  calculateTotalWithdrawable,
} from "@/lib/donationContract";
import { UnifiedWithdrawalModal } from "@/components/donation/UnifiedWithdrawalModal";
import { ExternalWithdrawModal } from "@/components/donation/ExternalWithdrawModal";

const Profile = () => {
  const navigate = useNavigate();
  const { userData, logout, user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isUnifiedWithdrawalOpen, setIsUnifiedWithdrawalOpen] = useState(false);
  const [isExternalWithdrawOpen, setIsExternalWithdrawOpen] = useState(false);
  
  // Fetch donation contracts
  const { data: contracts, loading: contractsLoading } = useRealtimeContracts(user?.uid || null);
  
  // Calculate contract stats
  const pendingContracts = contracts.filter(c => c.status === "pending");
  const activeContracts = contracts.filter(c => isContractActive(c));
  const completedContracts = contracts.filter(c => c.status === "completed");
  
  // Calculate donation totals
  const totalPrincipal = [...activeContracts, ...completedContracts].reduce((sum, c) => sum + c.donationAmount, 0);
  const totalWithdrawn = [...activeContracts, ...completedContracts].reduce((sum, c) => {
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
  const readyToWithdrawCount = eligibleContracts.length;
  
  const totalWithdrawalsUsed = [...activeContracts, ...completedContracts].reduce((sum, c) => sum + c.withdrawalsCount, 0);
  const totalWithdrawalsAvailable = activeContracts.length * 12;

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/signin");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleCopyReferralCode = () => {
    const refCode = userData?.referralCode || "KOLI-XXXXX";
    navigator.clipboard.writeText(refCode);
    toast.success("Referral code copied!", {
      description: "Share it with friends to earn rewards.",
    });
  };

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
    toast.info(isDarkMode ? "Light mode activated" : "Dark mode activated");
  };

  const handleWithdrawalSuccess = () => {
    // Refresh happens automatically via real-time listener
    setIsUnifiedWithdrawalOpen(false);
  };

  const getKYCBadge = () => {
    const status = userData?.kycStatus || "NOT_SUBMITTED";
    
    switch (status) {
      case "VERIFIED":
      case "APPROVED":
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <IconCheck className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <IconClock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <IconAlertCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "NOT_SUBMITTED":
        return (
          <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">
            <IconAlertCircle className="h-3 w-3 mr-1" />
            Not Submitted
          </Badge>
        );
      default:
        return null;
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
              <p className="text-xs text-muted-foreground">Profile</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg transition-colors hover:bg-secondary"
            aria-label="Logout"
            title="Logout"
          >
            <IconLogout size={20} className="text-muted-foreground" />
          </button>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-3"
          >
            <div className="flex justify-center">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-koli-gold to-koli-gold-dark flex items-center justify-center text-koli-navy text-3xl font-bold">
                {userData?.name?.charAt(0) || "K"}
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{userData?.name || "KOLI Member"}</h1>
              <p className="text-sm text-muted-foreground">{userData?.email || "member@koli.io"}</p>
            </div>
          </motion.div>

          {/* Zone 1: Identity & Security */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <IconShield className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Identity & Security</h2>
            </div>

            <Card className="border-border">
              <CardContent className="p-4 space-y-4">
                {/* KYC Status */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">KYC Verification Status</p>
                    <p className="text-xs text-muted-foreground">Identity verification required for withdrawals</p>
                  </div>
                  {getKYCBadge()}
                </div>

                <Separator />

                {/* Verification Portal */}
                <button
                  onClick={() => {
                    const status = userData?.kycStatus || "NOT_SUBMITTED";
                    if (status === "NOT_SUBMITTED") {
                      navigate("/kyc-submission");
                    } else {
                      const statusInfo = getKycStatusDisplay(status);
                      toast.info(statusInfo.label, {
                        description: statusInfo.description
                      });
                    }
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <IconFileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {userData?.kycStatus === "NOT_SUBMITTED" ? "Submit KYC" : "View KYC Status"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {userData?.kycStatus === "NOT_SUBMITTED" 
                          ? "Upload ID and complete verification"
                          : "View your verification details"}
                      </p>
                    </div>
                  </div>
                  <IconChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>

                <Separator />

                {/* Show KYC Details if submitted */}
                {userData?.kycStatus !== "NOT_SUBMITTED" && userData?.kycAutoCaptured && (
                  <>
                    <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Auto-Captured Data (Read-Only)</p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Full Legal Name</span>
                          <span className="text-xs font-medium">{userData.kycAutoCaptured.fullLegalName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Date of Birth</span>
                          <span className="text-xs font-medium">{userData.kycAutoCaptured.dateOfBirth}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">ID Number</span>
                          <span className="text-xs font-medium">{userData.kycAutoCaptured.idNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Nationality</span>
                          <span className="text-xs font-medium">{userData.kycAutoCaptured.nationality}</span>
                        </div>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* PIN Management */}
                <button
                  onClick={() => toast.info("PIN management coming soon")}
                  className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-koli-gold/10 flex items-center justify-center">
                      <IconKey className="h-5 w-5 text-koli-gold" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Change PIN</p>
                      <p className="text-xs text-muted-foreground">Update your 6-digit security PIN</p>
                    </div>
                  </div>
                  <IconChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Zone 2: Donation Contracts Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <IconGift className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Donation Contracts</h2>
            </div>

            {/* Pending Contracts Alert */}
            {pendingContracts.length > 0 && (
              <Card className="border-orange-500/50 bg-orange-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                      <IconAlertCircle className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground mb-1">
                        {pendingContracts.length} Contract{pendingContracts.length > 1 ? 's' : ''} Pending Approval
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Total: ₱{pendingContracts.reduce((sum, c) => sum + c.donationAmount, 0).toLocaleString()} awaiting admin approval
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                        onClick={() => navigate('/donation')}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contract Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border bg-gradient-to-br from-koli-gold/10 to-transparent">
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs">Total Principal</CardDescription>
                  <CardTitle className="text-2xl font-bold text-koli-gold">
                    ₱{contractsLoading ? "..." : totalPrincipal.toLocaleString()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{activeContracts.length + completedContracts.length} contracts</p>
                </CardContent>
              </Card>

              <Card className="border-border bg-gradient-to-br from-blue-500/10 to-transparent">
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs">Total Withdrawn</CardDescription>
                  <CardTitle className="text-2xl font-bold text-blue-400">
                    ₱{contractsLoading ? "..." : totalWithdrawn.toLocaleString()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{totalWithdrawalsUsed} withdrawals made</p>
                </CardContent>
              </Card>

              <Card className="border-border bg-gradient-to-br from-green-500/10 to-transparent">
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs">Available Now</CardDescription>
                  <CardTitle className="text-2xl font-bold text-green-400">
                    ₱{contractsLoading ? "..." : totalWithdrawable.toLocaleString()}
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
                            <span className="font-medium">₱{contractWithdrawals.toLocaleString()}</span>
                          </div>
                        )}
                        {manaBalance > 0 && (
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>MANA Rewards:</span>
                            <span className="font-medium text-yellow-500">₱{manaBalance.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {readyToWithdrawCount > 0 ? "Ready to withdraw" : "Total available"}
                      </p>
                      {readyToWithdrawCount > 0 && (
                        <Badge className="bg-green-500">
                          {readyToWithdrawCount}
                        </Badge>
                      )}
                    </div>
                    {readyToWithdrawCount > 0 && (
                      <Button
                        onClick={() => setIsExternalWithdrawOpen(true)}
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <IconWallet className="w-4 h-4 mr-2" />
                        Withdraw Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contract Progress */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Contract Progress</CardTitle>
                <CardDescription className="text-xs">Withdrawal opportunities across all contracts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Withdrawals Used</span>
                    <span className="font-semibold text-foreground">
                      {totalWithdrawalsUsed} / {totalWithdrawalsAvailable || 0}
                    </span>
                  </div>
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                      style={{
                        width: `${totalWithdrawalsAvailable > 0 ? (totalWithdrawalsUsed / totalWithdrawalsAvailable) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">{activeContracts.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Active</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-green-500">{completedContracts.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unified Withdrawal Info */}
            {readyToWithdrawCount > 0 && (
              <Card className="border-green-500/50 bg-green-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <IconWallet className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-semibold text-foreground">
                        Unified Withdrawal Available
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Withdraw from {readyToWithdrawCount} contract{readyToWithdrawCount > 1 ? 's' : ''} at once. 
                        Choose your amount or withdraw all ₱{totalWithdrawable.toLocaleString()} in one transaction.
                        {manaBalance > 0 && ` Includes ₱${manaBalance.toLocaleString()} from MANA rewards.`}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="outline" className="text-xs">
                          <IconCheck className="w-3 h-3 mr-1" />
                          Custom Amounts
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <IconShield className="w-3 h-3 mr-1" />
                          PIN Protected
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => navigate("/donation")}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold"
                size="lg"
              >
                <IconGift className="h-5 w-5 mr-2" />
                View Contracts
              </Button>

              {readyToWithdrawCount > 0 ? (
                <Button
                  onClick={() => setIsExternalWithdrawOpen(true)}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold relative"
                  size="lg"
                >
                  <IconArrowUp className="h-5 w-5 mr-2" />
                  Withdraw Now
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white">
                    {readyToWithdrawCount}
                  </Badge>
                </Button>
              ) : (
                <Button
                  onClick={() => navigate("/donation")}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <IconClock className="h-5 w-5 mr-2" />
                  No Withdrawals
                </Button>
              )}
            </div>

            {/* Quick Access Cards */}
            <Card className="border-border">
              <CardContent className="p-4 space-y-2">
                <button
                  onClick={() => navigate("/donation")}
                  className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <IconGift className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Manage Contracts</p>
                      <p className="text-xs text-muted-foreground">
                        {activeContracts.length} active · {pendingContracts.length} pending
                      </p>
                    </div>
                  </div>
                  <IconChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
                
                <Separator />
                
                <button
                  onClick={() => navigate("/linked-accounts")}
                  className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <IconLink className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Linked Accounts</p>
                      <p className="text-xs text-muted-foreground">Manage E-Wallets & Bank Accounts</p>
                    </div>
                  </div>
                  <IconChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Zone 3: Community & Growth */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <IconUsers className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Community & Growth</h2>
            </div>

            {/* Referral Dashboard */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">Referral Dashboard</CardTitle>
                <CardDescription>Invite friends and earn rewards</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Referral Code */}
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <p className="text-xs text-muted-foreground">Your Invite Code</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-2xl font-bold font-mono text-koli-gold">{userData?.referralCode || "KOLI-XXXXX"}</p>
                    <Button
                      onClick={handleCopyReferralCode}
                      variant="outline"
                      size="sm"
                      className="border-primary/50"
                    >
                      <IconCopy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Total Referrals */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <IconUsers className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Referrals</p>
                      <p className="text-2xl font-bold text-foreground">{userData?.totalReferrals || 0}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Donors</p>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Ledger */}
            <Card className="border-border">
              <CardContent className="p-4">
                <button
                  onClick={() => navigate("/transaction-history")}
                  className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <IconHistory className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Transaction Ledger</p>
                      <p className="text-xs text-muted-foreground">View all deposits, rewards, and withdrawals</p>
                    </div>
                  </div>
                  <IconChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Zone 4: App Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <IconEdit className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">App Preferences</h2>
            </div>

            <Card className="border-border">
              <CardContent className="p-4 space-y-4">
                {/* Theme Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {isDarkMode ? (
                      <IconMoon className="h-5 w-5 text-primary" />
                    ) : (
                      <IconSun className="h-5 w-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">Theme</p>
                      <p className="text-xs text-muted-foreground">
                        {isDarkMode ? "Dark Mode" : "Light Mode"}
                      </p>
                    </div>
                  </div>
                  <Switch checked={isDarkMode} onCheckedChange={handleThemeToggle} />
                </div>

                <Separator />

                {/* Platform Code Info */}
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-xs text-muted-foreground">Community Access Code</p>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold font-mono text-foreground">{userData?.platformCode || "N/A"}</p>
                    <Badge variant="outline" className="text-xs">
                      Active
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Logout */}
                <Button
                  onClick={handleLogout}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  <IconLogout className="h-5 w-5 mr-2" />
                  Logout
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      {/* Unified Withdrawal Modal */}
      <UnifiedWithdrawalModal
        open={isUnifiedWithdrawalOpen}
        onClose={() => setIsUnifiedWithdrawalOpen(false)}
        contracts={contracts}
        userData={userData}
        userId={user?.uid || ""}
        onWithdrawSuccess={handleWithdrawalSuccess}
      />

      {/* External Withdraw Modal */}
      <ExternalWithdrawModal
        open={isExternalWithdrawOpen}
        onClose={() => setIsExternalWithdrawOpen(false)}
        withdrawableAmount={totalWithdrawable}
        onLocalWithdraw={() => {
          setIsExternalWithdrawOpen(false);
          setIsUnifiedWithdrawalOpen(true);
        }}
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
              index === 3 ? "text-primary" : "text-muted-foreground hover:text-foreground"
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

export default Profile;
