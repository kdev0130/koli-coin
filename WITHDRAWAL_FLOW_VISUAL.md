# Withdrawal Flow - Visual Guide

## User Journey Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    DONATION CONTRACT LIFECYCLE                   │
└─────────────────────────────────────────────────────────────────┘

   User Side (This Repo)              |        Admin Side (Other Repo)
═══════════════════════════════════════════════════════════════════

1. CREATE DONATION
   ┌──────────────┐
   │ User submits │ ─────────────────┐
   │ ₱3,000 with  │                  │
   │   receipt    │                  ▼
   └──────────────┘         ┌─────────────────┐
         │                  │ Admin reviews   │
         │                  │   receipt       │
         ▼                  └─────────────────┘
   ┌──────────────┐                  │
   │  Status:     │                  │
   │  "pending"   │◄─────────────────┘
   └──────────────┘         ┌─────────────────┐
                            │ Admin APPROVES  │
                            │ Sets start date │
                            │ Sets end date   │
                            └─────────────────┘
                                     │
                                     ▼
   ┌──────────────┐         ┌─────────────────┐
   │  Status:     │◄────────│   Activated!    │
   │  "active"    │         │ Contract begins │
   └──────────────┘         └─────────────────┘
         │
         │
         ▼
   ⏰ WAIT 30 DAYS
         │
         ▼
─────────────────────────────────────────────────────────────────

2. FIRST WITHDRAWAL (After 30 days)
   
   ┌──────────────┐
   │ User sees    │
   │ countdown:   │
   │ 00:00:00:00  │
   └──────────────┘
         │
         ▼
   ┌──────────────┐
   │ Button turns │
   │    GREEN     │
   │ "Withdraw    │
   │   ₱900"      │
   └──────────────┘
         │
         │ (User clicks)
         ▼
   ┌──────────────────────────────┐
   │   WITHDRAWAL MODAL OPENS     │
   │                              │
   │  ┌────────────────────────┐  │
   │  │ Contract: ₱3,000       │  │
   │  │ Amount: ₱900 (30%)     │  │
   │  │ Withdrawal: 1/12       │  │
   │  └────────────────────────┘  │
   │                              │
   │  ┌────────────────────────┐  │
   │  │ ✓ KYC: Verified        │  │
   │  │ ⏱ P2P: 24hr processing │  │
   │  └────────────────────────┘  │
   │                              │
   │  ┌────────────────────────┐  │
   │  │ Enter 6-digit PIN:     │  │
   │  │   [••••••]             │  │
   │  └────────────────────────┘  │
   │                              │
   │      [Cancel] [Confirm]      │
   └──────────────────────────────┘
                │
                │ (User enters PIN)
                ▼
        ┌───────────────┐
        │ PIN Verified? │
        └───────────────┘
          │           │
         YES          NO
          │           └──► ❌ "Incorrect PIN"
          ▼
   ┌──────────────────────┐
   │ Create payout_queue  │ ─────────────┐
   │      document        │              │
   └──────────────────────┘              │
          │                              ▼
          │                    ┌──────────────────┐
          │                    │ Admin Dashboard  │
          │                    │ shows new payout │
          │                    │ request          │
          │                    └──────────────────┘
          ▼                              │
   ┌──────────────────────┐              │
   │ Update contract:     │              ▼
   │ - withdrawalsCount:1 │    ┌──────────────────┐
   │ - lastWithdrawalDate │    │ Admin sends ₱900 │
   │ - Reset 30-day timer │    │ to user's GCash  │
   └──────────────────────┘    │ or Bank account  │
          │                    └──────────────────┘
          ▼                              │
   ┌──────────────────────┐              │
   │ ✅ Success Toast:    │              ▼
   │ "Withdrawal Request  │    ┌──────────────────┐
   │  Submitted!"         │    │ Mark payout as   │
   └──────────────────────┘    │   "completed"    │
          │                    └──────────────────┘
          │                              │
          ▼                              ▼
   ┌──────────────────────┐    ┌──────────────────┐
   │ Modal closes         │    │ User receives    │
   │ Countdown resets to  │    │ ₱900 in account  │
   │    30 days           │    └──────────────────┘
   └──────────────────────┘
          │
          ▼
   ⏰ WAIT 30 MORE DAYS
          │
          ▼
