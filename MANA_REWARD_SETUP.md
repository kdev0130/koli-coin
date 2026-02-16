# MANA Daily Reward System Setup Guide

## Overview
The MANA reward system allows users to claim random ₱1-₱5 rewards from a shared pool of ₱1,500 by entering secret codes shared on Telegram.

## Features
- 🎁 Random rewards between ₱1-₱5 PHP
- 💰 Shared pool of ₱1,500 PHP that depletes with each claim
- 🔒 One claim per user per day
- ⏰ 24-hour code expiration
- 🎉 Confetti animation on successful claim
- 📊 Real-time pool progress tracking

## Setup Steps

### 1. Deploy Cloud Function

```bash
# Navigate to project root
cd c:\Users\User\koli-coin

# Deploy the MANA reward claim function
firebase deploy --only functions:claimManaReward
```

### 2. Initialize Reward Pool in Firestore

**Option A: Firebase Console (Recommended)**
1. Go to Firebase Console → Firestore Database
2. Create a new collection: `globalRewards`
3. Create a document with ID: `currentActiveReward`
4. Add the following fields:

```json
{
  "activeCode": "KOLI_BOOST",
  "totalPool": 1500,
  "remainingPool": 1500,
  "expiresAt": "2026-02-05T12:00:00.000Z",
  "createdAt": "2026-02-04T12:00:00.000Z",
  "updatedAt": "2026-02-04T12:00:00.000Z"
}
```

**Option B: Using Firebase Admin SDK (Requires Service Account)**
```javascript
// Create scripts/adminInitReward.js with Firebase Admin SDK
// This requires downloading a service account key from Firebase Console
```

### 3. Firestore Security Rules

The following rules are already deployed in `firestore.rules`:

```javascript
// Global Rewards - MANA daily reward pool
match /globalRewards/{rewardId} {
  // Anyone authenticated can read the active reward to see the pool
  allow read: if request.auth != null;
  // Only allow writes through admin or Cloud Function
  allow write: if false;
}

// User Reward Claims - Track daily claims per user
match /userRewardClaims/{userId} {
  // Users can read their own claim history
  allow read: if request.auth != null && request.auth.uid == userId;
  // Only allow writes through Cloud Function
  allow write: if false;
}
```

### 4. Update Secret Code Daily

To change the secret code each day:

1. Go to Firestore Console
2. Navigate to `globalRewards/currentActiveReward`
3. Update the following fields:
   - `activeCode`: New secret code (e.g., "CRYPTO_WIN")
   - `remainingPool`: Reset to 1500 (or your desired amount)
   - `totalPool`: Reset to 1500 (or match remainingPool)
   - `expiresAt`: Set to 24 hours from now
   - `updatedAt`: Current timestamp

### 5. Share Code on Telegram

Once the pool is initialized, share the secret code with your community:

```
🎁 MANA Daily Reward Alert!
💰 ₱1,500 Pool Available
🔑 Code: KOLI_BOOST
⏰ Expires in 24 hours
🎲 Random ₱1-₱5 per claim

Tap Dashboard → MANA Daily Rewards → Enter Code!
```

## Sample Secret Codes

Use these or create your own:
- `KOLI_BOOST`
- `MANA_DAILY`
- `KINGDOM_WIN`
- `CRYPTO_LUCKY`
- `GOLD_RUSH`
- `POWER_UP`
- `FORTUNE_HOUR`
- `WIN_TODAY`

## Testing

### Test the Claim Flow
1. Start dev server: `pnpm dev`
2. Navigate to Dashboard
3. Click "Claim Now" on MANA Daily Rewards card
4. Enter the active code from Firestore
5. Verify:
   - Success message with reward amount
   - Confetti animation plays
   - Pool decreases in Firestore
   - User balance increases in `members` collection
   - Daily claim recorded in `userRewardClaims` collection

### Test Daily Limit
1. Try claiming again with same user
2. Should show error: "You've already claimed today's reward!"

