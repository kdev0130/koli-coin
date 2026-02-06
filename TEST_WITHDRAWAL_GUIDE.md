# Test Scripts - Make User Ready for Withdrawal

## Quick Instructions

To make user `tXZ1e7PaoLadaxxRs9dFodUXUb22` ready for withdrawal, use **ONE** of these methods:

---

## Method 1: Browser Console (Easiest - No Setup Required) ⭐

1. **Open Firebase Console**
   ```
   https://console.firebase.google.com/project/koli-2bad9/firestore/data
   ```

2. **Open Browser Developer Tools**
   - Press `F12` or `Right-click → Inspect`
   - Go to the **Console** tab

3. **Paste this code and press Enter**:
   ```javascript
   (async function makeReadyForWithdrawal() {
     const userId = 'tXZ1e7PaoLadaxxRs9dFodUXUb22';
     
     const snapshot = await firebase.firestore()
       .collection('donationContracts')
       .where('userId', '==', userId)
       .get();
     
     if (snapshot.empty) {
       console.log('❌ No contracts found');
       return;
     }
     
     const now = new Date();
     
     for (const doc of snapshot.docs) {
       const contract = doc.data();
       console.log('📋 Processing:', doc.id, '| Status:', contract.status);
       
       if (contract.status === 'pending') {
         const startDate = new Date(now);
         startDate.setDate(startDate.getDate() - 31);
         const endDate = new Date(startDate);
         endDate.setFullYear(endDate.getFullYear() + 1);
         
         await doc.ref.update({
           status: 'active',
           donationStartDate: startDate.toISOString(),
           contractEndDate: endDate.toISOString(),
           approvedAt: startDate.toISOString(),
           approvedBy: 'TEST_CONSOLE'
         });
         
         console.log('✅ Approved and ready:', doc.id);
       } else if (contract.status === 'active' || contract.status === 'approved') {
         const newLastWithdrawal = new Date(now);
         newLastWithdrawal.setDate(newLastWithdrawal.getDate() - 31);
         
         await doc.ref.update({
           lastWithdrawalDate: newLastWithdrawal.toISOString()
         });
         
         console.log('✅ Made ready:', doc.id);
       } else {
         console.log('⚠️  Skipped (status: ' + contract.status + ')');
       }
     }
     
     console.log('🎉 Done! Refresh the app and check the Donation page.');
   })();
   ```

4. **Wait for success message**
   - You should see: `✅ Made ready: [contract-id]`

5. **Refresh the app**
   - Open the app as user `tXZ1e7PaoLadaxxRs9dFodUXUb22`
   - Go to Donation page
   - Countdown should show: `00:00:00:00`
   - Button should say: `Withdraw ₱XXX`

---

## Method 2: Manual Firestore Edit (No Code)

1. **Go to Firestore Console**
   ```
   https://console.firebase.google.com/project/koli-2bad9/firestore/data
   ```

2. **Navigate to `donationContracts` collection**

3. **Find the document** where:
   ```
   userId == "tXZ1e7PaoLadaxxRs9dFodUXUb22"
   ```

4. **Click the document to edit**

5. **Update these fields** (based on current status):

   ### If status is "pending":
   ```
   status: "active"
   donationStartDate: "2026-01-04T03:08:38.990Z"
   contractEndDate: "2027-01-04T03:08:38.990Z"
   approvedAt: "2026-01-04T03:08:38.990Z"
   approvedBy: "TEST_MANUAL"
   ```

   ### If status is "active" or "approved":
   ```
   lastWithdrawalDate: "2026-01-04T03:08:38.990Z"
   ```

6. **Click Save**

7. **Refresh the app** - withdrawal should be ready!

---

## Method 3: Node.js Script (Requires Admin Login)

**Prerequisites:**
- You need an admin account email/password
- firebase-admin is already installed

**Steps:**

1. **Edit the script**: `scripts/testWithdrawalReadyClient.mjs`
   
2. **Update these lines**:
   ```javascript
   const ADMIN_EMAIL = 'your-admin@example.com';
   const ADMIN_PASSWORD = 'your-password';
   ```

3. **Run the script**:
   ```bash
   node scripts/testWithdrawalReadyClient.mjs
   ```

---

## Method 4: Service Account (Most Secure)

**Prerequisites:**
- Download Firebase service account key

**Steps:**

1. **Download Service Account Key**:
   - Go to: Firebase Console → Project Settings → Service Accounts
   - Click: "Generate New Private Key"
   - Save as: `serviceAccountKey.json` in project root

2. **Run the script**:
   ```bash
   node scripts/testWithdrawalReady.mjs
   ```

---

## Verification

After making changes, verify by:

1. **Login as the user**: `tXZ1e7PaoLadaxxRs9dFodUXUb22`

2. **Go to Donation page**

3. **Check for**:
   - ✅ Contract card has **GREEN** border
   - ✅ Badge shows **"Ready"** with checkmark icon
   - ✅ Countdown displays: **00:00:00:00**
   - ✅ Button says: **"Withdraw ₱XXX"** (not grayed out)
   - ✅ Status message: **"Ready to withdraw ₱XXX!"**

4. **Test withdrawal**:
   - Click the withdraw button
   - Modal should open
   - Enter 6-digit PIN
   - Should succeed (if KYC is verified)

---

## Troubleshooting

### "No contracts found"
- User hasn't created any donations yet
- Create a donation through the app first

### "Contract already completed"
- All 12 withdrawals have been used
- Create a new donation contract

### Button still disabled after update
- Clear browser cache
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Check if dates were saved correctly in Firestore

### "KYC Verification Required" in modal
- User's KYC status is not "VERIFIED" or "APPROVED"
- Update in Firestore: `members/{userId}` → `kycStatus: "VERIFIED"`

### "Incorrect PIN" error
- User hasn't set up a PIN yet
- Or the PIN is wrong
- User needs to complete PIN setup first

---

## Understanding the Dates

### Why 31 days ago?
- 30 days must pass before withdrawal
- Setting to 31 days ago ensures we're past the 30-day threshold
- Current time - 31 days = 31 days elapsed ✅

### Date Calculations:
```javascript
Now:                 Feb 4, 2026 (today)
Start Date:          Jan 4, 2026 (31 days ago)
Days Elapsed:        31 days ✅ (more than 30)
Withdrawal Ready:    YES
```

### Contract Timeline:
```
Jan 4, 2026       Feb 4, 2026       Jan 4, 2027
    |                 |                 |
  Start           Withdrawal 1         End
    |<--- 31 days --->|
    |                 |
    |                 ✓ Ready!
    |<------------- 1 year ----------->|
```

---

## Quick Reference: Field Values

```javascript
// For pending contracts
status: "active"
donationStartDate: "2026-01-04T03:08:38.990Z"    // 31 days ago
contractEndDate: "2027-01-04T03:08:38.990Z"       // ~334 days from now
approvedAt: "2026-01-04T03:08:38.990Z"
approvedBy: "TEST"

// For active contracts
lastWithdrawalDate: "2026-01-04T03:08:38.990Z"    // 31 days ago
```

---

## Need Help?

Run this to see current instructions:
```bash
node scripts/makeWithdrawalReady.mjs
```

This will display the latest date values and instructions!
