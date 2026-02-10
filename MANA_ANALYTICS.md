# MANA Claim Analytics Documentation

## Overview
The `manaClaimAnalytics` collection stores detailed analytics data for every MANA reward claim. This data powers admin dashboards showing user behavior, claim speed, and reward distribution.

## Firestore Collection: `manaClaimAnalytics`

### Collection Structure
```
manaClaimAnalytics/
  {autoId}/
    - userId: string
    - userName: string
    - userEmail: string
    - claimAmount: number
    - claimedAt: timestamp
    - claimedDate: string (YYYY-MM-DD)
    - secretCode: string
    - timeToClaim: number (milliseconds)
    - timeToClaimMinutes: number (rounded minutes)
    - poolBefore: number
    - poolAfter: number
    - rewardPoolId: string
```

### Field Descriptions

#### User Information
- **userId** (string): Firebase Auth UID of the user
- **userName** (string): Display name of the user
- **userEmail** (string): User's email address

#### Claim Details
- **claimAmount** (number): Amount of MANA claimed (₱1-₱5)
- **claimedAt** (timestamp): Server timestamp when claim was processed
- **claimedDate** (string): Date in YYYY-MM-DD format for daily grouping
- **secretCode** (string): The secret code that was used

#### Timing Analytics
- **timeToClaim** (number): Milliseconds between code posting and claim
- **timeToClaimMinutes** (number): Same as above but in rounded minutes

#### Pool Information
- **poolBefore** (number): Pool balance before this claim
- **poolAfter** (number): Pool balance after this claim
- **rewardPoolId** (string): ID of the reward pool (for tracking multiple pools)

---

## Admin Analytics Queries

### 1. Top Claimers (Total Amount)
Query users who have claimed the most MANA rewards.

```javascript
// Get all claims grouped by user
const analytics = await db.collection('manaClaimAnalytics')
  .orderBy('claimedAt', 'desc')
  .get();

// Group by userId and sum amounts
const userTotals = {};
analytics.docs.forEach(doc => {
  const data = doc.data();
  if (!userTotals[data.userId]) {
    userTotals[data.userId] = {
      userId: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
      totalClaimed: 0,
      claims: 0
    };
  }
  userTotals[data.userId].totalClaimed += data.claimAmount;
  userTotals[data.userId].claims += 1;
});

// Sort by total claimed
const topClaimers = Object.values(userTotals)
  .sort((a, b) => b.totalClaimed - a.totalClaimed)
  .slice(0, 10);
```

### 2. Fastest Claimers (≥3 claims)
Find users who consistently claim rewards quickly.

```javascript
// Get all claims
const analytics = await db.collection('manaClaimAnalytics')
  .get();

// Group by userId and calculate average time
const userTimings = {};
analytics.docs.forEach(doc => {
  const data = doc.data();
  if (!userTimings[data.userId]) {
    userTimings[data.userId] = {
      userId: data.userId,
      userName: data.userName,
      totalTime: 0,
      claims: 0
    };
  }
  userTimings[data.userId].totalTime += data.timeToClaimMinutes;
  userTimings[data.userId].claims += 1;
});

// Filter users with ≥3 claims and calculate average
const fastestClaimers = Object.values(userTimings)
  .filter(user => user.claims >= 3)
  .map(user => ({
    ...user,
    avgTimeToClaimMinutes: Math.round(user.totalTime / user.claims)
  }))
  .sort((a, b) => a.avgTimeToClaimMinutes - b.avgTimeToClaimMinutes)
  .slice(0, 10);
```

### 3. Daily Claim Statistics
Analyze claims by date.

```javascript
const today = new Date().toISOString().split('T')[0];

const todayClaims = await db.collection('manaClaimAnalytics')
  .where('claimedDate', '==', today)
  .get();

const stats = {
  totalClaims: todayClaims.size,
  totalAmount: 0,
  fastestClaim: Infinity,
  slowestClaim: 0,
  avgTimeToClaimMinutes: 0
};

let totalTime = 0;
todayClaims.docs.forEach(doc => {
  const data = doc.data();
  stats.totalAmount += data.claimAmount;
  totalTime += data.timeToClaimMinutes;
  
  if (data.timeToClaimMinutes < stats.fastestClaim) {
    stats.fastestClaim = data.timeToClaimMinutes;
  }
  if (data.timeToClaimMinutes > stats.slowestClaim) {
    stats.slowestClaim = data.timeToClaimMinutes;
  }
});

stats.avgTimeToClaimMinutes = Math.round(totalTime / todayClaims.size);
```

