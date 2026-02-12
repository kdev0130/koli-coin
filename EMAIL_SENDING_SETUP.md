# Email Sending Setup Guide

This guide will help you set up real email sending for OTP verification.

## Prerequisites

You need an email account to send emails from. We'll use **Gmail** in this example, but you can use other services.

## Option 1: Using Gmail (Recommended for Development)

### Step 1: Create an App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Select **Security** from the left menu
3. Under "Signing in to Google", select **2-Step Verification** (enable it if not already enabled)
4. Scroll down and select **App passwords**
5. Select app: **Mail**
6. Select device: **Other** (enter "KOLI App")
7. Click **Generate**
8. Copy the 16-character password (it will be shown only once)

### Step 2: Configure Firebase Functions Environment Variables

Since the legacy `firebase functions:config:set` is deprecated, you need to set environment variables through the Firebase Console:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project (koli-2bad9)
3. Navigate to **Functions** in the left sidebar
4. Click on **Configuration** tab
5. Under **Environment variables**, add the following:
   - Key: `email.user`, Value: `your-email@gmail.com`
   - Key: `email.pass`, Value: `your-16-char-app-password`
   - Key: `email.from`, Value: `noreply@koli-coin.com` (optional)
   - Key: `email.service`, Value: `gmail` (optional, defaults to gmail)

Alternatively, you can set them locally for testing by creating a `.env` file in the `functions/` directory:

```
email.user=your-email@gmail.com
email.pass=your-16-char-app-password
email.from=noreply@koli-coin.com
email.service=gmail
```

### Step 3: Deploy the Email Function

```bash
firebase deploy --only functions:sendVerificationEmail
```

## Option 2: Using SendGrid (Recommended for Production)

### Step 1: Create SendGrid Account

1. Go to https://sendgrid.com/
2. Sign up for a free account (100 emails/day free)
3. Verify your sender identity (email address)
4. Create an API Key:
   - Go to Settings > API Keys
   - Click "Create API Key"
   - Give it a name (e.g., "KOLI OTP")
   - Select "Full Access"
   - Copy the API Key

### Step 2: Update sendVerificationEmail.js

Replace the transporter creation with SendGrid:

```javascript
// Install @sendgrid/mail first: cd functions && npm install @sendgrid/mail

import sgMail from '@sendgrid/mail';

sgMail.setApiKey(sendGridApiKey.value());

const msg = {
  to: emailData.to,
  from: emailFrom.value(), // Must be verified in SendGrid
  subject: emailData.subject || 'Your KOLI Verification Code',
  text: emailData.text,
  html: emailData.html,
};

await sgMail.send(msg);
```

### Step 3: Configure Firebase Functions

```bash
firebase functions:config:set sendgrid.apikey="YOUR_SENDGRID_API_KEY"
firebase functions:config:set email.from="noreply@koli-coin.com"
```

### Step 4: Deploy

```bash
firebase deploy --only functions:sendVerificationEmail
```

## Testing

After deployment, try signing up with a real email address. You should receive:

1. A verification code email within seconds
2. The email will come from your configured sender address
3. The email will have the KOLI branding and a 6-digit code

## Troubleshooting

### "Invalid login" error with Gmail

- Make sure 2-Step Verification is enabled
- Use an App Password, not your regular Gmail password
- Check that you copied the entire 16-character password without spaces

### Emails not arriving

- Check spam/junk folder
- Verify your sender email is correct
- Check Firebase Functions logs: `firebase functions:log`
- Make sure the function deployed successfully

### View Function Logs

```bash
# View recent logs
firebase functions:log

# View logs for specific function
firebase functions:log --only sendVerificationEmail
```

## Current Configuration Commands

For quick setup with Gmail, run these (replace with your credentials):

```bash
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.pass="your-16-char-app-password"
firebase functions:config:set email.from="KOLI <noreply@koli-coin.com>"
firebase functions:config:set email.service="gmail"
firebase deploy --only functions:sendVerificationEmail
```

## Monitoring

Check the Firebase Console to monitor email sending:
1. Go to Firebase Console > Functions
2. Click on `sendVerificationEmail`
3. View logs and execution history

## Cost Estimate

- **Gmail**: Free (limited to ~500 emails/day)
- **SendGrid**: Free tier (100 emails/day), then $19.95/month for 50k emails
- **Firebase Functions**: Free tier includes 2M invocations/month

For a small app, this setup is completely free!
