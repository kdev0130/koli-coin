# Donation Contract System

## Overview

The Donation Contract System implements a structured 1-year donation model with the following characteristics:

- **Principal Protection**: The donation amount never decreases
- **Monthly Withdrawals**: Users can withdraw 30% of their original donation every 30 days
- **12 Total Withdrawals**: One withdrawal per month for 12 months
- **Maturity Period**: First withdrawal available after 30 days from donation date

## Contract Structure

### DonationContract Interface

```typescript
interface DonationContract {
  id?: string;
  userId: string;
  donationAmount: number;        // Principal - NEVER changes
  donationStartDate: string;      // ISO string
  lastWithdrawalDate: string | null;
  withdrawalsCount: number;       // 0-12
  contractEndDate: string;        // donationStartDate + 1 year
  status: "active" | "completed" | "expired";
  receiptURL?: string;
  receiptPath?: string;
  paymentMethod?: string;
  createdAt: string;
}
```

## Core Functions

### 1. `donate(userId, amount, paymentMethod, receiptURL?, receiptPath?)`

Creates a new donation contract.

**Parameters:**
- `userId`: User's Firebase UID
- `amount`: Donation amount (must be > 0)
- `paymentMethod`: Payment method used (e.g., "GCash", "Bank Transfer")
- `receiptURL`: Optional receipt image URL
- `receiptPath`: Optional receipt storage path

**Returns:** Contract ID (string)

**Example:**
```typescript
const contractId = await donate(
  user.uid,
  5000,
  "GCash",
  "https://...",
  "receipts/..."
);
```

### 2. `canWithdraw(contract)`

Checks if user is eligible to withdraw from a contract.

**Parameters:**
- `contract`: DonationContract object

**Returns:**
```typescript
{
  canWithdraw: boolean;
  reason: string;
  nextWithdrawalDate?: Date;
}
```

**Validation Rules:**
- ❌ Contract expired (> 1 year)
- ❌ Contract not active
- ❌ All 12 withdrawals used
- ❌ Less than 30 days since donation
- ❌ Less than 30 days since last withdrawal
- ✅ All conditions met

### 3. `withdraw(contractId)`

Processes a withdrawal from a contract.

**Parameters:**
- `contractId`: Contract document ID

**Returns:** Withdrawal amount (number)

**Side Effects:**
- Updates `lastWithdrawalDate` to current timestamp
- Increments `withdrawalsCount`
- Changes `status` to "completed" if withdrawalsCount reaches 12

**Example:**
```typescript
try {
  const amount = await withdraw(contractId);
  console.log(`Withdrew ₱${amount}`);
} catch (error) {
  console.error(error.message);
}
```

### 4. `getRemainingWithdrawals(contract)`

Gets the number of remaining withdrawal opportunities.

**Parameters:**
- `contract`: DonationContract object

**Returns:** Number (0-12)

### 5. `isContractActive(contract)`

Checks if a contract is still active.

**Parameters:**
- `contract`: DonationContract object

**Returns:** Boolean

**Active Conditions:**
- Status is "active"
- Current date ≤ contract end date
- Withdrawals count < 12

### 6. `getWithdrawalDetails(contract)`

Gets comprehensive withdrawal information.

**Parameters:**
- `contract`: DonationContract object

**Returns:**
```typescript
{
  totalWithdrawn: number;         // Total amount withdrawn so far
  totalRemaining: number;          // Remaining withdrawable amount
  withdrawalPerPeriod: number;    // Amount per withdrawal (30%)
  withdrawalsUsed: number;        // Number of withdrawals made
  withdrawalsRemaining: number;   // Remaining withdrawal opportunities
  maxTotalWithdrawal: number;     // Maximum total withdrawable
}
```

### 7. `getDaysUntilNextWithdrawal(contract)`

Calculates days until the next withdrawal is available.

**Parameters:**
- `contract`: DonationContract object

**Returns:**
- `0`: Can withdraw now
- `number > 0`: Days remaining
- `null`: Cannot withdraw (expired/completed)

## Usage Example

### Creating a Donation Contract

