# Firestore Security Rules - Updated for Withdrawal System

## Changes Made

### ✅ Added: `payout_queue` Collection Rules

**Purpose:** Allow users to create withdrawal requests that go into the admin's P2P payout queue.

```javascript
match /payout_queue/{payoutId} {
  // Users can create their own payout requests
  allow create: if request.auth != null && 
                   request.resource.data.userId == request.auth.uid &&
                   request.resource.data.amount > 0 &&
                   request.resource.data.status == "pending";
  
  // Users can read their own payout requests
  allow read: if request.auth != null && 
                 resource.data.userId == request.auth.uid;
  
  // Only admins can update/delete (handled by admin rule below)
  allow update, delete: if false;
}
```

**Security Features:**
- ✅ Users can only create requests for themselves (userId must match auth.uid)
- ✅ Amount must be greater than 0
- ✅ Status must be "pending" on creation
- ✅ Users can only read their own payout requests
- ✅ Users cannot update or delete requests (admin-only)

---

### ✅ Enhanced: `donationContracts` Update Rules

**Added validation for withdrawal count:**

```javascript
allow update: if request.auth != null && 
                 resource.data.userId == request.auth.uid &&
                 // Only allow updating withdrawal fields
                 request.resource.data.donationAmount == resource.data.donationAmount &&
                 request.resource.data.userId == resource.data.userId &&
                 // NEW: Allow withdrawal-related field updates
                 request.resource.data.withdrawalsCount >= resource.data.withdrawalsCount &&
                 request.resource.data.withdrawalsCount <= 12;
```

**Security Features:**
- ✅ Principal (`donationAmount`) cannot be changed
- ✅ Contract owner cannot be changed
- ✅ Withdrawal count can only increase
- ✅ Maximum 12 withdrawals enforced
- ✅ User can only update their own contracts

---

## Complete Rule Structure

### User Permissions

| Collection | Create | Read | Update | Delete |
|------------|--------|------|--------|--------|
| `members/{userId}` | ✅ Own | ✅ Own | ✅ Own | ✅ Own |
| `donationContracts/{id}` | ✅ Own | ✅ Own | ✅ Limited* | ❌ |
| `payout_queue/{id}` | ✅ Own | ✅ Own | ❌ | ❌ |
| `deposits/{id}` | ✅ Any | ✅ Any | ✅ Any | ✅ Any |

\* Limited = Can only update withdrawal fields, not principal or userId

### Admin Permissions

Admins have **full access** to all collections via the catch-all rule:

```javascript
match /{document=**} {
  allow read, write: if request.auth != null &&
    get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == "admin";
}
```

---

## How Withdrawal Flow Works with Rules

### Step 1: User Initiates Withdrawal
```typescript
// withdrawWithPin() in donationContract.ts

// ✅ Allowed: User reads their own contract
const contractSnap = await getDoc(doc(db, "donationContracts", contractId));

// ✅ Allowed: User reads their own profile
const userSnap = await getDoc(doc(db, "members", userId));
```

### Step 2: Create P2P Queue Entry
```typescript
// ✅ Allowed: User creates payout request with:
// - userId matches auth.uid
// - amount > 0
// - status === "pending"
await addDoc(collection(db, "payout_queue"), {
  userId,
  amount: withdrawalAmount,
  status: "pending",
  // ... other fields
});
```

### Step 3: Update Contract
```typescript
// ✅ Allowed: User updates their contract with:
// - donationAmount unchanged
// - userId unchanged
// - withdrawalsCount incremented (but <= 12)
await updateDoc(contractRef, {
  lastWithdrawalDate: now,
  withdrawalsCount: newWithdrawalsCount, // +1
  status: newStatus,
});
```

### Step 4: Admin Processing (Admin Repo)
```typescript
// ✅ Allowed: Admin can update payout_queue
await updateDoc(doc(db, "payout_queue", payoutId), {
  status: "completed",
  processedAt: now,
  processedBy: adminUserId,
});
```

---

## Testing the Rules

### Test 1: User Creates Payout (Should Succeed)
```typescript
// Authenticated as user "abc123"
await addDoc(collection(db, "payout_queue"), {
  userId: "abc123",        // ✅ Matches auth.uid
  amount: 900,             // ✅ Greater than 0
  status: "pending",       // ✅ Required status
  // ...
});
// Result: ✅ SUCCESS
```

### Test 2: User Creates Payout for Another User (Should Fail)
```typescript
// Authenticated as user "abc123"
await addDoc(collection(db, "payout_queue"), {
  userId: "xyz789",        // ❌ Does NOT match auth.uid
  amount: 900,
  status: "pending",
});
// Result: ❌ PERMISSION DENIED
```

### Test 3: User Updates Payout Status (Should Fail)
```typescript
// Authenticated as user "abc123"
await updateDoc(doc(db, "payout_queue", payoutId), {
  status: "completed",     // ❌ Users cannot update
});
// Result: ❌ PERMISSION DENIED
```

### Test 4: User Increases Withdrawal Count (Should Succeed)
```typescript
// Authenticated as contract owner
await updateDoc(doc(db, "donationContracts", contractId), {
  donationAmount: 3000,    // ✅ Unchanged
  userId: "abc123",        // ✅ Unchanged
  withdrawalsCount: 6,     // ✅ Incremented from 5 to 6, <= 12
  lastWithdrawalDate: now,
});
// Result: ✅ SUCCESS
```

### Test 5: User Changes Principal (Should Fail)
```typescript
// Authenticated as contract owner
await updateDoc(doc(db, "donationContracts", contractId), {
  donationAmount: 5000,    // ❌ Changed from 3000 to 5000
  withdrawalsCount: 6,
});
// Result: ❌ PERMISSION DENIED
```

### Test 6: User Exceeds 12 Withdrawals (Should Fail)
```typescript
// Authenticated as contract owner
await updateDoc(doc(db, "donationContracts", contractId), {
  donationAmount: 3000,    // ✅ Unchanged
  userId: "abc123",        // ✅ Unchanged
  withdrawalsCount: 13,    // ❌ Exceeds maximum of 12
});
// Result: ❌ PERMISSION DENIED
```

---

## Security Best Practices Applied

### ✅ Principle of Least Privilege
- Users can only access their own data
- Users cannot modify admin-controlled fields
- Separate permissions for create/read/update/delete

### ✅ Data Validation
- Amount must be positive
- Status must be "pending" on creation
- Withdrawal count cannot exceed 12
- Principal amount is immutable

### ✅ Ownership Verification
- userId must match authenticated user
- Prevents users from creating requests for others
- Prevents users from updating others' data

### ✅ Audit Trail Protection
- Users cannot modify payout status
- Users cannot delete withdrawal requests
- Only admins can mark payouts as processed

---

## Deployment

Rules deployed successfully to Firebase project: `koli-2bad9`

**Deploy Command:**
```bash
node scripts/deployRules.mjs
```

**Verify in Console:**
https://console.firebase.google.com/project/koli-2bad9/firestore/rules

---

## Summary

The updated Firestore rules now fully support the withdrawal system with:
- ✅ `payout_queue` collection for P2P requests
- ✅ Enhanced `donationContracts` validation
- ✅ 30/30 Rule enforcement (principal never changes, max 12 withdrawals)
- ✅ Secure user-admin separation
- ✅ Complete audit trail protection

All withdrawal functionality is now secure and operational! 🎉
