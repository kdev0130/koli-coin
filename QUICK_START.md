# Quick Start Guide - Donation Contract System

## 🚀 Getting Started

Your donation contract system is now fully implemented! Here's how to use it:

## 📱 User Flow

### Creating a Contract

1. Navigate to the Donation page
2. Click "Create New Donation Contract"
3. **Step 1:** Enter donation amount and select payment method
   - Watch the contract preview update in real-time
   - Shows: Principal, First withdrawal date, Per-withdrawal amount, Total withdrawals, Contract end date
4. **Step 2:** Upload payment receipt
5. Submit → Contract created!

### Managing Contracts

**Portfolio Overview (Top Cards):**
- Total Principal: Sum of all active donations (never decreases)
- Total Withdrawn: Amount you've withdrawn so far
- Available Now: Amount ready to withdraw right now

**Contract Cards:**
- Shows all your active contracts
- Green badge = Ready to withdraw
- Orange badge = Growing (waiting for 30 days)
- Progress bar shows contract duration
- Withdrawal counter (X/12)

### Withdrawing Funds

1. Find contract with green "Ready" badge
2. Click "Withdraw ₱X,XXX" button
3. Funds added to balance
4. Withdrawal counter updates (X+1/12)
5. Next withdrawal available in 30 days

## 💡 Quick Examples

### Example 1: Create ₱5,000 Contract
```
Day 0:  Donate ₱5,000
Day 30: Withdraw ₱1,500 (1/12)
Day 60: Withdraw ₱1,500 (2/12)
...
Day 360: Withdraw ₱1,500 (12/12)

Total withdrawn: ₱18,000 (260% ROI)
Principal: ₱5,000 (never changed)
```

### Example 2: Multiple Contracts
```
Contract A: ₱3,000 created on Jan 1
Contract B: ₱2,000 created on Jan 15

On Feb 1:
- Can withdraw ₱900 from Contract A ✅
- Cannot withdraw from Contract B (only 16 days)

On Feb 15:
- Can withdraw ₱900 from Contract A (if not done on Feb 1)
- Can withdraw ₱600 from Contract B ✅
```

## 🎯 Key Rules

### ✅ DO
- Create multiple contracts for diversification
- Withdraw every 30 days to maximize returns
- Check "Available Now" card for ready withdrawals
- Review contract preview before creating

### ❌ DON'T
- Expect withdrawals before 30 days
- Try to withdraw more than 30%
- Attempt double withdrawal in same period
- Expect principal amount to change

## 🔍 Understanding Contract States

### Active (Green Badge)
- ✅ Ready to withdraw
- 30+ days since last withdrawal
- Less than 12 withdrawals used
- Contract not expired

### Growing (Orange Badge)
- ⏳ Waiting for next 30-day period
- Shows countdown timer
- Withdraw button disabled

### Completed (Blue Badge)
- 🎉 All 12 withdrawals used
- No more withdrawals available
- Can create new contract

### Expired (Gray Badge)
- ⏱️ More than 1 year passed
- Unused withdrawals forfeited
- Contract closed

## 📊 Contract Preview Explained

When creating a contract, the preview shows:

```
CONTRACT PREVIEW

Principal (Never Reduces): ₱5,000
First Withdrawal: March 5, 2026
Per Withdrawal (30%): ₱1,500
Total Withdrawals: 12 (Once per 30 days)
Max Total Withdrawal: ₱18,000
Contract Ends: February 3, 2027
```

**What this means:**
- Your ₱5,000 donation stays as ₱5,000 forever
- First money comes back on March 5
- Every 30 days, you can take ₱1,500
- Do this 12 times over one year
- Total you can get back: ₱18,000
- After Feb 3, 2027, no more withdrawals

## 🎨 UI Elements

### Portfolio Cards
- **Koli Gold** = Total Principal
- **Blue** = Total Withdrawn
- **Green** = Available Now (with badge count)

### Contract Cards
- **Top Left:** Principal amount
- **Top Right:** Withdrawal counter (X/12)
- **Middle:** Per-withdrawal and Total withdrawn
- **Progress Bar:** Contract duration (0-100%)
- **Status Box:** Green (ready) or Orange (waiting) with timer
- **Button:** Withdraw or countdown message

### Terms Notice Box
- Lists all important rules
- Located at bottom of page
- Review before first contract