```typescript
import { donate } from "@/lib/donationContract";

const handleDonation = async () => {
  try {
    const contractId = await donate(
      user.uid,
      3000,      // ₱3,000 donation
      "GCash",
      receiptURL,
      receiptPath
    );
    
    console.log("Contract created:", contractId);
    // User can now withdraw ₱900 every 30 days (12 times)
  } catch (error) {
    console.error("Donation failed:", error);
  }
};
```

### Checking Withdrawal Eligibility

```typescript
import { canWithdraw } from "@/lib/donationContract";

const checkStatus = (contract) => {
  const { canWithdraw: eligible, reason, nextWithdrawalDate } = canWithdraw(contract);
  
  if (eligible) {
    console.log("Ready to withdraw!");
  } else {
    console.log(`Cannot withdraw: ${reason}`);
    if (nextWithdrawalDate) {
      console.log(`Next withdrawal: ${nextWithdrawalDate}`);
    }
  }
};
```

### Processing a Withdrawal

```typescript
import { withdraw } from "@/lib/donationContract";

const handleWithdraw = async (contractId) => {
  try {
    const amount = await withdraw(contractId);
    console.log(`Successfully withdrew ₱${amount.toLocaleString()}`);
    // Update user balance here (in production, use Cloud Function)
  } catch (error) {
    console.error("Withdrawal failed:", error.message);
  }
};
```

## Real-time Integration

### Using the Contract Hook

```typescript
import { useRealtimeContracts } from "@/hooks/useRealtimeContracts";

function MyComponent() {
  const { user } = useAuth();
  const { data: contracts, loading, error } = useRealtimeContracts(user?.uid);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {contracts.map(contract => (
        <ContractCard key={contract.id} contract={contract} />
      ))}
    </div>
  );
}
```

## Withdrawal Calculation Examples

### Example 1: ₱3,000 Donation

- **Principal:** ₱3,000 (never changes)
- **Per Withdrawal:** ₱900 (30% of 3,000)
- **Total Withdrawals:** 12
- **Max Total Withdrawn:** ₱10,800 (900 × 12)

**Timeline:**
- Day 0: Donate ₱3,000
- Day 30: Withdraw ₱900 (1st)
- Day 60: Withdraw ₱900 (2nd)
- Day 90: Withdraw ₱900 (3rd)
- ...
- Day 360: Withdraw ₱900 (12th - Final)

### Example 2: ₱10,000 Donation

- **Principal:** ₱10,000
- **Per Withdrawal:** ₱3,000
- **Total Withdrawals:** 12
- **Max Total Withdrawn:** ₱36,000

## Constraints & Validations

### Hard Constraints

1. ✅ **Principal Never Decreases**
   - Original donation amount is immutable
   - Stored in `donationAmount` field

2. ✅ **30-Day Waiting Periods**
   - First withdrawal: 30 days after donation
   - Subsequent withdrawals: 30 days apart

3. ✅ **One Withdrawal Per Period**
   - Enforced by `lastWithdrawalDate` check
   - Must wait 30 days between withdrawals

4. ✅ **Maximum 12 Withdrawals**
   - Tracked by `withdrawalsCount`
   - Contract status changes to "completed" at 12

5. ✅ **1-Year Contract Duration**
   - `contractEndDate` = `donationStartDate` + 1 year
   - No withdrawals after expiration

6. ✅ **Fixed 30% Withdrawal**
   - Always `Math.floor(donationAmount * 0.3)`
   - Cannot withdraw more or less

### Validation Errors

```typescript
// Amount validation
if (amount <= 0) {
  throw new Error("Donation amount must be greater than zero");
}

// Withdrawal validation
if (!canWithdraw(contract).canWithdraw) {
  throw new Error(canWithdraw(contract).reason);
}

// Contract existence
if (!contractSnap.exists()) {
  throw new Error("Contract not found");
}
```

## Security Rules

Firestore security rules ensure:

1. Users can only read their own contracts
2. Users can only create contracts with their own userId
3. Principal amount cannot be changed after creation
4. Withdrawal count can only increase
5. Contract ownership cannot be transferred

See [firestore.rules](../firestore.rules) for full implementation.

## Database Schema

### Collection: `donationContracts`

```
donationContracts/
  {contractId}/
    - userId: string
    - donationAmount: number
    - donationStartDate: string (ISO)
    - lastWithdrawalDate: string | null (ISO)
    - withdrawalsCount: number (0-12)
    - contractEndDate: string (ISO)
    - status: "active" | "completed" | "expired"
    - paymentMethod: string (optional)
    - receiptURL: string (optional)
    - receiptPath: string (optional)
    - createdAt: string (ISO)
```

