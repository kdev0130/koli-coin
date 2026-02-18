import { doc, updateDoc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";

export interface KYCAutoCapturedData {
  fullLegalName?: string;
  dateOfBirth?: string;
  idNumber?: string;
  nationality?: string;
  idType?: string;
  idExpirationDate?: string;
  address?: string;
}

export interface KYCManualData {
  // Personal Info
  fullLegalName?: string;
  dateOfBirth?: string;
  idNumber?: string;
  nationality?: string;
  idType?: string;
  idExpirationDate?: string;
  // Contact Info
  address?: string;
  phoneNumber?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Parse ID card data (no OCR - manual entry only)
 */
export async function parseIdCardData(imageFile: File): Promise<KYCAutoCapturedData> {
  // Return empty data - all fields will be manually entered
  return {
    fullLegalName: undefined,
    dateOfBirth: undefined,
    idNumber: undefined,
    nationality: undefined,
    idType: undefined,
    idExpirationDate: undefined,
    address: undefined,
  };
}

/**
 * Submit KYC with ID image upload
 */
export async function submitKyc(
  userId: string,
  idImage: File,
  manualData: KYCManualData,
  onProgress?: (progress: number) => void
): Promise<void> {
  // Upload ID image to Firebase Storage (resumable with timeout for mobile reliability)
  const activeStorage = storage || getStorage();
  const timestamp = Date.now();
  const safeName = sanitizeFileName(idImage.name || "kyc-image.jpg");
  const fileName = `kyc/${userId}/${timestamp}_${safeName}`;
  const storageRef = ref(activeStorage, fileName);

  const uploadWithResumable = async (): Promise<void> => {
    const uploadTask = uploadBytesResumable(storageRef, idImage, {
      contentType: idImage.type || "image/jpeg",
    });
    let lastProgressAt = Date.now();
    let stalled = false;

    const stallWatcher = setInterval(() => {
      if (Date.now() - lastProgressAt > 20000) {
        stalled = true;
        try {
          uploadTask.cancel();
        } catch {
          // no-op
        }
      }
    }, 2000);

    try {
      await withTimeout(
        new Promise<void>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              lastProgressAt = Date.now();
              const total = snapshot.totalBytes || 0;
              const transferred = snapshot.bytesTransferred || 0;
              const computed = total > 0 ? Math.round((transferred / total) * 100) : 0;
              onProgress?.(Math.min(99, Math.max(1, computed)));
            },
            (error: any) => {
              if (stalled || error?.code === "storage/canceled") {
                reject(new Error("upload_stalled"));
                return;
              }
              reject(error);
            },
            () => resolve()
          );
        }),
        120000,
        "Upload timed out."
      );
    } finally {
      clearInterval(stallWatcher);
    }
  };

  const uploadWithDirectFallback = async () => {
    onProgress?.(15);
    await withTimeout(
      uploadBytes(storageRef, idImage, {
        contentType: idImage.type || "image/jpeg",
      }),
      120000,
      "Upload timed out."
    );
    onProgress?.(95);
  };

  try {
    onProgress?.(1);
    await uploadWithResumable();
  } catch {
    // Fallback path for Android devices where resumable upload can hang.
    await uploadWithDirectFallback();
  }

  onProgress?.(100);

  // Get the download URL
  const imageURL = await withTimeout(
    getDownloadURL(storageRef),
    20000,
    "Failed to finalize image upload. Please try again."
  );
  
  // Parse ID data (OCR)
  const autoCapturedData = await parseIdCardData(idImage);
  
  // Remove undefined values from autoCapturedData
  const cleanedAutoCaptured = Object.fromEntries(
    Object.entries(autoCapturedData).filter(([_, value]) => value !== undefined)
  );
  
  // Remove undefined values from manualData
  const cleanedManualData = Object.fromEntries(
    Object.entries(manualData).filter(([_, value]) => value !== undefined && value !== "")
  );
  
  // Update user document
  const userRef = doc(db, "members", userId);
  
  const updateData: any = {
    kycStatus: "PENDING",
    kycSubmittedAt: new Date().toISOString(),
    kycIdImageURL: imageURL,
    kycIdImagePath: fileName,
    kycRejectionReason: null,
    kycVerifiedAt: null,
  };
  
  // Only add kycAutoCaptured if there's actual data
  if (Object.keys(cleanedAutoCaptured).length > 0) {
    updateData.kycAutoCaptured = cleanedAutoCaptured;
  }
  
  // Only add kycManualData if there's actual data
  if (Object.keys(cleanedManualData).length > 0) {
    updateData.kycManualData = cleanedManualData;
  }
  
  // Overwrite root-level user fields if provided in manual data
  if (manualData.address) {
    updateData.address = manualData.address;
  }
  if (manualData.phoneNumber) {
    updateData.phoneNumber = manualData.phoneNumber;
  }
  
  // Overwrite name fields if fullLegalName is provided
  if (manualData.fullLegalName) {
    updateData.name = manualData.fullLegalName;
    // Try to parse first and last name
    const nameParts = manualData.fullLegalName.trim().split(' ');
    if (nameParts.length >= 2) {
      updateData.firstName = nameParts[0];
      updateData.lastName = nameParts.slice(1).join(' ');
    } else {
      updateData.firstName = manualData.fullLegalName;
    }
  }
  
  await withTimeout(updateDoc(userRef, updateData), 30000, "KYC submission timed out while saving. Please try again.");
}