## 🐛 Troubleshooting

### "Must wait 30 days after donation"
✅ Normal behavior for new contracts  
⏰ First withdrawal unlocks after 30 days  
💡 Check "First Withdrawal" date in contract card

### "Must wait 30 days between withdrawals"
✅ Normal behavior between withdrawals  
⏰ Each withdrawal requires 30-day cooldown  
💡 Watch countdown timer in status box

### "All 12 withdrawals have been used"
✅ Contract completed successfully!  
🎉 You got all your money  
💡 Create new contract if needed

### Contract not appearing
❌ Check if you're logged in  
❌ Verify receipt uploaded successfully  
💡 Refresh page or check browser console

### Withdraw button disabled
⏰ Wait for countdown to reach 0  
📅 Check "Days remaining" in status box  
💡 Green badge = ready, Orange = waiting

## 📞 Support

**Check Console Logs:**
Open browser console (F12) and look for:
- `[Real-time Update] donationContracts:`
- Shows contract data updates
- Helps debug issues

**Firebase Console:**
- Project: koli-2bad9
- Collection: donationContracts
- View your contracts directly

## 🎓 Best Practices

1. **Create First Contract Early**
   - Start earning right away
   - Get familiar with system

2. **Set Withdrawal Reminders**
   - Withdraw every 30 days
   - Maximize your returns

3. **Track Your Contracts**
   - Review portfolio regularly
   - Plan future contracts

4. **Start Small**
   - Test with smaller amount
   - Scale up once comfortable

5. **Read the Terms**
   - Understand all rules
   - No surprises later

## 🎯 Success Tips

### Maximum Returns Strategy
```
1. Create contract immediately
2. Set calendar reminder for Day 30
3. Withdraw on Day 30 (don't wait)
4. Set next reminder for Day 60
5. Repeat for 12 months
6. Create new contract when done
```

### Multi-Contract Strategy
```
Week 1: Create ₱3,000 contract
Week 3: Create ₱2,000 contract
Week 5: Create ₱1,500 contract

Result:
- Staggered withdrawal dates
- Regular income stream
- Risk diversification
```

### Compound Strategy
```
Month 1: Donate ₱5,000
Month 2: Withdraw ₱1,500 → Create new ₱1,500 contract
Month 3: Withdraw ₱1,500 → Create new ₱1,500 contract
...

Result:
- Growing portfolio
- Compound-like growth
- Multiple income streams
```

## 📱 Mobile Usage

The system is fully responsive:
- Works on all mobile devices
- Touch-friendly buttons
- Swipe to scroll contracts
- All features available

## ⚡ Quick Reference

| Action | Location | Requirements |
|--------|----------|--------------|
| Create Contract | Top button | Amount > 0, Payment receipt |
| View Portfolio | Top 3 cards | None |
| Check Statistics | Contract stats card | None |
| Withdraw Funds | Contract card button | 30 days passed, < 12 used |
| View Terms | Bottom notice box | None |

## 📈 Expected Timeline

```
Day 0   ████ Create Contract (₱5,000)
Day 30  ████ 1st Withdrawal (₱1,500)  Balance: ₱1,500
Day 60  ████ 2nd Withdrawal (₱1,500)  Balance: ₱3,000
Day 90  ████ 3rd Withdrawal (₱1,500)  Balance: ₱4,500
Day 120 ████ 4th Withdrawal (₱1,500)  Balance: ₱6,000
Day 150 ████ 5th Withdrawal (₱1,500)  Balance: ₱7,500
Day 180 ████ 6th Withdrawal (₱1,500)  Balance: ₱9,000
Day 210 ████ 7th Withdrawal (₱1,500)  Balance: ₱10,500
Day 240 ████ 8th Withdrawal (₱1,500)  Balance: ₱12,000
Day 270 ████ 9th Withdrawal (₱1,500)  Balance: ₱13,500
Day 300 ████ 10th Withdrawal (₱1,500) Balance: ₱15,000
Day 330 ████ 11th Withdrawal (₱1,500) Balance: ₱16,500
Day 360 ████ 12th Withdrawal (₱1,500) Balance: ₱18,000 ✅
```

---

**Ready to start?** Navigate to the Donation page and click "Create New Donation Contract"!

**Questions?** Check `DONATION_CONTRACT.md` for detailed documentation.

**Issues?** Check browser console for real-time logs.
