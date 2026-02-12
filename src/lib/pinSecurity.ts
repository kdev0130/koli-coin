import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// PIN lockout settings
const MAX_PIN_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Hash using SHA-256 (only works in secure contexts)
 */
async function hashPinSecure(pin: string): Promise<string | null> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(pin);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (error) {
      return null;
    }
  }
  return null;
}

/**
 * Simple hash function fallback for non-secure contexts
 * Uses a basic string hashing algorithm
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Add some additional mixing and convert to hex
  const mixed = Math.abs(hash * 31 + str.length * 17);
  return mixed.toString(16).padStart(8, '0');
}

/**
 * Hash a PIN using SHA-256 (or fallback to simple hash in non-secure contexts)
 * In production, use a more secure hashing method with salt
 */
async function hashPin(pin: string): Promise<string> {
  // Try secure hash first
  const secureHash = await hashPinSecure(pin);
  if (secureHash) {
    return secureHash;
  }
  
  // Fallback to simple hash
  console.warn('crypto.subtle not available (non-HTTPS context), using simple hash');
  return simpleHash(pin);
}

/**
 * Check if account is currently locked due to failed PIN attempts
 */
export async function isPinLocked(userId: string): Promise<{ locked: boolean; unlockTime?: Date }> {
  const userRef = doc(db, "members", userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return { locked: false };
  }
  
  const userData = userSnap.data();
  const lockUntil = userData.pinLockUntil;
  
  if (!lockUntil) {
    return { locked: false };
  }
  
  const unlockTime = new Date(lockUntil);
  const now = new Date();
  
  if (now < unlockTime) {
    return { locked: true, unlockTime };
  }
  
  // Lock expired, clear it
  await updateDoc(userRef, {
    pinLockUntil: null,
    failedPinAttempts: 0,
  });
  
  return { locked: false };
}

/**
 * Validate PIN format (6 digits)
 */
export function validatePinFormat(pin: string): { valid: boolean; error?: string } {
  if (!pin || pin.length !== 6) {
    return { valid: false, error: "PIN must be exactly 6 digits" };
  }
  
  if (!/^\d{6}$/.test(pin)) {
    return { valid: false, error: "PIN must contain only numbers" };
  }
  
  return { valid: true };
}

/**
 * Setup PIN for user (first time)
 */
export async function setupPin(userId: string, pin: string): Promise<void> {
  const validation = validatePinFormat(pin);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  const pinHash = await hashPin(pin);
  const userRef = doc(db, "members", userId);
  
  await updateDoc(userRef, {
    pinHash,
    hasPinSetup: true,
    lastAppUnlockAt: new Date().toISOString(),
  });
}

/**
 * Verify PIN against stored hash with lockout protection
 * Tracks failed attempts and locks account after MAX_PIN_ATTEMPTS
 */
export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const validation = validatePinFormat(pin);
  if (!validation.valid) {
    await incrementFailedAttempts(userId);
    return false;
  }

  // Check if account is locked
  const lockStatus = await isPinLocked(userId);
  if (lockStatus.locked) {
    const unlockTime = lockStatus.unlockTime!;
    const minutesRemaining = Math.ceil((unlockTime.getTime() - Date.now()) / 60000);
    throw new Error(`Account locked due to failed PIN attempts. Try again in ${minutesRemaining} minutes.`);
  }
  
  const userRef = doc(db, "members", userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return false;
  }
  
  const userData = userSnap.data();
  const storedHash = userData.pinHash;
  
  if (!storedHash) {
    return false;
  }
  
  const inputHash = await hashPin(pin);
  let isValid = inputHash === storedHash;
  
  // If hash doesn't match, try the alternative hashing method
  // (This handles cross-context verification: SHA-256 ↔ simple hash)
  if (!isValid) {
    const secureHash = await hashPinSecure(pin);
    const fallbackHash = simpleHash(pin);
    
    // Check if stored hash matches the alternative method
    isValid = (storedHash === secureHash) || (storedHash === fallbackHash);
  }
  
  if (isValid) {
    // Reset failed attempts on successful verification
    await updateDoc(userRef, {
      failedPinAttempts: 0,
      pinLockUntil: null,
      lastSuccessfulPinVerification: new Date().toISOString(),
    });
    return true;
  } else {
    // Increment failed attempts
    await incrementFailedAttempts(userId);
    return false;
  }
}

/**
 * Increment failed PIN attempts and lock account if threshold reached
 */
async function incrementFailedAttempts(userId: string): Promise<void> {
  const userRef = doc(db, "members", userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return;
  }
  
  const userData = userSnap.data();
  const currentAttempts = userData.failedPinAttempts || 0;
  const newAttempts = currentAttempts + 1;
  
  if (newAttempts >= MAX_PIN_ATTEMPTS) {
    // Lock the account
    const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    await updateDoc(userRef, {
      failedPinAttempts: newAttempts,
      pinLockUntil: lockUntil.toISOString(),
      lastPinLockAt: new Date().toISOString(),
    });
    
    // TODO: Send email notification about account lock
    console.warn(`Account ${userId} locked until ${lockUntil.toISOString()}`);
  } else {
    await updateDoc(userRef, {
      failedPinAttempts: newAttempts,
    });
  }
}

/**
 * Update PIN (requires old PIN verification)
 */
export async function updatePin(
  userId: string,
  oldPin: string,
  newPin: string
): Promise<void> {
  // Verify old PIN
  const isOldPinValid = await verifyPin(userId, oldPin);
  if (!isOldPinValid) {
    throw new Error("Current PIN is incorrect");
  }
  
  // Validate new PIN
  const validation = validatePinFormat(newPin);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  // Update to new PIN
  const newPinHash = await hashPin(newPin);
  const userRef = doc(db, "members", userId);
  
  await updateDoc(userRef, {
    pinHash: newPinHash,
    lastAppUnlockAt: new Date().toISOString(),
  });
}

/**
 * Update last unlock timestamp
 */
export async function updateLastUnlock(userId: string): Promise<void> {
  const userRef = doc(db, "members", userId);
  await updateDoc(userRef, {
    lastAppUnlockAt: new Date().toISOString(),
  });
}

/**
 * Check if PIN unlock is required
 * (User is logged in but app was closed/reopened)
 */
export function requirePinOnAppStart(userData: any): boolean {
  // User is authenticated and has PIN setup
  return userData?.hasPinSetup === true;
}