## Migration from Old System

The old `deposits` collection used a different model:

**Old System:**
- Status-based: pending → approved → locked → matured
- Single 30-day period
- One-time 30% withdrawal

**New System:**
- Contract-based: 1-year duration
- 12 monthly withdrawal periods
- Principal never decreases

**Migration Strategy:**
- Keep old `deposits` collection for historical data
- New donations use `donationContracts` collection
- UI supports both systems during transition

## UI Components

### AddDonationModal

Updated to show contract preview:
- Principal amount (never decreases)
- First withdrawal date (30 days)
- Per-withdrawal amount (30%)
- Total withdrawals (12)
- Contract end date (1 year)

### Donation Page

Shows contract cards with:
- Principal amount and status badge
- Withdrawal progress (X/12)
- Per-withdrawal and total withdrawn amounts
- Contract progress bar
- Withdrawal eligibility status
- Action button (withdraw or countdown)

## Future Enhancements

### Recommended Cloud Functions

For production security, implement these Cloud Functions:

1. **Contract Creation Validator**
   - Verify payment receipt
   - Check user eligibility
   - Prevent duplicate contracts

2. **Withdrawal Processor**
   - Atomic balance updates
   - Transaction logging
   - Fraud detection

3. **Contract Status Updater**
   - Scheduled function to mark expired contracts
   - Send expiration notifications

4. **Withdrawal Reminder**
   - Notify users when withdrawal available
   - Send 24-hour reminders

### Example Cloud Function (Withdrawal)

```typescript
exports.processWithdrawal = functions.https.onCall(async (data, context) => {
  const { contractId } = data;
  const userId = context.auth.uid;
  
  return await db.runTransaction(async (transaction) => {
    // Get contract
    const contractRef = db.collection('donationContracts').doc(contractId);
    const contract = await transaction.get(contractRef);
    
    // Validate
    if (contract.data().userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Check eligibility
    const { canWithdraw, reason } = canWithdraw(contract.data());
    if (!canWithdraw) {
      throw new Error(reason);
    }
    
    // Process withdrawal
    const amount = Math.floor(contract.data().donationAmount * 0.3);
    
    // Update contract
    transaction.update(contractRef, {
      lastWithdrawalDate: new Date().toISOString(),
      withdrawalsCount: contract.data().withdrawalsCount + 1,
      status: contract.data().withdrawalsCount + 1 >= 12 ? "completed" : "active"
    });
    
    // Update user balance
    const userRef = db.collection('members').doc(userId);
    transaction.update(userRef, {
      balance: FieldValue.increment(amount)
    });
    
    // Create transaction record
    transaction.create(db.collection('transactions').doc(), {
      userId,
      contractId,
      type: "withdrawal",
      amount,
      timestamp: new Date().toISOString()
    });
    
    return { success: true, amount };
  });
});
```

## Testing Checklist

- [ ] Create contract with valid amount
- [ ] Attempt withdrawal before 30 days (should fail)
- [ ] Successful first withdrawal after 30 days
- [ ] Attempt second withdrawal immediately (should fail)
- [ ] Successful second withdrawal after 30 days
- [ ] Contract completes after 12 withdrawals
- [ ] Attempt withdrawal after completion (should fail)
- [ ] Contract expires after 1 year
- [ ] Principal amount never changes
- [ ] Multiple contracts per user work correctly

## Troubleshooting

### "Must wait 30 days after donation"
- First withdrawal only available after 30 days from donation date
- Check `donationStartDate` field

### "Must wait 30 days between withdrawals"
- Each withdrawal requires 30-day cooldown
- Check `lastWithdrawalDate` field

### "All 12 withdrawals have been used"
- Contract has reached maximum withdrawals
- Create new contract if needed

### "Contract has expired"
- More than 1 year since donation
- Check `contractEndDate` field

## Support

For questions or issues:
- Check console logs for real-time update messages
- Verify Firestore security rules
- Ensure user is authenticated
- Check contract status and dates

---

**Version:** 1.0.0  
**Last Updated:** February 3, 2026  
**License:** MIT
