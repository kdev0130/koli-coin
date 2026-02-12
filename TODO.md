# TODO: Fix 400 Error in sendPasswordResetOTP

## Plan
- Add client-side email validation in ForgotPasswordPage.tsx to prevent invalid emails from being sent to the server.
- Use a standard email regex for validation.
- Display an error message if the email is invalid.
- Prevent form submission if email is invalid.

## Steps
- [x] Add email validation function in ForgotPasswordPage.tsx
- [x] Update handleSubmit to validate email before sending request
- [x] Test the validation to ensure no 400 errors for invalid emails

## Dependent Files
- src/pages/ForgotPasswordPage.tsx

## Followup Steps
- Test the forgot password flow with valid and invalid emails.