### Test Pool Depletion
1. Set `remainingPool` to a low amount (e.g., 0.50)
2. Try claiming
3. Should show error: "The reward pool is empty!"

## Cloud Function Details

### Function: `claimManaReward`

**Endpoint:** `https://us-central1-koli-2bad9.cloudfunctions.net/claimManaReward`

**Request Body:**
```json
{
  "secretCode": "KOLI_BOOST"
}
```

**Response (Success):**
```json
{
  "success": true,
  "rewardAmount": 3.50,
  "newBalance": 103.50,
  "remainingPool": 1496.50,
  "message": "Congratulations! You've claimed ₱3.50 MANA reward!"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid or expired secret code"
}
```

### Security Features
- Firestore transaction ensures atomicity
- Prevents race conditions on pool depletion
- Verifies code validity and expiration
- Enforces daily claim limit per user
- Protected by Firebase authentication

## Monitoring

### Check Claim Activity
```bash
# View Cloud Function logs
firebase functions:log --only claimManaReward

# Check recent claims
# Go to Firestore → userRewardClaims collection
```

### Track Pool Usage
```bash
# View current pool status
# Go to Firestore → globalRewards/currentActiveReward
# Check remainingPool field
```

## Admin Cleanup (Deactivated Reward)

If test MANA balance is still showing after deactivating rewards, use the admin-only cleanup function.

### 1) Deploy function

```bash
firebase deploy --only functions:cleanupManaBalances
```

### 2) Run dry-run first (required confirmation key)

Send a `POST` request with your Firebase ID token in `Authorization: Bearer <token>`:

```json
{
  "confirm": "ZERO_MANA_BALANCES",
  "dryRun": true
}
```

### 3) Execute actual cleanup

```json
{
  "confirm": "ZERO_MANA_BALANCES",
  "dryRun": false
}
```

### Notes
- Only users in the `admins` collection can execute this function.
- Cleanup is blocked while reward is active (unless `force: true` is provided).
- Cleanup logs are written to `manaBalanceCleanupLogs`.

## Troubleshooting

### "Missing or insufficient permissions"
- Ensure Firestore rules are deployed
- Check user is authenticated
- Verify Cloud Function is deployed

### "Invalid or expired secret code"
- Check `activeCode` matches exactly (case-sensitive)
- Verify `expiresAt` is in the future
- Ensure `globalRewards/currentActiveReward` document exists

### "The reward pool is empty!"
- Check `remainingPool` > 0
- Reset pool for new day

### Confetti animation not showing
- Verify `canvas-confetti` package is installed
- Check browser console for errors
- Test in different browser

## Architecture

```
User Flow:
1. User opens Dashboard
2. Sees MANA reward card with real-time pool progress
3. Clicks "Claim Now"
4. Modal opens with secret code input
5. User enters code from Telegram
6. Frontend calls Cloud Function
7. Cloud Function verifies and processes claim
8. Updates pool and user balance atomically
9. Returns reward amount
10. Frontend shows success with confetti

Firestore Structure:
/globalRewards
  /currentActiveReward
    - activeCode: string
    - totalPool: number
    - remainingPool: number
    - expiresAt: string (ISO)
    - createdAt: string (ISO)
    - updatedAt: string (ISO)

/userRewardClaims
  /{userId}
    - lastClaimDate: string (YYYY-MM-DD)
    - totalClaims: number
    - totalEarned: number
    - claims: array of objects
      - date: string
      - amount: number
      - code: string
```

## Next Steps

1. ✅ Deploy Cloud Function
2. ✅ Initialize reward pool in Firestore
3. ✅ Share first secret code on Telegram
4. 📊 Monitor claim activity
5. 🔄 Update code daily
6. 📈 Track engagement metrics

---

**Important Notes:**
- Reset the pool and code daily for best engagement
- Monitor pool depletion to ensure fairness
- Consider increasing pool size based on community growth
- Use analytics to track claim patterns and optimal code distribution times
