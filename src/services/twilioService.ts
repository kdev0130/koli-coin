import twilio from 'twilio';

// Twilio service for OTP verification using Verify API
class TwilioService {
  private client: twilio.Twilio;
  private serviceSid: string;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
    const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
    this.serviceSid = import.meta.env.VITE_TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !this.serviceSid) {
      console.warn('Twilio credentials not configured. Please set VITE_TWILIO_ACCOUNT_SID, VITE_TWILIO_AUTH_TOKEN, and VITE_TWILIO_VERIFY_SERVICE_SID in your .env file.');
      this.isConfigured = false;
      return;
    }

    try {
      this.client = twilio(accountSid, authToken);
      this.isConfigured = true;
      console.log('✅ Twilio client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Twilio client:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send OTP to phone number using Twilio Verify
   */
  async sendOTP(phoneNumber: string): Promise<{ success: boolean; sid?: string; error?: string }> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Twilio service not configured. Please check your environment variables.'
      };
    }

    try {
      // Validate E.164 format
      if (!phoneNumber || !phoneNumber.startsWith('+')) {
        return {
          success: false,
          error: 'Phone number must be in E.164 format (e.g., +1234567890)'
        };
      }

      console.log(`📱 Sending OTP to ${phoneNumber}...`);
      
      const verification = await this.client.verify.v2
        .services(this.serviceSid)
        .verifications.create({
          to: phoneNumber,
          channel: 'sms',
          locale: 'en' // Set locale for consistent experience
        });

      console.log(`✅ OTP sent successfully. Status: ${verification.status}`);

      return {
        success: true,
        sid: verification.sid
      };
    } catch (error: any) {
      console.error('❌ Twilio send OTP error:', error);
      
      // Handle specific Twilio errors
      let errorMessage = 'Failed to send verification code';
      
      if (error.code === 60200) {
        errorMessage = 'Invalid phone number format';
      } else if (error.code === 60203) {
        errorMessage = 'Phone number is not a valid mobile number';
      } else if (error.code === 60212) {
        errorMessage = 'Too many verification attempts. Please try again later.';
      } else if (error.code === 20003) {
        errorMessage = 'Authentication failed. Please contact support.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Verify OTP code using Twilio Verify
   */
  async verifyOTP(phoneNumber: string, code: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Twilio service not configured. Please check your environment variables.'
      };
    }

    try {
      // Basic validation
      if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
        return {
          success: false,
          error: 'Please enter a valid 6-digit verification code'
        };
      }

      console.log(`🔍 Verifying OTP for ${phoneNumber}...`);

      const verificationCheck = await this.client.verify.v2
        .services(this.serviceSid)
        .verificationChecks.create({
          to: phoneNumber,
          code: code.trim()
        });

      const success = verificationCheck.status === 'approved';
      
      if (success) {
        console.log(`✅ Phone ${phoneNumber} verified successfully!`);
      } else {
        console.log(`❌ Verification failed. Status: ${verificationCheck.status}`);
      }

      return {
        success,
        error: success ? undefined : 'Invalid or expired verification code'
      };
    } catch (error: any) {
      console.error('❌ Twilio verify OTP error:', error);
      
      // Handle specific Twilio errors
      let errorMessage = 'Failed to verify code';
      
      if (error.code === 60202) {
        errorMessage = 'Maximum verification attempts reached';
      } else if (error.code === 60023) {
        errorMessage = 'Verification code has expired';
      } else if (error.code === 20404) {
        errorMessage = 'Verification not found or already verified';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Check if Twilio service is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Get service configuration status for debugging
   */
  getStatus(): { configured: boolean; serviceSid?: string } {
    return {
      configured: this.isConfigured,
      serviceSid: this.isConfigured ? this.serviceSid : undefined
    };
  }
}

export default new TwilioService();