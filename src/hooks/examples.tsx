// Example: Real-time usage in a component

import { useRealtimeCollection } from "@/hooks/useRealtimeCollection";
import { useRealtimeDocument } from "@/hooks/useRealtimeDocument";
import { where, orderBy, limit } from "firebase/firestore";

// Example 1: Listen to all members (for admin)
export function MembersListExample() {
  const { data: members, loading, error } = useRealtimeCollection("members");
  
  if (loading) return <div>Loading members...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {members.map((member: any) => (
        <div key={member.id}>{member.name}</div>
      ))}
    </div>
  );
}

// Example 2: Listen to user's withdrawals
export function UserWithdrawalsExample({ userId }: { userId: string }) {
  const { data: withdrawals, loading } = useRealtimeCollection(
    "withdrawals",
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(10)
  );
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {withdrawals.map((withdrawal: any) => (
        <div key={withdrawal.id}>
          Amount: ${withdrawal.amount} - Status: {withdrawal.status}
        </div>
      ))}
    </div>
  );
}

// Example 3: Listen to a specific document
export function UserProfileExample({ userId }: { userId: string }) {
  const { data: userProfile, loading } = useRealtimeDocument("members", userId);
  
  if (loading) return <div>Loading profile...</div>;
  if (!userProfile) return <div>User not found</div>;
  
  return (
    <div>
      <h1>{userProfile.name}</h1>
      <p>Balance: ${userProfile.balance}</p>
      <p>Total Invested: ${userProfile.totalInvested}</p>
    </div>
  );
}
