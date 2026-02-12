import * as functions from "firebase-functions";
const { HttpsError } = functions.https;
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

initializeApp();

const db = getFirestore();
const auth = getAuth();

// Helper to generate 6-digit OTP
function generateOTP() {
  return (Math.floor(100000 + Math.random() * 900000)).toString();
}

// Generate HTML email template for password reset
function generatePasswordResetEmailHTML(otp) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>KOLI Password Reset</title>
        <link href="https://fonts.googleapis.com/css?family=Montserrat:400,500,700&display=swap" rel="stylesheet" />
        <style>
          body {
            background: #f8fafc;
            font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 480px;
            margin: 40px auto;
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 4px 24px rgba(30,41,59,0.08);
            padding: 32px 24px;
            text-align: center;
          }
          .logo {
            width: 64px;
            margin-bottom: 16px;
          }
          .title {
            color: #6366f1;
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: 1px;
            font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
          }
          .subtitle {
            font-size: 1.25rem;
            font-weight: 500;
            margin-bottom: 24px;
            font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
          }
          .code-box {
            border: 2px solid #6366f1;
            border-radius: 12px;
            padding: 24px 0;
            margin: 24px 0;
            font-size: 2.5rem;
            font-weight: 700;
            color: #6366f1;
            letter-spacing: 0.3em;
            background: #f1f5ff;
            font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
          }
          .expires {
            font-size: 0.95rem;
            color: #64748b;
            margin-top: 8px;
            font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
          }
          .security {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            color: #b91c1c;
            padding: 16px;
            margin: 24px 0 0 0;
            border-radius: 8px;
            text-align: left;
            font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
          }
          .footer {
            margin-top: 32px;
            font-size: 0.95rem;
            color: #64748b;
            font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="https://koli-2bad9.web.app/koli-logo.png" alt="KOLI Logo" class="logo" />
          <div class="title">KOLI</div>
          <div class="subtitle">Password Reset</div>
          <p>Hello,<br>We received a request to reset your KOLI password. Please use the verification code below to reset your password:</p>
          <div class="code-box">${otp}</div>
          <div class="expires">This code expires in 5 minutes</div>
          <div class="security">
            <strong>Security Notice:</strong>
            <ul>
              <li>Never share this code with anyone</li>
              <li>KOLI will never ask for this code via phone or email</li>
              <li>If you didn't request this code, please ignore this email</li>
            </ul>
          </div>
          <div class="footer">
            If you have any questions, please contact our support team.<br>
            <br>
            &copy; 2026 KOLI. All rights reserved.<br>
            <span style="font-size:0.85em;">This is an automated email, please do not reply.</span>
          </div>
        </div>
      </body>
    </html>
  `;
}

export const sendPasswordResetOTP = functions.https.onCall(
  async (data, context) => {
    console.log("[sendPasswordResetOTP] Incoming data:", data);
    // Accept both { email } and { data: { email } } for robustness
    const email = (data?.email || data?.data?.email || "").toString().trim().toLowerCase();
    console.log("[sendPasswordResetOTP] extracted email:", email, typeof email);
    if (!email) throw new HttpsError("invalid-argument", "Valid email required");

    // Check if user exists
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (e) {
      // Do not reveal if user exists or if email is invalid
      return;
    }

    const otp = generateOTP();
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000));
    const doc = {
      email,
      otp,
      expiresAt,
      used: false,
      createdAt: FieldValue.serverTimestamp(),
    };
    await db.collection("passwordResetQueue").add(doc);

    // Send email using the same queue system as signup
    const emailId = `password-reset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await db.collection("emailQueue").doc(emailId).set({
      to: email,
      subject: 'Your KOLI Password Reset Code',
      html: generatePasswordResetEmailHTML(otp),
      text: `Your KOLI password reset code is: ${otp}. This code expires in 5 minutes.`,
      createdAt: FieldValue.serverTimestamp(),
      processed: false,
      otp: otp, // For development - remove in production
    });

    console.log(`📧 Password reset OTP sent to ${email} (ID: ${emailId})`);
    console.log(`🔐 Development OTP: ${otp} (expires in 5 minutes)`);

    return;
  }
);

export const verifyPasswordResetOTP = functions.https.onCall(
  async (data, context) => {
    const payload = data?.data || data || {};
    const email = (payload?.email || "").toString().trim().toLowerCase();
    const otp = (payload?.otp || "").toString().replace(/\D/g, "").slice(0, 6);
    console.log("[verifyPasswordResetOTP] extracted email and otp length:", email, otp.length);
    if (!email || !otp) throw new HttpsError("invalid-argument", "Valid email and OTP required");

    const now = Timestamp.now();
    const snapshot = await db.collection("passwordResetQueue")
      .where("email", "==", email)
      .where("used", "==", false)
      .get();

    if (snapshot.empty) throw new HttpsError("not-found", "Invalid or expired code");

    const matchingDoc = snapshot.docs.find((docSnap) => {
      const queueData = docSnap.data();
      if (!queueData?.otp || !queueData?.expiresAt) {
        return false;
      }

      const queuedOtp = String(queueData.otp).trim();
      const expiresAtMillis = queueData.expiresAt.toMillis();
      return queuedOtp === otp && expiresAtMillis >= now.toMillis();
    });

    if (!matchingDoc) {
      throw new HttpsError("not-found", "Invalid or expired code");
    }

    await matchingDoc.ref.update({
      used: true,
      usedAt: FieldValue.serverTimestamp(),
    });

    return {
      verificationId: matchingDoc.id,
      email,
    };
  }
);

export const resetPasswordWithOTP = functions.https.onCall(
  async (data, context) => {
    const payload = data?.data || data || {};
    const email = (payload?.email || "").toString().trim().toLowerCase();
    const newPassword = (payload?.newPassword || "").toString();
    const verificationId = (payload?.verificationId || "").toString().trim();
    if (!email || !newPassword) throw new HttpsError("invalid-argument", "Valid email and new password required");

    let verifiedQueueDoc = null;

    if (verificationId) {
      const verificationRef = db.collection("passwordResetQueue").doc(verificationId);
      const verificationSnap = await verificationRef.get();

      if (verificationSnap.exists) {
        const verificationData = verificationSnap.data();
        if (verificationData?.email === email && verificationData?.used === true) {
          verifiedQueueDoc = verificationData;
        }
      }
    }

    // Backward-compatible fallback for older clients without verificationId
    if (!verifiedQueueDoc) {
      const snapshot = await db.collection("passwordResetQueue")
        .where("email", "==", email)
        .where("used", "==", true)
        .get();

      if (snapshot.empty) {
        throw new HttpsError("permission-denied", "OTP not verified");
      }

      const sortedDocs = snapshot.docs.sort((a, b) => {
        const aTime = a.data()?.createdAt?.toMillis?.() || 0;
        const bTime = b.data()?.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      verifiedQueueDoc = sortedDocs[0].data();
    }

    if (!verifiedQueueDoc || verifiedQueueDoc.email !== email || verifiedQueueDoc.used !== true) {
      throw new HttpsError("permission-denied", "OTP not verified");
    }

    // Get user record again since userRecord is not in scope
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (e) {
      throw new HttpsError("not-found", "User not found");
    }

    // Update password
    await auth.updateUser(userRecord.uid, { password: newPassword });

    // Optionally, sign in user (handled client-side)
    return;
  }
);
