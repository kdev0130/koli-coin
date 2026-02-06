# Authentication & KYC Flow - Implementation Complete

## Overview
This document describes the complete authentication, PIN security, and KYC verification system implemented in the KOLI PWA.

## Components Created

### 1. PIN Security System (`src/lib/pinSecurity.ts`)
- **Purpose**: 6-digit PIN security for app unlock
- **Features**:
  - SHA-256 PIN hashing
  - PIN setup, verification, and update
  - Session persistence tracking
  - Cold start detection

### 2. KYC Service (`src/lib/kycService.ts`)
- **Purpose**: Identity verification system
- **Features**:
  - ID image upload to Firebase Storage
  - OCR placeholder for auto-data capture
  - Manual data entry fields
  - Withdrawal eligibility checks
  - KYC status management (NOT_SUBMITTED, PENDING, VERIFIED, REJECTED)

### 3. AuthGuard Component (`src/components/AuthGuard.tsx`)
- **Purpose**: Route protection and session management
- **Features**:
  - Checks authentication state
  - Enforces PIN unlock on cold start
  - Redirects to PIN setup if not configured
  - Handles public vs protected routes

### 4. Page Components

#### PinSetup (`src/pages/PinSetup.tsx`)
- First-time PIN configuration after signup
- 6-digit numeric validation
- Confirm PIN matching
- Visual feedback with character indicators

#### PinUnlock (`src/pages/PinUnlock.tsx`)
- App unlock screen on reopening
- 5-attempt limit with lockout
- Auto-verify on 6th digit
- Logout option if locked out

#### KYCSubmission (`src/pages/KYCSubmission.tsx`)
- ID document upload (max 5MB)
- Image preview
- Manual data entry (address, phone, emergency contact)
- Auto-captured data (from OCR, currently placeholder)
- Already-submitted detection

## User Flow

### 1. New User Registration
```
SignUp → PinSetup → Dashboard
```
1. User creates account with email/password
2. User document created with:
   - `hasPinSetup: false`
   - `kycStatus: "NOT_SUBMITTED"`
3. Redirected to `/pin-setup`
4. After PIN setup, redirected to `/dashboard`

### 2. App Reopen (Cold Start)
```
App Launch → PinUnlock → Dashboard
```
1. AuthGuard detects no session
2. Checks if PIN is required (`requirePinOnAppStart()`)
3. Redirects to `/pin-unlock` if needed
4. After successful unlock, sets session and allows access

### 3. KYC Verification
```
Profile/Donation → KYC Submission → Admin Review → Verified
```
1. User sees KYC disclaimer on Donation page
2. Clicks "Complete KYC Verification"
3. Uploads government ID (passport, license, etc.)
4. OCR attempts to extract data (placeholder)
5. User enters manual data (address, phone, emergency contact)
6. Status changes to "PENDING"
7. Admin reviews and approves → "VERIFIED"

### 4. Withdrawal Attempt
```
Check KYC Status → Allow/Block Withdrawal
```
- If `kycStatus !== "VERIFIED"`: Withdrawal blocked
- Error shown: "KYC verification required"
- User redirected to complete KYC

### 5. Logout Attempt
```
Check KYC Status → Allow/Block Logout
```
- If `kycStatus !== "VERIFIED"`: Logout blocked
- Error shown: "Complete KYC verification before logging out"
- This prevents users from bypassing KYC by logging out

## Data Structure

### UserData Interface (Extended)
```typescript
interface UserData {
  // ... existing fields ...
  
  // PIN Security
  pinHash?: string;              // SHA-256 hashed PIN
  hasPinSetup: boolean;          // Whether PIN is configured
  lastAppUnlockAt?: string;      // Last unlock timestamp
  
  // KYC Status
  kycStatus: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED";
  kycSubmittedAt?: string;       // Submission timestamp
  kycVerifiedAt?: string;        // Verification timestamp
  kycIdImageURL?: string;        // Download URL for ID image
  kycIdImagePath?: string;       // Storage path
  kycRejectionReason?: string;   // If rejected
  
  // KYC Data
  kycAutoCaptured?: {
    // Read-only fields from OCR
    fullLegalName?: string;
    dateOfBirth?: string;
    idNumber?: string;
    nationality?: string;
    idType?: string;
    idExpirationDate?: string;
  };
  
  kycManualData?: {
    // User-editable fields
    address?: string;
    phoneNumber?: string;
    emergencyContact?: string;
    emergencyContactPhone?: string;
  };
}
```

## Route Configuration

### Public Routes (No Auth Required)
- `/` - Splash Screen
- `/gate` - Platform Gate
- `/signup` - Registration
- `/signin` - Login
- `/verify-otp` - OTP Verification

### Protected Routes (Auth + PIN Required)
- `/dashboard` - Main dashboard
- `/donation` - Donation contracts
- `/mining` - Mining waitlist
- `/profile` - User profile

### Special Routes
- `/pin-setup` - PIN configuration (auth required, PIN not required)
- `/kyc-submission` - KYC submission (auth + PIN required)

## Security Features

### 1. PIN Security
- **Hashing**: SHA-256 algorithm
- **Length**: Exactly 6 digits
- **Attempts**: Maximum 5 failed attempts
- **Lockout**: Account locked after 5 failures
- **Session**: Persists unlock state in sessionStorage
- **Cold Start**: Requires unlock on app reopen

