# Firebase Functions Setup for Email OTP

## Overview
The email OTP service requires Firebase Functions to send branded verification emails. This guide explains how to set up the backend email sending function.

## Prerequisites
- Firebase project already configured
- Node.js 18+ installed
- Firebase CLI installed: `npm install -g firebase-tools`

## Setup Steps

### 1. Initialize Firebase Functions

```bash
# Login to Firebase
firebase login

# Initialize Functions (if not already done)
firebase init functions

# Choose:
# - JavaScript or TypeScript
# - Install dependencies
```

### 2. Install Required Packages

```bash
cd functions
npm install nodemailer @sendgrid/mail
```

### 3. Create Email Sending Function

Create `functions/src/sendVerificationEmail.js`:

```javascript
const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');

// Set SendGrid API Key (add to Firebase Functions config)
const SENDGRID_API_KEY = functions.config().sendgrid.key;
sgMail.setApiKey(SENDGRID_API_KEY);

exports.sendVerificationEmail = functions.https.onCall(async (data, context) => {
  const { to, otp, appName, primaryColor, logoUrl } = data;

  // Validate input
  if (!to || !otp) {
    throw new functions.https.HttpsError('invalid-argument', 'Email and OTP are required');
  }

  // Email template with branding
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          background-color: #f4f4f5;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, ${primaryColor || '#8B5CF6'} 0%, ${primaryColor || '#7C3AED'} 100%);
          padding: 40px 20px;
          text-align: center;
        }
        .logo {
          max-width: 80px;
          height: auto;
          margin-bottom: 20px;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
        }
        .otp-code {
          background: #f3f4f6;
          border: 2px dashed ${primaryColor || '#8B5CF6'};
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          margin: 30px 0;
        }
        .otp-code h2 {
          font-size: 36px;
          letter-spacing: 8px;
          color: ${primaryColor || '#8B5CF6'};
          margin: 0;
          font-weight: 700;
        }
        .otp-label {
          color: #6b7280;
          font-size: 14px;
          margin-top: 8px;
        }
        .warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 16px;
          margin: 24px 0;
          border-radius: 8px;
        }
        .warning strong {
          color: #92400e;
          display: block;
          margin-bottom: 8px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #9ca3af;
          font-size: 12px;
          border-top: 1px solid #e5e7eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl || ''}" alt="${appName || 'App'} Logo" class="logo">
          <h1>${appName || 'App Name'}</h1>
        </div>
        <div class="content">
          <h2 style="color: #111827; margin-top: 0;">Verify Your Email</h2>
          <p style="color: #4b5563;">Enter this verification code to complete your signup:</p>
          
          <div class="otp-code">
            <h2>${otp}</h2>
            <p class="otp-label">Your 6-digit verification code</p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            ⏱️ <strong>This code will expire in 5 minutes</strong>
          </p>
          
          <div class="warning">
            <strong>🔒 Security Notice</strong>
            <p style="margin: 0; color: #78350f; font-size: 14px;">
              Do not share this code with anyone. ${appName || 'Our'} staff will never ask for your verification code.
            </p>
          </div>
          
          <p style="color: #9ca3af; font-size: 13px; margin-top: 30px;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${appName || 'App Name'}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const msg = {
    to,
    from: functions.config().sendgrid.from || 'noreply@yourapp.com',
    subject: \`\${otp} is your \${appName || 'App'} verification code\`,
    text: \`Your verification code is: \${otp}. This code will expire in 5 minutes.\`,
    html: htmlContent,
  };

  try {
    await sgMail.send(msg);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email');
  }
});
```

### 4. Configure SendGrid

```bash
# Set SendGrid API Key
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"
firebase functions:config:set sendgrid.from="noreply@yourdomain.com"
```

### 5. Deploy Functions

```bash
firebase deploy --only functions
```

## Alternative: Using Gmail SMTP

If you prefer Gmail SMTP instead of SendGrid:

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().gmail.email,
    pass: functions.config().gmail.password, // Use App Password
  },
});

// Configure:
firebase functions:config:set gmail.email="your-email@gmail.com"
firebase functions:config:set gmail.password="your-app-password"
```

## Testing Locally

```bash
# Get Firebase config
firebase functions:config:get > .runtimeconfig.json

# Start emulator
firebase emulators:start --only functions

# Test from frontend
# Update emailOtpService.ts to use localhost:5001
```

## Important Notes

1. **Email Provider**: Choose between SendGrid, Gmail, AWS SES, or other providers
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **Email Templates**: Customize the HTML template to match your brand
4. **Error Handling**: Monitor Functions logs for email delivery issues
5. **Costs**: Be aware of email service costs and Firebase Functions pricing

## Temporary Workaround (Development Only)

For development/testing without email:
- Comment out the `sendBrandedEmail` call in `emailOtpService.ts`
- Log the OTP to console instead
- Manually enter the OTP from console

```typescript
// Development only - log OTP instead of sending email
console.log('[DEV] OTP for', email, ':', otp);
// await sendBrandedEmail(normalizedEmail, otp);
```

## Security Recommendations

- Never expose OTP in plain text in logs (production)
- Always use HTTPS
- Implement rate limiting (max 5 OTP requests per hour per email)
- Use environment variables for sensitive credentials
- Monitor for suspicious activity

## Support

For issues with:
- SendGrid: https://docs.sendgrid.com/
- Firebase Functions: https://firebase.google.com/docs/functions
- Nodemailer: https://nodemailer.com/
