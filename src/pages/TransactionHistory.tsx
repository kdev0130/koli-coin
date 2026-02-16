import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  IconArrowLeft,
  IconHistory,
  IconWallet,
  IconGift,
  IconTrendingUp,
  IconCircleCheck,
  IconHourglass,
  IconAlertCircle,
  IconLoader,
  IconReceipt,
  IconClock,
  IconFilter,
  IconRefresh,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SkeletonList } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { storage } from "@/lib/firebase";
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeContracts } from "@/hooks/useRealtimeContracts";
import { useRealtimePayouts } from "@/hooks/useRealtimePayouts";
import { useRealtimeRewardsHistory } from "@/hooks/useRealtimeRewardsHistory";
import { HeaderWithdrawable } from "@/components/common/HeaderWithdrawable";

interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "reward";
  amount: number;
  status: string;
  date: Date;
  description: string;
  details?: any;
}

interface GroupedWithdrawal {
  id: string;
  type: "withdrawal-group";
  contractId?: string;
  withdrawalType: "contract" | "mana";
  amount: number;
  count: number;
  status: string;
  date: Date;
  description: string;
  withdrawals: Transaction[];
}

const TransactionHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [selectedReceiptPath, setSelectedReceiptPath] = useState<string | null>(null);
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  // Fetch data
  const { data: contracts, loading: contractsLoading } = useRealtimeContracts(user?.uid || null);
  const { data: payouts, loading: payoutsLoading } = useRealtimePayouts(user?.uid || null);
  const { data: rewards, loading: rewardsLoading } = useRealtimeRewardsHistory(user?.uid || null);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Combine all transactions and group withdrawals
  const allTransactions: (Transaction | GroupedWithdrawal)[] = React.useMemo(() => {
    const transactions: Transaction[] = [];

    // Add deposits (from contracts)
    contracts.forEach((contract) => {
      transactions.push({
        id: `deposit-${contract.id}`,
        type: "deposit",
        amount: contract.donationAmount,
        status: contract.status,
        date: new Date(contract.createdAt),
        description: `Donation Contract - ${contract.donationAmount.toLocaleString()} KOLI`,
        details: contract,
      });
    });

    // Add withdrawals (from payout_queue)
    const withdrawalTransactions: Transaction[] = [];
    payouts.forEach((payout) => {
      withdrawalTransactions.push({
        id: `withdrawal-${payout.id}`,
        type: "withdrawal",
        amount: payout.amount,
        status: payout.status,
        date: new Date(payout.requestedAt),
        description: payout.withdrawalType === "MANA_REWARDS" 
          ? "MANA Rewards"
          : `Withdrawal ${payout.withdrawalNumber}/${payout.totalWithdrawals}`,
        details: payout,
      });
    });

    // Add rewards (from rewardsHistory)
    rewards.forEach((reward) => {
      const claimedAt = reward.claimedAt;
      const date =
        typeof claimedAt?.toDate === "function"
          ? claimedAt.toDate()
          : typeof claimedAt?.seconds === "number"
            ? new Date(claimedAt.seconds * 1000)
            : reward.claimedDate
              ? new Date(reward.claimedDate)
              : new Date();

      transactions.push({
        id: `reward-${reward.id}`,
        type: "reward",
        amount: reward.amount,
        status: "completed",
        date,
        description: "MANA Reward Claimed",
        details: reward,
      });
    });

    // Group withdrawals by contract or type
    const withdrawalGroups = new Map<string, Transaction[]>();
    withdrawalTransactions.forEach((withdrawal) => {
      const contractId = withdrawal.details?.contractId || "mana-rewards";
      if (!withdrawalGroups.has(contractId)) {
        withdrawalGroups.set(contractId, []);
      }
      withdrawalGroups.get(contractId)!.push(withdrawal);
    });

    // Create grouped withdrawals
    const groupedWithdrawals: GroupedWithdrawal[] = [];
    withdrawalGroups.forEach((withdrawals, key) => {
      if (withdrawals.length > 1) {
        // Multiple withdrawals from same source - group them
        const totalAmount = withdrawals.reduce((sum, w) => sum + w.amount, 0);
        const latestDate = new Date(Math.max(...withdrawals.map(w => w.date.getTime())));
        const allCompleted = withdrawals.every(w => w.status === "completed");
        const anyPending = withdrawals.some(w => w.status === "pending");
        const status = allCompleted ? "completed" : anyPending ? "pending" : withdrawals[0].status;
        
        const isMANA = key === "mana-rewards";
        groupedWithdrawals.push({
          id: `group-${key}`,
          type: "withdrawal-group",
          contractId: isMANA ? undefined : key,
          withdrawalType: isMANA ? "mana" : "contract",
          amount: totalAmount,
          count: withdrawals.length,
          status,
          date: latestDate,
          description: isMANA 
            ? `MANA Rewards (${withdrawals.length} withdrawals)`
            : `Pooled Withdrawal (${withdrawals.length} transactions)`,
          withdrawals: withdrawals.sort((a, b) => b.date.getTime() - a.date.getTime()),
        });
      } else {
        // Single withdrawal - add as regular transaction
        transactions.push(withdrawals[0]);
      }
    });

    // Combine and sort by date
    return [...transactions, ...groupedWithdrawals].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [contracts, payouts, rewards]);

  // Filter transactions by type
  const filteredTransactions = React.useMemo(() => {
    if (activeTab === "all") return allTransactions;
    return allTransactions.filter((t) => {
      if (t.type === "withdrawal-group") {
        return activeTab === "withdrawal";
      }
      return t.type === activeTab;
    });
  }, [allTransactions, activeTab]);

  const getStatusBadge = (type: string, status: string) => {
    if (type === "deposit") {
      switch (status) {
        case "active":
        case "approved":
          return (
            <Badge className="bg-green-500 text-white">
              <IconCircleCheck size={12} className="mr-1" /> Active
            </Badge>
          );
        case "pending":
          return (
            <Badge className="bg-orange-500 text-white">
              <IconHourglass size={12} className="mr-1" /> Pending
            </Badge>
          );
        case "completed":
          return (
            <Badge className="bg-blue-500 text-white">
              <IconCircleCheck size={12} className="mr-1" /> Completed
            </Badge>
          );
        case "rejected":
          return (
            <Badge className="bg-red-500 text-white">
              <IconAlertCircle size={12} className="mr-1" /> Rejected
            </Badge>
          );
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    }

    if (type === "withdrawal") {
      switch (status) {
        case "completed":
          return (
            <Badge className="bg-green-500 text-white">
              <IconCircleCheck size={12} className="mr-1" /> Completed
            </Badge>
          );
        case "processing":
          return (
            <Badge className="bg-blue-500 text-white">
              <IconLoader size={12} className="mr-1" /> Processing
            </Badge>
          );
        case "failed":
          return (
            <Badge variant="destructive">
              <IconAlertCircle size={12} className="mr-1" /> Failed
            </Badge>
          );
        case "pending":
        default:
          return (
            <Badge className="bg-orange-500 text-white">
              <IconHourglass size={12} className="mr-1" /> Pending
            </Badge>
          );
      }
    }

    if (type === "reward") {
      return (
        <Badge className="bg-yellow-500 text-black">
          <IconCircleCheck size={12} className="mr-1" /> Completed
        </Badge>
      );
    }

    return <Badge variant="outline">{status}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <IconGift className="h-5 w-5 text-blue-500" />;
      case "withdrawal":
        return <IconWallet className="h-5 w-5 text-green-500" />;
      case "reward":
        return <IconTrendingUp className="h-5 w-5 text-yellow-500" />;
      default:
        return <IconHistory className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTypeColor = (type: string, status?: string) => {
    if (type === "deposit" && status === "rejected") {
      return "border-red-500/40 bg-red-500/5";
    }

    switch (type) {
      case "deposit":
        return "border-blue-500/30 bg-blue-500/5";
      case "withdrawal":
        return "border-green-500/30 bg-green-500/5";
      case "reward":
        return "border-yellow-500/30 bg-yellow-500/5";
      default:
        return "border-border";
    }
  };

  const loading = contractsLoading || payoutsLoading || rewardsLoading;

  const openReceiptModal = async (url?: string, path?: string) => {
    setSelectedReceiptUrl(null);
    setSelectedReceiptPath(path || null);
    setReceiptError(null);
    setIsReceiptOpen(true);
    setIsReceiptLoading(true);

    try {
      let resolvedUrl = url || "";

      if (path) {
        resolvedUrl = await getDownloadURL(storageRef(storage, path));
      }

      if (!resolvedUrl) {
        throw new Error("Receipt URL is missing");
      }

      setSelectedReceiptUrl(resolvedUrl);
    } catch (error) {
      console.error("Failed to resolve receipt image:", error);
      if (url) {
        setSelectedReceiptUrl(url);
        setReceiptError("Could not generate secure image URL from path. Showing fallback URL.");
      } else {
        setReceiptError("Unable to load receipt preview. Please try again later.");
      }
    } finally {
      setIsReceiptLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border">
        <div className="max-w-3xl mx-auto grid grid-cols-[40px_1fr_88px] items-center gap-2 px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 p-2 rounded-lg transition-colors hover:bg-secondary"
          >
            <IconArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-foreground text-center truncate">Transaction History</h1>
          <div className="flex justify-end">
            <HeaderWithdrawable />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-6">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="p-3 text-center">
                <IconGift className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {contracts.length}
                </p>
                <p className="text-xs text-muted-foreground">Deposits</p>
              </CardContent>
            </Card>
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-3 text-center">
                <IconWallet className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {payouts.length}
                </p>
                <p className="text-xs text-muted-foreground">Withdrawals</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="p-3 text-center">
                <IconTrendingUp className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{rewards.length}</p>
                <p className="text-xs text-muted-foreground">Rewards</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="deposit">Deposits</TabsTrigger>
              <TabsTrigger value="withdrawal">Withdrawals</TabsTrigger>
              <TabsTrigger value="reward">Rewards</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {loading ? (
                <SkeletonList count={5} />
              ) : filteredTransactions.length === 0 ? (
                <Card className="p-8 text-center">
                  <div className="space-y-4">
                    <div className="text-6xl">{activeTab === "deposit" ? "📦" : activeTab === "withdrawal" ? "💰" : "🎁"}</div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">No {activeTab === "all" ? "Transactions" : `${activeTab}s`} Yet</h3>
                      <p className="text-muted-foreground">
                        {activeTab === "all"
                          ? "Your transaction history will appear here"
                          : `No ${activeTab}s found`}
                      </p>
                    </div>
                  </div>
                </Card>
              ) : (
                <ScrollArea className="h-[calc(100vh-260px)] md:h-[600px] w-full pr-1 md:pr-4">
                  <div className="space-y-3">
                    {/* Timeline View */}
                    {filteredTransactions.map((transaction, index) => {
                      const isGroup = transaction.type === "withdrawal-group";
                      const isExpanded = isGroup && expandedGroups.has(transaction.id);
                      
                      return (
                        <motion.div
                          key={transaction.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          {/* Group Header or Single Transaction */}
                          <Card 
                            className={`border ${getTypeColor(isGroup ? "withdrawal" : transaction.type, transaction.status)} ${
                              isGroup ? "cursor-pointer hover:shadow-md transition-shadow" : ""
                            }`}
                            onClick={isGroup ? () => toggleGroup(transaction.id) : undefined}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3 sm:gap-4">
                                {/* Timeline Dot */}
                                <div className="relative">
                                  <div className="flex-shrink-0 mt-1">
                                    {getTypeIcon(isGroup ? "withdrawal" : transaction.type)}
                                  </div>
                                  {index < filteredTransactions.length - 1 && (
                                    <div className="absolute left-1/2 top-8 bottom-0 w-0.5 bg-border -ml-px" />
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold text-foreground text-sm break-words leading-snug">
                                        {transaction.description}
                                      </p>
                                      {isGroup && (
                                        <Badge variant="secondary" className="text-xs">
                                          {transaction.count}x
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 self-start">
                                      {getStatusBadge(isGroup ? "withdrawal" : transaction.type, transaction.status)}
                                      {isGroup && (
                                        <div className="text-muted-foreground">
                                          {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <p className="text-xs text-muted-foreground">
                                    {(() => {
                                      const date = transaction.date;
                                      const now = new Date();
                                      const diffMs = now.getTime() - date.getTime();
                                      const diffMins = Math.floor(diffMs / 60000);
                                      const diffHours = Math.floor(diffMs / 3600000);
                                      const diffDays = Math.floor(diffMs / 86400000);
                                      
                                      if (diffMins < 1) return "Just now";
                                      if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
                                      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
                                      if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
                                      return date.toLocaleDateString();
                                    })()}
                                  </p>

                                  <Separator className="my-2" />

                                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {isGroup ? "Withdrawal Group" : transaction.type}
                                    </p>
                                    <p className={`text-lg font-bold ${
                                      transaction.type === "deposit" && transaction.status === "rejected"
                                        ? "text-red-400"
                                        :
                                      isGroup || transaction.type === "withdrawal"
                                        ? "text-green-500"
                                        : transaction.type === "reward"
                                          ? "text-yellow-500"
                                          : "text-blue-500"
                                    }`}>
                                      {isGroup || transaction.type === "withdrawal" || transaction.type === "reward"
                                        ? "+"
                                        : transaction.type === "deposit" && transaction.status === "rejected"
                                          ? ""
                                          : ""}
                                      {transaction.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KOLI
                                    </p>
                                  </div>

                                  {/* Additional Details for non-grouped transactions */}
                                  {!isGroup && (
                                    <>
                                      {transaction.type === "deposit" && transaction.details?.receiptURL && (
                                        <div className="mt-2 pt-2 border-t border-border">
                                          <button
                                            type="button"
                                            onClick={() => openReceiptModal(transaction.details.receiptURL, transaction.details.receiptPath)}
                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                          >
                                            <IconReceipt size={12} />
                                            View Receipt
                                          </button>
                                        </div>
                                      )}

                                      {transaction.type === "deposit" &&
                                        transaction.status === "rejected" &&
                                        transaction.details?.rejectionReason && (
                                          <div className="mt-2 pt-2 border-t border-red-500/30">
                                            <p className="text-xs text-red-400 flex items-start gap-1">
                                              <IconAlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                                              <span>
                                                Rejection reason: <span className="font-medium">{transaction.details.rejectionReason}</span>
                                              </span>
                                            </p>
                                          </div>
                                        )}

                                      {transaction.type === "withdrawal" &&
                                        transaction.status === "pending" && (
                                          <div className="mt-2 pt-2 border-t border-orange-500/30">
                                            <p className="text-xs text-orange-400 flex items-center gap-1">
                                              <IconClock size={12} />
                                              Processing within 24 hours
                                            </p>
                                          </div>
                                        )}

                                      {transaction.type === "withdrawal" &&
                                        transaction.status === "completed" &&
                                        transaction.details?.processedAt && (
                                          <div className="mt-2 pt-2 border-t border-green-500/30">
                                            <p className="text-xs text-green-400 flex items-center gap-1">
                                              <IconCircleCheck size={12} />
                                              Completed on{" "}
                                              {new Date(transaction.details.processedAt).toLocaleDateString()}
                                            </p>
                                          </div>
                                        )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Expanded Group Details */}
                          <AnimatePresence>
                            {isGroup && isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="ml-12 mt-2 space-y-2"
                              >
                                {(transaction as GroupedWithdrawal).withdrawals.map((withdrawal, wIndex) => (
                                  <Card key={withdrawal.id} className="border-l-4 border-l-green-500/50">
                                    <CardContent className="p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium">{withdrawal.description}</p>
                                        {getStatusBadge("withdrawal", withdrawal.status)}
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">
                                          {withdrawal.date.toLocaleString()}
                                        </span>
                                        <span className="font-bold text-green-500">
                                          +{withdrawal.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KOLI
                                        </span>
                                      </div>
                                      
                                      {withdrawal.status === "pending" && (
                                        <div className="mt-2 pt-2 border-t border-orange-500/30">
                                          <p className="text-xs text-orange-400 flex items-center gap-1">
                                            <IconClock size={12} />
                                            Processing within 24 hours
                                          </p>
                                        </div>
                                      )}
                                      
                                      {withdrawal.status === "completed" && withdrawal.details?.processedAt && (
                                        <div className="mt-2 pt-2 border-t border-green-500/30">
                                          <p className="text-xs text-green-400 flex items-center gap-1">
                                            <IconCircleCheck size={12} />
                                            Completed on {new Date(withdrawal.details.processedAt).toLocaleDateString()}
                                          </p>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt Preview</DialogTitle>
            <DialogDescription>
              Uploaded deposit receipt image.
            </DialogDescription>
          </DialogHeader>

          {isReceiptLoading ? (
            <div className="rounded-lg border border-border p-8 text-center">
              <IconLoader className="h-5 w-5 mx-auto mb-2 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading receipt preview...</p>
            </div>
          ) : selectedReceiptUrl ? (
            <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
              <img
                src={selectedReceiptUrl}
                alt="Deposit receipt"
                className="w-full h-auto max-h-[70vh] object-contain"
                onError={async () => {
                  if (!selectedReceiptPath || selectedReceiptUrl.includes("token=")) {
                    setReceiptError("Receipt image failed to load.");
                    return;
                  }

                  try {
                    const fallbackUrl = await getDownloadURL(storageRef(storage, selectedReceiptPath));
                    setSelectedReceiptUrl(fallbackUrl);
                    setReceiptError(null);
                  } catch {
                    setReceiptError("Receipt image failed to load.");
                  }
                }}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No receipt image found.</p>
          )}

          {receiptError && (
            <p className="text-xs text-orange-400">{receiptError}</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionHistory;
