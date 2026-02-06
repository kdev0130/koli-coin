# Withdrawal System Implementation - Complete

## Overview
Implemented a secure, PIN-protected P2P withdrawal system for the KOLI Community PWA donation contracts. The system enforces the 30/30 Rule with KYC verification and creates a manual payout queue for admin processing.

---

## Key Features Implemented

### 1. **WithdrawalModal Component** (`src/components/donation/WithdrawalModal.tsx`)
A comprehensive modal that handles the entire withdrawal flow:

#### Features:
- **KYC Status Verification**
  - Checks if user is `VERIFIED` or `APPROVED`
  - Shows clear error messages if not verified
  - Prevents withdrawal for unverified users

- **Contract Details Display**
  - Shows contract principal (never decreases)
  - Displays 30% withdrawal amount calculation
  - Shows withdrawal count (e.g., "5/12")
  - Displays running totals (withdrawn, remaining)

- **6-Digit PIN Input**
  - Masked password input
  - Numeric keyboard on mobile devices
  - Real-time validation (must be exactly 6 digits)
  - Visual feedback for errors

- **P2P Transaction Information**
  - Clear notice about 24-hour processing time
  - Explains manual admin verification process
  - Shows funds will be sent to registered accounts

#### User Experience:
- Clean, professional UI with proper spacing
- Color-coded status indicators (green for success, red for errors)
- Disabled state for non-verified users
- Loading states during processing
- Toast notifications for success/failure

---

### 2. **Enhanced Withdrawal Logic** (`src/lib/donationContract.ts`)

#### New Function: `withdrawWithPin()`
Replaces the basic `withdraw()` function with comprehensive security:

##### Security Checks (in order):
1. **PIN Verification** - Validates and verifies the 6-digit PIN
2. **Contract Existence** - Ensures contract exists in database
3. **Withdrawal Eligibility** - Checks 30-day period and withdrawal count
4. **User Authorization** - Verifies contract belongs to requesting user
5. **KYC Status** - Confirms user is `VERIFIED` or `APPROVED`

##### Actions Performed:
1. Calculates withdrawal amount (30% of original principal)
2. Creates entry in `payout_queue` collection with:
   - User details (name, phone, email)
   - Amount to transfer
   - Contract reference
   - Withdrawal count (e.g., "5/12")
   - Timestamp and status tracking
3. Updates contract:
   - Increments `withdrawalsCount`
   - Updates `lastWithdrawalDate`
   - Changes status to "completed" after 12th withdrawal
4. **Does NOT modify user balance** (admin handles this manually)

##### P2P Queue Document Structure:
```typescript
{
  userId: string,
  contractId: string,
  amount: number,
  status: "pending",
  userFullName: string,
  userPhoneNumber: string, // 11-digit PH number
  userEmail: string,
  withdrawalNumber: number, // 1-12
  totalWithdrawals: 12,
  contractPrincipal: number,
  requestedAt: ISO string,
  processedAt: null,
  processedBy: null,
  notes: string,
  createdAt: serverTimestamp
}
```

---

### 3. **Donation Page Updates** (`src/pages/Donation.tsx`)

#### Improvements:

##### Real-Time Countdown Timers
Each active contract now displays a live countdown showing:
- **Days** : **Hours** : **Minutes** : **Seconds**
- Updates every second via `setInterval`
- Shows time until next 30-day unlock
- Large, readable font-mono display
- Color-coded (orange when locked, green when ready)

##### Modal-Based Withdrawal Flow
- Replaced direct withdrawal button with modal trigger
- Modal opens regardless of KYC status (shows error inside)
- Better UX - users understand WHY they can't withdraw
- Prevents confusion about verification requirements

##### State Management
- Uses `DonationContract` object instead of just ID
- Cleaner prop passing to modal
- Real-time updates via Firestore listeners

##### Visual Enhancements
- Countdown timer with proper formatting
- Pulsing animation on "ready" status
- Clear "Not Yet Available" disabled state
- Progress bars for contract timeline

---

## The 30/30 Rule Implementation

### How It Works:

1. **Donation Phase**
   - User creates contract with principal (e.g., ₱3,000)
   - Status: "pending" → awaiting admin approval
   - Principal stored in `donationAmount` field

2. **Activation Phase** (Admin Side - Not in this repo)
   - Admin approves contract
   - Sets `donationStartDate` and `contractEndDate` (1 year)
   - Status changes to "active"

3. **Withdrawal Phase** (User Side - This Repo)
   - First withdrawal available 30 days after `donationStartDate`
   - User clicks withdraw → Modal opens
   - User enters 6-digit PIN
   - System validates:
     - ✓ 30 days elapsed since last withdrawal
     - ✓ KYC is verified
     - ✓ Less than 12 withdrawals used
     - ✓ PIN is correct
   - Creates P2P queue entry
   - Updates contract (principal NEVER changes)

4. **Processing Phase** (Admin Side - Not in this repo)
   - Admin sees payout queue
   - Manually sends ₱900 (30%) to user's PH E-wallet
   - Marks queue item as processed
   - Updates user balance in database

5. **Completion**
   - After 12 withdrawals, contract status → "completed"
   - Total withdrawn: ₱10,800 (₱900 × 12)
   - Original principal: ₱3,000 (unchanged)

---

## Security Features

### Multi-Layer Protection:
1. **KYC Gate** - No withdrawals without verification
2. **PIN Requirement** - 6-digit funding PIN for every withdrawal
3. **30-Day Lock** - Enforced time between withdrawals
4. **Manual Processing** - Admin verifies each payout
5. **User Authorization** - Contract ownership verification
6. **Audit Trail** - All requests logged in payout_queue

