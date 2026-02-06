import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Hash a PIN using SHA-256
 * In production, use a more secure hashing method with salt
 */
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
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
 * Verify PIN against stored hash
 */
export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const validation = validatePinFormat(pin);
  if (!validation.valid) {
    return false;
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
  return inputHash === storedHash;
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
