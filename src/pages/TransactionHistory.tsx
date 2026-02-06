import React, { useState } from "react";
import { motion } from "motion/react";
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
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeContracts } from "@/hooks/useRealtimeContracts";
import { useRealtimePayouts } from "@/hooks/useRealtimePayouts";

interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "reward";
  amount: number;
  status: string;
  date: Date;
  description: string;
  details?: any;
}

const TransactionHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");

  // Fetch data
  const { data: contracts, loading: contractsLoading } = useRealtimeContracts(user?.uid || null);
  const { data: payouts, loading: payoutsLoading } = useRealtimePayouts(user?.uid || null);

  // Combine all transactions
  const allTransactions: Transaction[] = React.useMemo(() => {
    const transactions: Transaction[] = [];

    // Add deposits (from contracts)
    contracts.forEach((contract) => {
      transactions.push({
        id: `deposit-${contract.id}`,
        type: "deposit",
        amount: contract.donationAmount,
        status: contract.status,
        date: new Date(contract.createdAt),
        description: `Donation Contract - ₱${contract.donationAmount.toLocaleString()}`,
        details: contract,
      });
    });

    // Add withdrawals (from payout_queue)
    payouts.forEach((payout) => {
      transactions.push({
        id: `withdrawal-${payout.id}`,
        type: "withdrawal",
        amount: payout.amount,
        status: payout.status,
        date: new Date(payout.requestedAt),
        description: `P2P Withdrawal ${payout.withdrawalNumber}/${payout.totalWithdrawals}`,
        details: payout,
      });
    });

    // Sort by date (newest first)
    return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [contracts, payouts]);

  // Filter transactions by type
  const filteredTransactions = React.useMemo(() => {
    if (activeTab === "all") return allTransactions;
    return allTransactions.filter((t) => t.type === activeTab);
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

  const getTypeColor = (type: string) => {
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

  const loading = contractsLoading || payoutsLoading;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg transition-colors hover:bg-secondary"
          >
            <IconArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-foreground">Transaction History</h1>
          <div className="w-8" /> {/* Spacer for alignment */}
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
                <p className="text-2xl font-bold text-foreground">0</p>
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

            <TabsContent value={activeTab} className="mt-6 space-y-3">
              {loading ? (
                <Card className="border-border">
                  <CardContent className="p-8 text-center">
                    <IconLoader className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading transactions...</p>
                  </CardContent>
                </Card>
              ) : filteredTransactions.length === 0 ? (
                <Card className="border-dashed border-2 border-muted">
                  <CardContent className="p-8 text-center">
                    <IconHistory className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                    <h3 className="text-base font-semibold text-foreground mb-1">
                      No transactions yet
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {activeTab === "all"
                        ? "Your transaction history will appear here"
                        : `No ${activeTab}s found`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredTransactions.map((transaction, index) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`border ${getTypeColor(transaction.type)}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className="flex-shrink-0 mt-1">
                            {getTypeIcon(transaction.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground text-sm truncate">
                                  {transaction.description}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {transaction.date.toLocaleDateString()} at{" "}
                                  {transaction.date.toLocaleTimeString()}
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                {getStatusBadge(transaction.type, transaction.status)}
                              </div>
                            </div>

                            <Separator className="my-2" />

                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground capitalize">
                                {transaction.type}
                              </p>
                              <p className={`text-lg font-bold ${
                                transaction.type === "withdrawal" ? "text-green-500" : "text-blue-500"
                              }`}>
                                {transaction.type === "withdrawal" ? "+" : ""}₱
                                {transaction.amount.toLocaleString()}
                              </p>
                            </div>

                            {/* Additional Details */}
                            {transaction.type === "deposit" && transaction.details?.receiptURL && (
                              <div className="mt-2 pt-2 border-t border-border">
                                <a
                                  href={transaction.details.receiptURL}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                  <IconReceipt size={12} />
                                  View Receipt
                                </a>
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
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default TransactionHistory;