/**
 * Update KYC manual data (user can edit)
 */
export async function updateKycManualData(
  userId: string,
  manualData: Partial<KYCManualData>
): Promise<void> {
  const userRef = doc(db, "members", userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error("User not found");
  }
  
  const existingManualData = userSnap.data().kycManualData || {};
  
  await updateDoc(userRef, {
    kycManualData: {
      ...existingManualData,
      ...manualData,
    },
  });
}

/**
 * Check if user can withdraw (KYC verified)
 */
export function canUserWithdraw(userData: any): {
  canWithdraw: boolean;
  reason?: string;
} {
  if (!userData) {
    return { canWithdraw: false, reason: "User not found" };
  }
  
  const kycStatus = userData.kycStatus || "NOT_SUBMITTED";
  
  // Accept both VERIFIED and APPROVED as valid statuses
  if (kycStatus !== "VERIFIED" && kycStatus !== "APPROVED") {
    return {
      canWithdraw: false,
      reason: `KYC verification required. Status: ${kycStatus}`,
    };
  }
  
  return { canWithdraw: true };
}

/**
 * Check if user is fully verified
 */
export function isUserFullyVerified(userData: any): boolean {
  // Accept both VERIFIED and APPROVED as valid statuses
  return userData?.kycStatus === "VERIFIED" || userData?.kycStatus === "APPROVED";
}

/**
 * Get KYC status display
 */
export function getKycStatusDisplay(status: string): {
  label: string;
  color: string;
  description: string;
} {
  switch (status) {
    case "VERIFIED":
    case "APPROVED":
      return {
        label: "Verified",
        color: "green",
        description: "Your identity has been verified. You can now withdraw funds.",
      };
    case "PENDING":
      return {
        label: "Pending Review",
        color: "yellow",
        description: "Your KYC submission is being reviewed by our team.",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        color: "red",
        description: "Your KYC submission was rejected. Please resubmit with valid documents.",
      };
    case "NOT_SUBMITTED":
    default:
      return {
        label: "Not Submitted",
        color: "gray",
        description: "Submit your government-issued ID to verify your identity.",
      };
  }
}

/**
 * Show KYC disclaimer for donation page
 */
export function getKycDisclaimer(kycStatus: string): string | null {
  // Don't show disclaimer if VERIFIED or APPROVED
  if (kycStatus === "VERIFIED" || kycStatus === "APPROVED") {
    return null;
  }
  return "⚠️ KYC verification is required before withdrawals. You may donate, but withdrawals are disabled until KYC is approved.";
}