### 2. KYC Verification
- **Document Upload**: Stored in Firebase Storage
- **OCR Integration**: Placeholder for auto-capture
- **Data Separation**: Read-only vs editable fields
- **Withdrawal Blocking**: Enforced at service level
- **Admin Review**: Manual approval process

### 3. Session Management
- **Storage**: sessionStorage (cleared on browser close)
- **Key**: `koli_session_unlocked`
- **Value**: Boolean indicating unlock state
- **Scope**: Per-tab (not shared across tabs)

## Integration Points

### Pages Updated with KYC
1. **Donation Page**:
   - KYC disclaimer banner
   - Withdrawal blocking
   - Logout restriction

2. **Profile Page**:
   - KYC status badge
   - Submit/View KYC button
   - Auto-captured data display (read-only)
   - PIN management option
   - Logout restriction

3. **Dashboard, Mining Pages**:
   - Logout restriction

### Services Updated
- **donationContract.ts**: Withdrawal function now checks KYC
- **AuthContext.tsx**: Extended UserData interface

## Testing Checklist

### PIN Security
- [ ] New user signup redirects to PIN setup
- [ ] PIN setup validates 6 digits only
- [ ] Confirm PIN must match
- [ ] App reopen shows PIN unlock
- [ ] 5 failed attempts lock account
- [ ] Correct PIN unlocks app
- [ ] Session persists during app use

### KYC Verification
- [ ] KYC disclaimer shows on Donation page
- [ ] Navigate to KYC submission
- [ ] Upload ID image (< 5MB)
- [ ] Image preview displays
- [ ] Manual fields are editable
- [ ] Submission creates Firestore record
- [ ] Status changes to PENDING

### Withdrawal Blocking
- [ ] Withdrawal blocked if NOT_SUBMITTED
- [ ] Withdrawal blocked if PENDING
- [ ] Withdrawal blocked if REJECTED
- [ ] Withdrawal allowed if VERIFIED
- [ ] Error message shows KYC requirement

### Logout Restriction
- [ ] Logout disabled in Dashboard
- [ ] Logout disabled in Donation
- [ ] Logout disabled in Mining
- [ ] Logout disabled in Profile
- [ ] Tooltip shows restriction reason
- [ ] Logout works after KYC verified

## Firebase Structure

### Firestore Collections
```
members/{userId}
  - pinHash: string
  - hasPinSetup: boolean
  - lastAppUnlockAt: timestamp
  - kycStatus: string
  - kycSubmittedAt: timestamp
  - kycVerifiedAt: timestamp
  - kycIdImageURL: string
  - kycIdImagePath: string
  - kycRejectionReason: string
  - kycAutoCaptured: object
  - kycManualData: object
```

### Storage Structure
```
kyc/{userId}/id-card.{ext}
  - Uploaded ID images
  - Access controlled by security rules
```

## Admin Tasks

### KYC Review Process
1. View pending KYC submissions in Firestore
2. Access ID images from Storage
3. Verify auto-captured data accuracy
4. Check manual data completeness
5. Update `kycStatus` to:
   - "VERIFIED" (approve)
   - "REJECTED" (deny with reason)
6. Set `kycVerifiedAt` timestamp if approved
7. Add `kycRejectionReason` if rejected

### Security Rules Needed
```javascript
// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /members/{userId} {
      // Users can read their own data
      allow read: if request.auth.uid == userId;
      
      // Users can update manual data only
      allow update: if request.auth.uid == userId
        && !request.resource.data.diff(resource.data).affectedKeys()
          .hasAny(['kycStatus', 'kycAutoCaptured', 'kycVerifiedAt']);
      
      // Admins can update KYC status
      // TODO: Add admin role check
    }
  }
}

// Storage Rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /kyc/{userId}/{allPaths=**} {
      // Users can upload their own KYC images
      allow write: if request.auth.uid == userId;
      
      // Users and admins can read KYC images
      allow read: if request.auth.uid == userId;
      // TODO: Add admin role check for read access
    }
  }
}
```

## Future Enhancements

### OCR Integration
Replace the placeholder in `parseIdCardData()` with:
- Google Cloud Vision API
- AWS Textract
- Azure Computer Vision
- Tesseract.js (client-side)

### PIN Features
- Biometric unlock (fingerprint/face)
- PIN recovery via email
- Configurable PIN length
- PIN expiration policy

### KYC Enhancements
- Liveness detection
- Address verification
- Multi-document support
- Automatic rejection for invalid IDs
- Email notifications on status change

## Support

### Common Issues

**Issue**: "PIN unlock required" every time
**Solution**: Check sessionStorage is enabled and not being cleared

**Issue**: KYC status not updating
**Solution**: Verify Firestore permissions and document path

**Issue**: Image upload fails
**Solution**: Check file size (max 5MB) and Storage rules

**Issue**: Logout button disabled
**Solution**: Complete KYC verification first

## Conclusion

The authentication system is now complete with:
✅ PIN security on app reopen
✅ KYC verification with ID upload
✅ Withdrawal blocking without KYC
✅ Logout restriction without KYC
✅ Session persistence
✅ Auto-captured vs manual data separation

All components are integrated and ready for testing.
