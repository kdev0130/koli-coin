# KOLI System Implementation Overview

## Table of Contents
- [Introduction](#introduction)
- [Architecture](#architecture)
- [Frontend](#frontend)
- [Backend & Cloud Functions](#backend--cloud-functions)
- [Authentication & User Management](#authentication--user-management)
- [Email & OTP Verification](#email--otp-verification)
- [KYC & Storage](#kyc--storage)
- [Dashboard & User Experience](#dashboard--user-experience)
- [Security](#security)
- [Deployment & Environment](#deployment--environment)
- [Development Workflow](#development-workflow)

---

## Introduction
KOLI is a modern web application for managing digital assets, user onboarding, and secure transactions. It leverages React, Firebase, and a suite of custom Cloud Functions to deliver a seamless, secure, and scalable experience.

## Architecture
- **Frontend:** React (Vite, TypeScript, TailwindCSS, shadcn/ui)
- **Backend:** Firebase Cloud Functions (Node.js), Firestore, Firebase Auth, Firebase Storage
- **Email Delivery:** Nodemailer via Gmail App Passwords (Cloud Function)
- **KYC & File Storage:** Firebase Storage with user-based access rules

## Frontend
- Built with React and Vite for fast development and hot reloading.
- Uses TailwindCSS for utility-first styling and shadcn/ui for modern UI components.
- State and session management via React Context (AuthContext).
- Responsive dashboard, onboarding, and KYC flows.

## Backend & Cloud Functions
- **Cloud Functions:**
  - `sendVerificationEmail`: Sends OTP/verification emails using Nodemailer and Gmail.
  - `claimManaReward`, `initManaReward`, etc.: Handle reward logic and contract management.
- **Firestore:**
  - Stores user profiles, KYC status, contracts, rewards, and more.
- **Security Rules:**
  - Firestore and Storage rules restrict access based on authentication and user roles.

## Authentication & User Management
- Uses Firebase Auth for secure user sign-in/sign-up.
- AuthContext provides session and user data throughout the app.
- User data includes name, email, KYC status, balance, and more.
- Dashboard greets user by first name and manages session state.

## Email & OTP Verification
- OTPs are generated and stored in Firestore (`emailQueue`).
- Cloud Function listens for new email requests and sends branded HTML emails.
- Email template uses Montserrat font, KOLI logo, and system color scheme.
- OTPs expire after 5 minutes for security.

## KYC & Storage
- Users upload KYC documents to Firebase Storage under `kyc/{userId}/...`.
- Storage rules ensure only the authenticated user can access their own KYC files.
- KYC status is tracked in Firestore and used to gate features.

## Dashboard & User Experience
- Personalized dashboard with greeting, news, and ecosystem links.
- User's first name is shown in gold for a premium feel.
- Navigation and session management are seamless via React Router and Context.

## Security
- Firestore and Storage rules enforce least-privilege access.
- Sensitive values (email credentials, etc.) are managed via Firebase secrets.
- OTPs and KYC flows are protected against unauthorized access.

## Deployment & Environment
- Build with `pnpm build` (output in `dist/`).
- Deploy frontend with `firebase deploy --only hosting`.
- Deploy backend/functions with `firebase deploy --only functions`.
- Deploy Firestore and Storage rules as needed.
- Environment variables for local dev in `.env.koli-2bad9`; secrets for production.

## Development Workflow
1. Make code changes in `src/` or `functions/`.
2. Build frontend: `pnpm build`.
3. Deploy as needed (hosting, functions, rules).
4. Test flows: signup, email verification, KYC, dashboard.
5. Monitor logs and errors via Firebase Console.

---

For more details, see the individual MD files and code comments throughout the repository.