─────────────────────────────────────────────────────────────────

3. SECOND WITHDRAWAL (After another 30 days)
   
   [Same process repeats]
   
   Withdrawal: 2/12
   Amount: ₱900 (still 30% of ₱3,000)
   
─────────────────────────────────────────────────────────────────

4. ... WITHDRAWALS 3-11 ...
   
   [Same process 10 more times]
   
─────────────────────────────────────────────────────────────────

5. FINAL WITHDRAWAL (12th withdrawal)
   
   ┌──────────────────────┐
   │ Withdrawal: 12/12    │
   │ Amount: ₱900         │
   └──────────────────────┘
          │
          ▼
   ┌──────────────────────┐
   │ Status changed to:   │
   │   "completed"        │
   └──────────────────────┘
          │
          ▼
   ┌──────────────────────┐
   │ Contract ENDS        │
   │                      │
   │ Total Withdrawn:     │
   │   ₱10,800            │
   │                      │
   │ Principal Remains:   │
   │   ₱3,000             │
   └──────────────────────┘

═══════════════════════════════════════════════════════════════════
```

---

## State Diagram

```
                    ┌──────────┐
                    │ PENDING  │ ◄── User creates donation
                    └──────────┘
                         │
                         │ (Admin approves)
                         ▼
                    ┌──────────┐
             ┌─────►│  ACTIVE  │◄─────┐
             │      └──────────┘      │
             │           │            │
             │           │            │
             │      (30 days pass)    │
             │           │            │
             │           ▼            │
             │      ┌──────────┐      │
             │      │ User can │      │
             │      │ withdraw │      │
             │      └──────────┘      │
             │           │            │
             │           │            │
             │      (User withdraws)  │
             │           │            │
             │           ▼            │
             │    ┌────────────┐     │
             │    │ Update:    │     │
             │    │ +1 count   │     │
             │    │ reset timer│─────┘
             │    └────────────┘
             │           │
             │           │ (count < 12)
             └───────────┘
                         │
                         │ (count = 12)
                         ▼
                    ┌──────────┐
                    │COMPLETED │
                    └──────────┘
```

---

## Countdown Timer Visual

```
Contract Card View:

┌────────────────────────────────────────────────────┐
│  ₱3,000                             Withdrawals 5/12│
│  ✓ Active                                           │
├────────────────────────────────────────────────────┤
│                                                     │
│  Per Withdrawal: ₱900        Total: ₱4,500         │
│                              Remaining: ₱6,300     │
│                                                     │
│  [════════════════════════════50%══════════]       │
│  Jan 5, 2026                          Jan 5, 2027  │
│                                                     │
├────────────────────────────────────────────────────┤
│  ⏰ Next withdrawal in:                            │
│                                                     │
│     15  :  08  :  42  :  33                        │
│    days   hours  mins   secs                       │
│                                                     │
│  [        Not Yet Available         ]              │
└────────────────────────────────────────────────────┘


When Ready:

┌────────────────────────────────────────────────────┐
│  ₱3,000                             Withdrawals 5/12│
│  ✓ Ready to Withdraw                                │
├────────────────────────────────────────────────────┤
│                                                     │
│  Per Withdrawal: ₱900        Total: ₱4,500         │
│                              Remaining: ₱6,300     │
│                                                     │
│  [════════════════════════════50%══════════]       │
│  Jan 5, 2026                          Jan 5, 2027  │
│                                                     │
├────────────────────────────────────────────────────┤
│  ✓ Ready to withdraw ₱900!                         │
│                                                     │
│     00  :  00  :  00  :  00                        │
│    days   hours  mins   secs                       │
│                                                     │
│  [       Withdraw ₱900         ]  ◄── GREEN        │
└────────────────────────────────────────────────────┘
```

---

## Security Checkpoints

```
Withdrawal Request
      │
      ▼
