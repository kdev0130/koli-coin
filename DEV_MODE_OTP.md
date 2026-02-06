# Development Mode - Email OTP Without Backend

## Quick Start for Testing Without Firebase Functions

If you want to test the signup flow immediately without setting up Firebase Functions and email service, follow this guide.

## Option 1: Console Logging (Recommended for Dev)

### Step 1: Modify emailOtpService.ts

Open `src/lib/emailOtpService.ts` and find the `sendEmailOtp` function around line 57-67.

**Replace this:**
```typescript
// Send branded email
await sendBrandedEmail(normalizedEmail, otp);
```

**With this:**
```typescript
// 🚧 DEVELOPMENT MODE - Log OTP to console
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📧 EMAIL VERIFICATION CODE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Email:', normalizedEmail);
console.log('OTP Code:', otp);
console.log('Expires:', new Date(expiresAt).toLocaleTimeString());
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Send branded email (disabled in dev mode)
// await sendBrandedEmail(normalizedEmail, otp);
```

### Step 2: Test the Flow

1. Start your dev server: `pnpm dev`
2. Navigate to signup page
3. Enter your email and click "Send Verification Code"
4. **Check browser console** (F12) for the OTP code
5. Enter the 6-digit code from console
6. Continue with signup

### Important Notes:
- OTP will appear in browser DevTools console
- Still validates expiration (5 minutes)
- Still enforces resend cooldown (60 seconds)
- All security features still work
- **Remember to remove this before production!**

## Option 2: Fixed Test OTP

For even simpler testing, you can use a fixed OTP code.

### Modify emailOtpService.ts:

In the `sendEmailOtp` function, replace:
```typescript
const otp = generateOtp();
```

With:
```typescript
// 🚧 DEV ONLY: Use fixed OTP for testing
const otp = "123456";
console.log('🔓 DEV MODE: Using test OTP 123456 for', normalizedEmail);
```

Now you can always use `123456` as the verification code during development.

## Option 3: Skip OTP Verification (Not Recommended)

If you want to completely bypass OTP verification for rapid testing:

### Modify SignUp.tsx:

Find the `handleVerifyOtp` function and replace it with:
```typescript
const handleVerifyOtp = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // 🚧 DEV ONLY: Skip verification
  console.log('🔓 DEV MODE: Skipping OTP verification');
  setStep("details");
  return;
  
  // Original verification code...
};
```

**Warning**: This completely disables email verification security!

## Production Checklist

Before deploying to production, make sure to:

- [ ] Remove all console.log statements for OTP codes
- [ ] Remove any fixed/test OTP codes
- [ ] Re-enable `sendBrandedEmail()` function
- [ ] Set up Firebase Functions properly
- [ ] Configure email service (SendGrid/Gmail)
- [ ] Test with real email addresses
- [ ] Verify OTP emails are being received
- [ ] Check spam filters
- [ ] Monitor Firebase Functions logs

## Verification Status

You can verify your current mode by checking the console output:
- ✅ Production: No OTP in console, email sent
- 🚧 Development: OTP visible in console
- 🔓 Test Mode: Fixed OTP or skipped verification

## Need Help?

1. **OTP not working**: Check browser console for the code
2. **Can't find console**: Press F12 or right-click → Inspect → Console tab
3. **Still stuck**: See `FIREBASE_FUNCTIONS_SETUP.md` for full email setup

## Example Console Output

When using dev mode, you'll see:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 EMAIL VERIFICATION CODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: user@example.com
OTP Code: 847293
Expires: 2:45:30 PM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Simply copy `847293` and paste it into the OTP input field.

## Security Reminder

These development shortcuts are **only for local testing**. Never use them in:
- Staging environment
- Production environment
- Public demos
- Client presentations

Always use proper email verification in production for security compliance.
