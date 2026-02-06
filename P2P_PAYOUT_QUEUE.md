# P2P Payout Queue - Admin Reference

## Collection: `payout_queue`

### Purpose
This collection stores all user withdrawal requests that require manual processing by administrators. Each document represents a P2P (peer-to-peer) payout request.

---

## Document Structure

```typescript
interface PayoutQueueDocument {
  // User Identification
  userId: string;                    // Firebase UID
  userFullName: string;              // User's legal name
  userPhoneNumber: string;           // 11-digit PH number (09xxxxxxxxx)
  userEmail: string;                 // User's email
  
  // Transaction Details
  amount: number;                    // Amount to send (always 30% of principal)
  contractId: string;                // Reference to donationContracts doc
  contractPrincipal: number;         // Original donation amount
  withdrawalNumber: number;          // Current withdrawal (1-12)
  totalWithdrawals: number;          // Always 12
  
  // Status Tracking
  status: "pending" | "processing" | "completed" | "failed";
  requestedAt: string;               // ISO timestamp when user requested
  processedAt: string | null;        // ISO timestamp when admin processed
  processedBy: string | null;        // Admin user ID who processed
  
  // Additional Info
  notes: string;                     // Context/description
  createdAt: Timestamp;              // Firestore server timestamp
}
```

---

## Example Document

```json
{
  "userId": "abc123xyz789",
  "userFullName": "Juan Dela Cruz",
  "userPhoneNumber": "09171234567",
  "userEmail": "juan.delacruz@example.com",
  
  "amount": 900,
  "contractId": "contract_xyz123",
  "contractPrincipal": 3000,
  "withdrawalNumber": 5,
  "totalWithdrawals": 12,
  
  "status": "pending",
  "requestedAt": "2026-02-04T10:30:00.000Z",
  "processedAt": null,
  "processedBy": null,
  
  "notes": "P2P Withdrawal 5/12 from contract contract_xyz123",
  "createdAt": Timestamp { seconds: 1738665000, nanoseconds: 0 }
}
```

---

## Status Workflow

### 1. `pending` (Initial State)
- Created when user submits withdrawal request
- Waiting for admin to process
- **Admin Action**: Review and verify request

### 2. `processing` (Optional)
- Admin has started working on the payout
- **Admin Action**: Sending funds via E-wallet/Bank

### 3. `completed` (Success)
- Funds successfully sent to user
- `processedAt` and `processedBy` fields populated
- **Admin Action**: Update user balance in `members` collection

### 4. `failed` (Error)
- Payment failed or was rejected
- Should include failure reason in `notes`
- **Admin Action**: Contact user or retry

---

## Admin Dashboard Queries

### Get All Pending Payouts
```typescript
const pendingPayouts = await getDocs(
  query(
    collection(db, "payout_queue"),
    where("status", "==", "pending"),
    orderBy("requestedAt", "asc")
  )
);
```

### Get Payouts for Today
```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);

const todayPayouts = await getDocs(
  query(
    collection(db, "payout_queue"),
    where("requestedAt", ">=", today.toISOString()),
    orderBy("requestedAt", "desc")
  )
);
```

### Get User's Payout History
```typescript
const userPayouts = await getDocs(
  query(
    collection(db, "payout_queue"),
    where("userId", "==", userId),
    orderBy("requestedAt", "desc")
  )
);
```

---

## Admin Processing Steps

### Step 1: Verify Request
1. Check `status` is "pending"
2. Verify `userId` exists in `members` collection
3. Confirm `contractId` exists and is active
4. Validate `amount` matches 30% calculation
5. Ensure user's KYC is verified

### Step 2: Send Funds
1. Open user's registered E-wallet/Bank details from `members` collection
2. Send the `amount` to `userPhoneNumber` (for E-wallet) or bank account
3. Record transaction reference/confirmation number

### Step 3: Update Database

#### Update Payout Queue
```typescript
await updateDoc(doc(db, "payout_queue", payoutId), {
  status: "completed",
  processedAt: new Date().toISOString(),
  processedBy: adminUserId,
  notes: "Sent via GCash - Ref: ABC123XYZ",
});
```

#### Update User Balance (Optional - if you track this)
```typescript
const userRef = doc(db, "members", userId);
const userSnap = await getDoc(userRef);
const currentBalance = userSnap.data().balance || 0;

await updateDoc(userRef, {
  balance: currentBalance + amount,
});
```

#### DO NOT Update Contract
The user-side code already updated:
- `withdrawalsCount`
- `lastWithdrawalDate`
- `status` (if 12th withdrawal)