### PIN Security:
- Hashed using SHA-256 (defined in `pinSecurity.ts`)
- Never stored in plain text
- Verified before any withdrawal
- Admin-only reset (not implemented in user repo)

---

## User Experience Flow

### Happy Path:
1. User opens Donation page
2. Sees active contracts with countdown timers
3. When timer reaches 0:00:00:00, card turns green
4. "Ready to withdraw ₱900!" message appears
5. Button changes to "Withdraw ₱900"
6. User clicks → Modal opens
7. Modal shows:
   - Contract details
   - 30% calculation
   - P2P processing notice
   - PIN input field
8. User enters 6-digit PIN
9. Clicks "Confirm Withdrawal"
10. System validates and creates queue entry
11. Success toast: "Withdrawal Request Submitted!"
12. Modal closes, page refreshes
13. Countdown resets to 30 days

### Error Paths:
- **Not Verified**: Modal shows KYC error, PIN input disabled
- **Wrong PIN**: Error message "Incorrect PIN"
- **Too Soon**: Countdown shows time remaining
- **Contract Expired**: Button shows "Not Yet Available"

---

## What This Repo Handles

✅ User interface for withdrawal requests  
✅ KYC status checking  
✅ PIN verification  
✅ 30-day eligibility validation  
✅ P2P queue creation  
✅ Contract state updates  
✅ Real-time countdown timers  
✅ User notifications (toasts)  

---

## What Admin Repo Should Handle

❌ Manual approval of donations  
❌ Setting contract start dates  
❌ Processing payout queue  
❌ Sending funds to user accounts  
❌ Updating user balances  
❌ Marking payouts as completed  
❌ PIN reset requests  
❌ KYC verification  

---

## Database Collections Used

### `donationContracts`
- User donation contracts
- Tracks withdrawal count and dates
- Principal amount (never changes)
- Status and approval info

### `payout_queue` (NEW)
- P2P withdrawal requests
- User info (name, phone, email)
- Amount and contract reference
- Processing status and timestamps
- Admin-facing collection

### `members`
- User profile data
- KYC status
- PIN hash
- E-wallet/bank details

---

## Testing Checklist

### Prerequisites:
- [ ] User has completed KYC (status = "VERIFIED" or "APPROVED")
- [ ] User has set up 6-digit PIN
- [ ] User has at least one active contract
- [ ] Contract is 30+ days old OR previous withdrawal was 30+ days ago

### Test Scenarios:

#### Scenario 1: Successful Withdrawal
1. Open Donation page
2. Find green "Ready" contract
3. Click "Withdraw ₱XXX" button
4. Modal opens with contract details
5. Enter correct 6-digit PIN
6. Click "Confirm Withdrawal"
7. ✅ Success toast appears
8. ✅ Modal closes
9. ✅ Contract updates (withdrawal count increments)
10. ✅ Entry created in `payout_queue`
11. ✅ Countdown resets to 30 days

#### Scenario 2: KYC Not Verified
1. User with `kycStatus = "NOT_SUBMITTED"`
2. Click withdraw button
3. Modal opens
4. ✅ Shows "KYC Verification Required" error
5. ✅ PIN input is disabled
6. ✅ Confirm button is disabled

#### Scenario 3: Wrong PIN
1. Enter incorrect 6-digit PIN
2. Click confirm
3. ✅ Error message: "Incorrect PIN"
4. ✅ Modal stays open
5. ✅ No withdrawal processed

#### Scenario 4: Too Early (Before 30 Days)
1. Contract with less than 30 days elapsed
2. ✅ Button shows "Not Yet Available"
3. ✅ Button is disabled
4. ✅ Countdown timer shows remaining time
5. ✅ Card is orange/yellow, not green

#### Scenario 5: Countdown Timer
1. Watch contract approaching 30-day mark
2. ✅ Timer counts down in real-time
3. ✅ Updates every second
4. ✅ Shows DD:HH:MM:SS format
5. ✅ When reaches 00:00:00:00, button enables

---

## Code Quality

### Best Practices Followed:
- ✅ TypeScript strict mode
- ✅ Proper error handling with try-catch
- ✅ Loading states for async operations
- ✅ Optimistic UI updates
- ✅ Real-time Firestore listeners
- ✅ Component separation (modal is separate)
- ✅ Reusable utility functions
- ✅ Clear variable naming
- ✅ Comprehensive comments
- ✅ No hardcoded values (uses calculations)

### Performance:
- Uses `setInterval` efficiently (cleans up on unmount)
- Real-time updates only for user's contracts
- Minimal re-renders with proper state management

---

## Future Enhancements (Optional)

### Possible Improvements:
1. **Email Notifications** - Send email when withdrawal is processed
2. **Transaction History** - Show past withdrawal records
3. **Withdrawal Receipts** - Generate PDF receipts
4. **Push Notifications** - Alert when ready to withdraw
5. **Biometric Unlock** - Fingerprint/Face ID for PIN
6. **Multi-Language** - Support Tagalog/other languages
7. **Dark Mode** - Respect system theme preference

---

## Summary

The withdrawal system is now fully functional with:
- ✅ **Secure**: PIN + KYC + Manual verification
- ✅ **User-Friendly**: Clear modals, countdown timers, helpful messages
- ✅ **Compliant**: Follows 30/30 Rule exactly
- ✅ **Scalable**: P2P queue allows admin to process many requests
- ✅ **Transparent**: Users see exactly what they'll receive

All focused on the **withdrawal functionality** as requested!
