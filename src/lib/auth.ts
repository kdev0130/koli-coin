import { betterAuth } from "better-auth";
import { phoneNumber } from "better-auth/plugins";

// Better Auth configuration for phone OTP
export const auth = betterAuth({
  database: {
    provider: "sqlite", // We'll use in-memory for OTP verification only
    url: ":memory:",
  },
  plugins: [
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }, ctx) => {
        // TODO: Implement SMS sending via Twilio, Vonage, or similar
        // For now, we'll just log it (you'll need to implement actual SMS)
        console.log(`Sending OTP ${code} to ${phoneNumber}`);
        
        // In production, integrate with SMS provider:
        // await twilioClient.messages.create({
        //   body: `Your KOLI verification code is: ${code}`,
        //   to: phoneNumber,
        //   from: process.env.TWILIO_PHONE_NUMBER
        // });
        
        return true;
      },
    }),
  ],
});
