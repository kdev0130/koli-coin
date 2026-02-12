/**
 * Firebase Cloud Functions – Email OTP
 * Sender: kingdomoflove.international@gmail.com
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Create Nodemailer transporter (Gmail App Password)
 * Secrets required:
 * - EMAIL_USER
 * - EMAIL_PASS
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Firestore-triggered OTP Email Sender
 * Triggered when a document is added to: emailQueue/{emailId}
 */
exports.sendOTPEmail = functions
  .runWith({ secrets: ['EMAIL_USER', 'EMAIL_PASS'] })
  .firestore
  .document('emailQueue/{emailId}')
  .onCreate(async (snap, context) => {
    const emailData = snap.data();

    try {
      console.log(`📨 Sending OTP email to ${emailData.to}`);

      // Verify SMTP connection
      await transporter.verify();
      console.log('✅ SMTP transporter verified');

      const mailOptions = {
        from: `"KOLI" <${process.env.EMAIL_USER}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      };

      const result = await transporter.sendMail(mailOptions);

      console.log('✅ Email sent:', result.messageId);

      await snap.ref.update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
        messageId: result.messageId,
      });

    } catch (error) {
      console.error('❌ Email send failed:', error);

      await snap.ref.update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'failed',
        error: error.message,
      });
    }
  });

/**
 * HTTPS Callable OTP Email Sender
 */
exports.sendOTPEmailHttp = functions
  .runWith({ secrets: ['EMAIL_USER', 'EMAIL_PASS'] })
  .https
  .onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { email, otp } = data;

    if (!email || !otp) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Email and OTP are required'
      );
    }

    try {
      await transporter.verify();

      const mailOptions = {
        from: `"KOLI" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your KOLI Verification Code',
        html: generateOTPEmailHTML(otp),
        text: `Your KOLI verification code is: ${otp}. This code expires in 5 minutes.`,
      };

      const result = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
      };

    } catch (error) {
      console.error('❌ OTP email failed:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to send OTP email'
      );
    }
  });

/**
 * HTML Email Template
 */
function generateOTPEmailHTML(otp) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>KOLI Verification Code</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f9fafb;
      color: #111827;
    }
    .container {
      max-width: 600px;
      margin: auto;
      padding: 24px;
      background: #ffffff;
      border-radius: 10px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #4F46E5;
      text-align: center;
    }
    .otp-box {
      margin: 24px 0;
      padding: 20px;
      border: 2px dashed #4F46E5;
      border-radius: 8px;
      text-align: center;
      background: #eef2ff;
    }
    .otp {
      font-size: 32px;
      letter-spacing: 8px;
      font-weight: bold;
      color: #4F46E5;
    }
    .warning {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 12px;
      margin-top: 24px;
    }
    .footer {
      margin-top: 32px;
      font-size: 12px;
      text-align: center;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">KOLI</div>
    <h2>Email Verification</h2>

    <p>Please use the verification code below to complete your signup:</p>

    <div class="otp-box">
      <div class="otp">${otp}</div>
      <p>This code expires in 5 minutes</p>
    </div>

    <div class="warning">
      <strong>Security Notice</strong>
      <ul>
        <li>Do not share this code with anyone</li>
        <li>KOLI will never ask for your OTP</li>
        <li>If you did not request this, ignore this email</li>
      </ul>
    </div>

    <div class="footer">
      © 2026 KOLI · Automated email · Do not reply
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Cleanup job
 */
exports.cleanupExpiredData = functions.pubsub
  .schedule('every 10 minutes')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();

    const expiredOTPs = await db
      .collection('pendingOTPs')
      .where('expiresAt', '<', now)
      .get();

    expiredOTPs.forEach(doc => batch.delete(doc.ref));

    const cutoff = admin.firestore.Timestamp.fromMillis(
      Date.now() - 24 * 60 * 60 * 1000
    );

    const oldEmails = await db
      .collection('emailQueue')
      .where('processed', '==', true)
      .where('processedAt', '<', cutoff)
      .get();

    oldEmails.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
    console.log('🧹 Cleanup completed');

    return null;
  });