---

## Error Handling

### If Payment Fails:
```typescript
await updateDoc(doc(db, "payout_queue", payoutId), {
  status: "failed",
  processedAt: new Date().toISOString(),
  processedBy: adminUserId,
  notes: "E-wallet account not found. User notified to update details.",
});
```

### If User Account Invalid:
1. Mark payout as "failed"
2. Contact user to update E-wallet/bank details
3. Do NOT increment withdrawal count (already done)
4. User can request again once details are updated

---

## Important Notes

### ⚠️ Critical Rules:
1. **Never modify the contract principal** - It stays at original amount forever
2. **Amount is always 30%** - Calculated from original donation, not current balance
3. **Maximum 12 withdrawals** - System prevents 13th withdrawal
4. **Manual verification required** - Always double-check before sending funds
5. **Use correct phone number format** - Must be 11-digit PH (09xxxxxxxxx)

### 📊 Calculation Example:
```
Contract Principal: ₱3,000
Withdrawal Amount: ₱3,000 × 0.30 = ₱900
After 12 Withdrawals: ₱900 × 12 = ₱10,800 (total received)
Principal Remains: ₱3,000 (never changes)
```

---

## Dashboard Metrics

### Recommended KPIs to Display:
1. **Pending Requests** - Count of status="pending"
2. **Total Amount Pending** - Sum of amount where status="pending"
3. **Processed Today** - Count where processedAt is today
4. **Average Processing Time** - Difference between requestedAt and processedAt
5. **Failed Payouts** - Count where status="failed"

---

## Security Considerations

### Admin Permissions:
- Only authorized admins can view `payout_queue`
- Use Firestore Security Rules to restrict access
- Log all admin actions for audit trail

### Example Security Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /payout_queue/{payoutId} {
      // Only admins can read/write
      allow read, write: if request.auth != null && 
                            get(/databases/$(database)/documents/members/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

## Integration with User Balance

### Option A: Real-Time Update (Recommended)
When admin marks payout as "completed", trigger a Cloud Function to:
1. Add amount to user's balance
2. Create transaction record
3. Send notification to user

### Option B: Manual Update
Admin manually updates user balance in members collection:
```typescript
await updateDoc(doc(db, "members", userId), {
  balance: increment(amount),
  totalEarnings: increment(amount),
});
```

---

## Notification System (Future Enhancement)

### When to Notify User:
- ✉️ Withdrawal request received (confirmation)
- ✉️ Payment is being processed
- ✉️ Payment completed (with transaction details)
- ✉️ Payment failed (with reason)

### Example Notification:
```
Subject: Withdrawal Completed - ₱900.00

Dear Juan Dela Cruz,

Your withdrawal request has been processed successfully!

Amount: ₱900.00
Contract: #contract_xyz123
Withdrawal: 5 of 12
Sent to: 09171234567 (GCash)
Reference: ABC123XYZ789

Next withdrawal available in 30 days.

Thank you,
KOLI Community Team
```

---

## Troubleshooting

### Issue: Payout stuck in "pending"
- **Check**: Is admin online and monitoring?
- **Solution**: Set up alerts for requests older than 24 hours

### Issue: Wrong amount sent
- **Check**: Did calculation match 30%?
- **Solution**: Verify contract principal, adjust user balance manually

### Issue: User can't withdraw again after success
- **Check**: Has 30 days passed since this withdrawal?
- **Solution**: Wait for 30-day period to elapse

### Issue: User deleted during processing
- **Check**: Does userId still exist?
- **Solution**: Mark as failed, investigate with support team

---

## Testing in Admin Dashboard

### Test Cases:
1. ✅ Display all pending payouts in a table
2. ✅ Show user details (name, phone, email)
3. ✅ Display amount and withdrawal count
4. ✅ Button to mark as "processing"
5. ✅ Button to mark as "completed" (with confirmation)
6. ✅ Button to mark as "failed" (with reason input)
7. ✅ Filter by status
8. ✅ Sort by date (oldest first for pending)
9. ✅ Search by user name or phone number
10. ✅ View payout history per user

---

## Summary

The `payout_queue` collection serves as a bridge between user requests and admin processing, ensuring:
- 🔒 **Security**: Manual verification before sending funds
- 📝 **Transparency**: Complete audit trail
- ⏱️ **Tracking**: Status updates at every step
- 💰 **Accuracy**: Correct amounts and recipient details
- 📊 **Analytics**: Performance metrics and insights

All P2P withdrawals flow through this queue for maximum control and security!
