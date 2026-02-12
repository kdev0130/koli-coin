import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { defineString, defineSecret } from 'firebase-functions/params';

const db = getFirestore();

// Define email configuration parameters using secrets
const emailFrom = defineSecret('EMAIL_FROM');
const emailService = defineSecret('EMAIL_SERVICE');
const emailUser = defineSecret('EMAIL_USER');
const emailPass = defineSecret('EMAIL_PASS');

/**
 * Cloud Function to send verification emails
 * Triggers when a document is created in the emailQueue collection
 */
export const sendVerificationEmail = onDocumentCreated(
  {
    document: 'emailQueue/{emailId}',
    region: 'us-central1',
    memory: '256MiB',
    secrets: ['EMAIL_FROM', 'EMAIL_SERVICE', 'EMAIL_USER', 'EMAIL_PASS'],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('No data associated with the event');
      return;
    }

    const emailData = snapshot.data();
    const emailId = event.params.emailId;

    console.log(`📧 Processing email ${emailId} for ${emailData.to}`);

    // Check if already processed
    if (emailData.processed) {
      console.log(`Email ${emailId} already processed, skipping`);
      return;
    }

    try {
      // Import nodemailer dynamically
      const nodemailer = await import('nodemailer');

      // Create transporter
      const transporter = nodemailer.default.createTransport({
        service: emailService.value(),
        auth: {
          user: emailUser.value(),
          pass: emailPass.value(),
        },
      });

      // Send email
      const info = await transporter.sendMail({
        from: `"KOLI" <${emailFrom.value()}>`,
        to: emailData.to,
        subject: emailData.subject || 'Your KOLI Verification Code',
        text: emailData.text,
        html: emailData.html,
      });

      console.log(`✅ Email sent successfully to ${emailData.to}. Message ID: ${info.messageId}`);

      // Mark as processed
      await snapshot.ref.update({
        processed: true,
        processedAt: FieldValue.serverTimestamp(),
        messageId: info.messageId,
        status: 'sent',
      });

    } catch (error) {
      console.error(`❌ Failed to send email ${emailId}:`, error);

      // Mark as failed
      await snapshot.ref.update({
        processed: true,
        processedAt: FieldValue.serverTimestamp(),
        status: 'failed',
        error: error.message,
      });
    }
  }
);
