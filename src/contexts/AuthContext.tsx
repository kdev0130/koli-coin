import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import {
  buildSuspendedAccountMessage,
  isSuspendedStatus,
  SUSPENDED_ACCOUNT_MESSAGE_STORAGE_KEY,
} from "@/lib/accountStatus";

interface UserData {
  uid: string;
  firstName?: string;
  lastName?: string;
  name: string;
  phoneNumber?: string;
  email: string;
  address?: string;
  balance: number;
  deposit: number;
  totalAsset: number;
  totalInvested: number;
  totalEarnings: number;
  referralCode?: string;
  role: string;
  createdAt: string;
  status?: string;
  suspendedAt?: string;
  suspendedBy?: string;
  suspensionReason?: string;
  
  // Email Verification
  emailVerified: boolean;
  emailOtpHash?: string;
  emailOtpExpiresAt?: number;
  phoneDisclaimerAccepted?: boolean;
  
  // PIN Security
  pinHash?: string;
  hasPinSetup: boolean;
  lastAppUnlockAt?: string;
  
  // KYC Fields
  kycStatus: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "APPROVED" | "REJECTED";
  kycSubmittedAt?: string;
  kycVerifiedAt?: string;
  kycIdImageURL?: string;
  kycIdImagePath?: string;
  kycRejectionReason?: string;
  
  // Auto-captured from ID (read-only)
  kycAutoCaptured?: {
    fullLegalName?: string;
    dateOfBirth?: string;
    idNumber?: string;
    nationality?: string;
    idType?: string;
    idExpirationDate?: string;
  };
  
  // Manual/Editable fields
  kycManualData?: {
    fullLegalName?: string;
    dateOfBirth?: string;
    idNumber?: string;
    nationality?: string;
    idType?: string;
    idExpirationDate?: string;
    address?: string;
    phoneNumber?: string;
    emergencyContact?: string;
    emergencyContactPhone?: string;
  };
  
  // Legacy fields
  hasFundingPassword?: boolean;
  totalReferrals?: number;
  platformCode?: string;
  platformCodeId?: string;
  leaderId?: string;
  leaderName?: string;
  joinedUnderLeaderAt?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;
    let handlingSuspendedAccount = false;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = undefined;
      }

      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Subscribe to real-time user data updates from Firestore
        const userDocRef = doc(db, "members", firebaseUser.uid);
        
        unsubscribeSnapshot = onSnapshot(
          userDocRef,
          (docSnapshot) => {
            if (docSnapshot.exists()) {
              const memberData = docSnapshot.data() as UserData;

              if (!handlingSuspendedAccount && isSuspendedStatus(memberData.status)) {
                handlingSuspendedAccount = true;
                sessionStorage.setItem(
                  SUSPENDED_ACCOUNT_MESSAGE_STORAGE_KEY,
                  buildSuspendedAccountMessage(memberData.suspensionReason)
                );
                setUserData(null);
                setUser(null);
                setLoading(false);

                signOut(auth)
                  .catch((signOutError) => {
                    console.error("Error signing out suspended user:", signOutError);
                  })
                  .finally(() => {
                    handlingSuspendedAccount = false;
                  });
                return;
              }

              setUserData({
                uid: firebaseUser.uid,
                ...memberData,
              } as UserData);
            } else {
              console.error("User document not found in Firestore");
              // Set empty userData instead of null to prevent auth loops
              setUserData({
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                balance: 0,
                deposit: 0,
                totalAsset: 0,
                totalInvested: 0,
                totalEarnings: 0,
                role: 'member',
                createdAt: new Date().toISOString(),
                emailVerified: true,
                hasPinSetup: false,
                kycStatus: "NOT_SUBMITTED",
                name: firebaseUser.displayName || firebaseUser.email || 'User'
              } as UserData);
            }
            setLoading(false);
          },
          (error) => {
            console.error("Error listening to user data:", error);
            // Set basic userData on error to prevent auth loops
            setUserData({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              balance: 0,
              deposit: 0,
              totalAsset: 0,
              totalInvested: 0,
              totalEarnings: 0,
              role: 'member',
              createdAt: new Date().toISOString(),
              emailVerified: true,
              hasPinSetup: false,
              kycStatus: "NOT_SUBMITTED",
              name: firebaseUser.displayName || firebaseUser.email || 'User'
            } as UserData);
            setLoading(false);
          }
        );
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserData(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