### 4. Pool Depletion Rate
Track how quickly reward pools are depleted.

```javascript
const poolAnalytics = await db.collection('manaClaimAnalytics')
  .where('rewardPoolId', '==', 'pool123')
  .orderBy('claimedAt', 'asc')
  .get();

const depletionData = poolAnalytics.docs.map(doc => {
  const data = doc.data();
  return {
    claimedAt: data.claimedAt.toDate(),
    poolRemaining: data.poolAfter,
    userName: data.userName
  };
});
```

---

## Recommended Firestore Indexes

Create these composite indexes for optimal query performance:

### Index 1: User Analytics
```
Collection: manaClaimAnalytics
Fields: userId (Ascending), claimedAt (Descending)
```

### Index 2: Date-based Queries
```
Collection: manaClaimAnalytics
Fields: claimedDate (Ascending), claimedAt (Descending)
```

### Index 3: Pool Tracking
```
Collection: manaClaimAnalytics
Fields: rewardPoolId (Ascending), claimedAt (Ascending)
```

### Index 4: Fastest Claimers
```
Collection: manaClaimAnalytics
Fields: timeToClaimMinutes (Ascending), claimedAt (Descending)
```

---

## Admin Dashboard Components

### Component 1: Top Claimers Table
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableCell>User</TableCell>
      <TableCell>Total Claimed</TableCell>
      <TableCell>Claims</TableCell>
    </TableRow>
  </TableHeader>
  <TableBody>
    {topClaimers.map(user => (
      <TableRow key={user.userId}>
        <TableCell>{user.userName}</TableCell>
        <TableCell>₱{user.totalClaimed.toFixed(2)}</TableCell>
        <TableCell>{user.claims}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Component 2: Fastest Claimers Table
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableCell>User</TableCell>
      <TableCell>Avg. Time to Claim</TableCell>
      <TableCell>Claims</TableCell>
    </TableRow>
  </TableHeader>
  <TableBody>
    {fastestClaimers.map(user => (
      <TableRow key={user.userId}>
        <TableCell>{user.userName}</TableCell>
        <TableCell>{user.avgTimeToClaimMinutes} min</TableCell>
        <TableCell>{user.claims}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## Data Privacy & Security

### Firestore Rules
```javascript
// MANA Claim Analytics - Admin dashboard data
match /manaClaimAnalytics/{analyticsId} {
  // Only admins can read analytics data
  allow read: if request.auth != null &&
    exists(/databases/$(database)/documents/admins/$(request.auth.uid));
  // Only allow writes through Cloud Function
  allow write: if false;
}
```

### Access Control
- ✅ Only Cloud Functions can write analytics data
- ✅ Only verified admins can read analytics data
- ✅ Regular users cannot access this collection
- ✅ All timestamps use server-side generation

---

## Sample Analytics Data

```json
{
  "userId": "abc123",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "claimAmount": 3.45,
  "claimedAt": "2026-02-06T08:00:00.000Z",
  "claimedDate": "2026-02-06",
  "secretCode": "MANA2026",
  "timeToClaim": 120000,
  "timeToClaimMinutes": 2,
  "poolBefore": 500.00,
  "poolAfter": 496.55,
  "rewardPoolId": "currentActiveReward"
}
```

---

## Future Enhancements

### Potential Additional Fields
- **deviceType**: "mobile" | "desktop" | "tablet"
- **referralSource**: Track if user came from specific Telegram post
- **claimLocation**: IP-based location (optional, privacy-sensitive)
- **userTier**: Track if user is regular/premium/vip
- **consecutiveDays**: Streak of daily claims

### Advanced Analytics
- **Claim Heatmap**: Visualize peak claiming times
- **User Segments**: Group users by claim behavior
- **Retention Analysis**: Track users who claim regularly
- **Code Effectiveness**: Compare different secret codes
- **Pool Optimization**: Determine optimal pool sizes

---

## Maintenance

### Data Retention
Consider implementing a cleanup policy:
- Keep detailed records for 90 days
- Aggregate older data into monthly summaries
- Archive data older than 1 year

### Regular Tasks
1. **Weekly**: Review top claimers for suspicious activity
2. **Monthly**: Generate performance reports
3. **Quarterly**: Optimize indexes based on query patterns

---

## Support & Questions

For technical support or questions about the analytics system:
- Check Cloud Function logs in Firebase Console
- Review Firestore indexes for performance
- Monitor function execution times and costs

**Status:** ✅ Deployed and Active
**Last Updated:** February 6, 2026
