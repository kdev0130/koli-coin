import { createAuthClient } from "better-auth/client";
import { phoneNumberClient } from "better-auth/client/plugins";

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
