
import { functions } from "./firebase";
import { httpsCallable } from "firebase/functions";
import { createAuthClient } from "better-auth/client";
import { phoneNumberClient } from "better-auth/client/plugins";
// Password reset OTP helpers
export async function sendPasswordResetOTP(email: string) {
  const sendOTP = httpsCallable(functions, "sendPasswordResetOTP");
  await sendOTP({ email });
}

export async function verifyPasswordResetOTP(email: string, otp: string) {
  const verifyOTP = httpsCallable(functions, "verifyPasswordResetOTP");
  const result = await verifyOTP({ email, otp });
  return result.data as { verificationId?: string; email?: string };
}

export async function resetPasswordWithOTP(email: string, newPassword: string, verificationId?: string) {
  const resetPassword = httpsCallable(functions, "resetPasswordWithOTP");
  await resetPassword({ email, newPassword, verificationId: verificationId || null });
}

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  plugins: [phoneNumberClient()],
});

// Helper functions
export const sendPhoneOTP = async (phoneNumber: string) => {
  return await authClient.phoneNumber.sendOtp({
    phoneNumber,
  });
};

export const verifyPhoneOTP = async (phoneNumber: string, code: string) => {
  return await authClient.phoneNumber.verify({
    phoneNumber,
    code,
    disableSession: true, // We'll use Firebase for sessions
    updatePhoneNumber: false,
  });
};