┌─────────────┐
│ Checkpoint 1│ ──► Is contract active?
└─────────────┘
      │
      ▼
┌─────────────┐
│ Checkpoint 2│ ──► Has 30 days passed?
└─────────────┘
      │
      ▼
┌─────────────┐
│ Checkpoint 3│ ──► Less than 12 withdrawals?
└─────────────┘
      │
      ▼
┌─────────────┐
│ Checkpoint 4│ ──► Is KYC verified?
└─────────────┘
      │
      ▼
┌─────────────┐
│ Checkpoint 5│ ──► Is PIN correct?
└─────────────┘
      │
      ▼
┌─────────────┐
│ Checkpoint 6│ ──► Does contract belong to user?
└─────────────┘
      │
      ▼
 ✅ APPROVED
Create P2P queue
Update contract
Show success
```

---

## Database Flow

```
User Action: Click "Withdraw ₱900"
     │
     ▼
┌──────────────────────────────────────┐
│ 1. READ: donationContracts/{id}      │
│    - Get contract details            │
│    - Validate eligibility            │
└──────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ 2. READ: members/{userId}            │
│    - Get user details                │
│    - Verify KYC status               │
│    - Get phone/email                 │
└──────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ 3. VERIFY: PIN hash                  │
│    - Compare input with stored hash  │
└──────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ 4. WRITE: payout_queue (NEW DOC)     │
│    - userId, amount, contract info   │
│    - status: "pending"               │
│    - timestamp                       │
└──────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ 5. UPDATE: donationContracts/{id}    │
│    - withdrawalsCount: +1            │
│    - lastWithdrawalDate: now()       │
│    - status: completed? (if 12th)    │
└──────────────────────────────────────┘
     │
     ▼
  ✅ SUCCESS
  Show toast
  Close modal
  
     │
     ▼ (Real-time listener)
     
┌──────────────────────────────────────┐
│ 6. UI AUTO-UPDATES                   │
│    - New withdrawal count            │
│    - Countdown resets                │
│    - Button disabled                 │
└──────────────────────────────────────┘
```

---

## Error Scenarios

```
┌─────────────────────┐
│ User clicks Withdraw│
└─────────────────────┘
         │
         ▼
    ┌────────┐
    │ Checks │
    └────────┘
         │
    ┌────┴────┐
    │         │
   PASS      FAIL
    │         │
    │         ├─► Not verified? ──► Show KYC error
    │         │
    │         ├─► Too early? ──► Show countdown
    │         │
    │         ├─► Wrong PIN? ──► Show PIN error
    │         │
    │         ├─► Contract expired? ──► Show expired
    │         │
    │         └─► 12 withdrawals? ──► Show completed
    │
    ▼
 SUCCESS
```

---

## Key Points

### Principal NEVER Changes
```
Day 1:    ₱3,000 (principal)
Day 30:   ₱3,000 (still the same after withdrawal #1)
Day 60:   ₱3,000 (still the same after withdrawal #2)
...
Day 360:  ₱3,000 (still the same after withdrawal #12)

Total withdrawn: ₱10,800 (₱900 × 12)
Principal remains: ₱3,000 ✓
```

### 30-Day Cycle
```
Withdrawal #1: Jan 5, 2026 at 10:00 AM
Next available: Feb 4, 2026 at 10:00 AM (exactly 30 days)

Countdown shows:
- 29d 23h 59m 59s
- 29d 23h 59m 58s
- 29d 23h 59m 57s
- ...
- 00d 00h 00m 01s
- 00d 00h 00m 00s ✓ READY!
```

### P2P Manual Processing
```
User Request  ──►  payout_queue  ──►  Admin Dashboard
                                           │
                                           ▼
                                    Admin sends funds
                                           │
                                           ▼
                                    Mark as completed
                                           │
                                           ▼
                                    User receives money
```

This visual guide provides a complete picture of the withdrawal flow!
