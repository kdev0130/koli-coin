# 📧 Email OTP Verification Setup Guide

This guide will help you set up email-based OTP verification for your KOLI application using Firebase.

## 🚀 Quick Start

### Option 1: Firebase Cloud Functions (Recommended)

#### 1. Install Dependencies
```bash
cd functions
npm install firebase-functions firebase-admin nodemailer
```

#### 2. Deploy Cloud Function
```bash
# Copy the provided firebase-functions-email.js to your functions/index.js
firebase deploy --only functions
```

#### 3. Configure Email Credentials
```bash
# For Gmail (requires App Password)
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.password="your-app-password"

# For SendGrid
firebase functions:config:set sendgrid.key="your-sendgrid-api-key"
```

#### 4. Set Environment Variables
```bash
# Copy .env.example to .env and add:
OTP_SECRET=your-super-secret-key-change-in-production
```

### Option 2: Direct SMTP (Development)

#### 1. Configure Environment Variables
```env
OTP_SECRET=your-secret-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### 2. Update Email Service
The email service will automatically detect environment variables and use direct SMTP.

## 📧 Email Service Setup

### Gmail Setup
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password in your configuration

### SendGrid Setup
1. Sign up at [SendGrid](https://sendgrid.com/)
2. Create an API key in Settings → API Keys
3. Verify your sender email/domain
4. Use the API key in your configuration

### Custom SMTP Setup
1. Get SMTP credentials from your email provider
2. Configure the SMTP settings in your environment variables

## 🔐 Security Features

### ✅ What's Included
- **Email OTP delivery** via multiple providers
- **Hashed OTP storage** (never plain text)
- **OTP expiration** (5 minutes)
- **Rate limiting** and spam protection
- **Secure session management**
- **Automatic cleanup** of expired data

### 🛡️ Security Measures
- OTP codes are hashed with email + secret salt
- Session-based verification prevents replay attacks
- Automatic expiration and cleanup
- Rate limiting prevents abuse
- No user creation until email verified

## 🌐 Email Template

### Features
- **Responsive HTML design**
- **Security warnings**
- **Clear expiration notice**
- **Professional branding**
- **Accessibility friendly**

### Customization
Edit the `generateEmailHTML()` function in your email service to customize:
- Branding and colors
- Email content and warnings
- Styling and layout

## 📊 Monitoring & Debugging

### Firebase Console
- View Cloud Function logs in Firebase Console
- Monitor email queue collection in Firestore
- Track OTP verification success rates

### Email Provider Monitoring
- **Gmail**: Check sent items and delivery reports
- **SendGrid**: Use SendGrid dashboard for analytics
- **Custom SMTP**: Check provider-specific analytics

### Development Debugging
- Check browser console for OTP verification logs
- View Firestore collections: `pendingOTPs`, `emailQueue`
- Monitor email delivery status in real-time

## 🧪 Testing

### Manual Testing Flow
1. Start development server: `pnpm dev`
2. Navigate to signup page
3. Fill out form with valid email address
4. Check email for 6-digit verification code
5. Enter code to complete verification
6. Account created and redirected to dashboard

### Development Features
- Console logging for all verification steps
- Email queue visible in Firestore
- OTP codes logged in development mode
- Comprehensive error handling and user feedback

## ⚡ Performance Optimization

### Email Delivery
- Use Firebase Cloud Functions for scalability
- Queue-based email sending prevents blocking
- Automatic retries for failed email delivery
- Cleanup of old email records

### Cost Optimization
- Email queue cleanup prevents storage bloat
- OTP expiration reduces storage requirements
- Efficient Firestore queries with proper indexing
- Rate limiting reduces unnecessary email sends

## 🐛 Troubleshooting

### Common Issues

#### "Failed to send verification email"
- Check email service credentials
- Verify Firebase Functions deployment
- Check Cloud Function logs for errors
- Ensure email provider allows SMTP access

#### "Invalid verification code"
- Code may have expired (5-minute limit)
- Check for typos in the 6-digit code
- Verify email address matches exactly
- Try requesting a new code

#### Email not received
- Check spam/junk folders
- Verify email address is correct
- Check email provider's delivery status
- Wait a few minutes for delivery

#### Rate limiting errors
- Wait 60 seconds between OTP requests
- Check if maximum attempts exceeded
- Clear browser cache and try again

### Debug Steps
1. Check browser console for error messages
2. View Firebase Functions logs
3. Check Firestore collections for data
4. Verify environment variables are set
5. Test with different email addresses

## 📋 Firestore Schema

### pendingOTPs Collection
```typescript
{
  email: string;           // User's email address
  hashedOTP: string;       // SHA256 hashed OTP
  attempts: number;        // Number of attempts
  maxAttempts: number;     // Maximum allowed attempts (3)
  createdAt: Timestamp;    // When OTP was created
  expiresAt: Timestamp;    // When OTP expires (5 min)
  lastSentAt: Timestamp;   // Last OTP send time
}
```

### emailQueue Collection
```typescript
{
  to: string;              // Recipient email
  subject: string;         // Email subject
  html: string;            // HTML email content
  text: string;            // Plain text fallback
  createdAt: Timestamp;    // Queue entry time
  processed: boolean;      // Processing status
  processedAt: Timestamp;  // Processing time
  messageId?: string;      // Email provider message ID
  status?: string;         // 'sent' | 'failed'
  error?: string;          // Error message if failed
}
```

## 🚀 Production Deployment

### Environment Setup
1. Set strong OTP_SECRET in production
2. Configure email provider credentials securely
3. Deploy Firebase Cloud Functions
4. Test with real email addresses
5. Monitor delivery rates and errors

### Security Checklist
- [x] OTP secret key is strong and unique
- [x] Email credentials are stored securely
- [x] Rate limiting is properly configured
- [x] OTP expiration is enforced
- [x] No plain text OTP storage
- [x] Proper error handling without information leaks

### Monitoring Setup
- Set up email delivery monitoring
- Configure error alerting for failed emails
- Monitor OTP verification success rates
- Track user registration completion rates

## 📈 Scaling Considerations

### High Volume
- Use dedicated email service (SendGrid, AWS SES)
- Implement email templates and batch sending
- Set up proper monitoring and alerting
- Consider regional email routing

### Multi-Region
- Deploy Cloud Functions in multiple regions
- Use regional Firestore databases
- Implement proper session management
- Consider CDN for email assets

The email verification system is now ready for production with enterprise-grade security and scalability! 🎉