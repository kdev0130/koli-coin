import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import PinUnlock from "@/pages/PinUnlock";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard component handles:
 * 1. Session persistence
 * 2. PIN unlock on app reopen
 * 3. Redirects to PIN setup if not configured
 * 4. Redirects to login if not authenticated
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, userData, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [checkingUnlock, setCheckingUnlock] = useState(true);

  // Public routes that don't require authentication
  const publicRoutes = [
    "/signin",
    "/signup",
    "/",
    "/splash",
    "/gate",
    "/forgot-password",
    "/verify-reset-otp",
    "/reset-password"
  ];
  
  // Routes that don't require PIN unlock
  const noPinRoutes = ["/pin-setup"];

  const isPublicRoute = publicRoutes.includes(location.pathname);
  const isNoPinRoute = noPinRoutes.includes(location.pathname);

  useEffect(() => {
    if (loading) return;

    // Not authenticated → redirect to login
    if (!user && !isPublicRoute) {
      navigate("/signin");
      return;
    }

    // Authenticated but userData is still loading → wait
    if (user && !userData) {
      return;
    }

    // Authenticated but userData missing (doc doesn't exist) → sign out and redirect
    if (user && userData === null && !isPublicRoute && location.pathname !== "/signin") {
      logout().then(() => {
        navigate("/signin");
      });
      return;
    }

    // Authenticated with userData and on signin page → redirect to dashboard  
    if (user && userData && location.pathname === "/signin") {
      navigate("/dashboard");
      return;
    }

    // Authenticated but on other public route → redirect to dashboard
    if (user && userData && isPublicRoute && location.pathname !== "/") {
      navigate("/dashboard");
      return;
    }

    // Check if user needs PIN setup after KYC verification
    if (user && userData && (userData.kycStatus === "VERIFIED" || userData.kycStatus === "APPROVED") && !userData.hasPinSetup && !isNoPinRoute) {
      navigate("/pin-setup");
      return;
    }

    // Authenticated with PIN setup → check if unlock is needed
    if (user && userData && userData.hasPinSetup && !isNoPinRoute) {
      // Check if we need to show PIN unlock
      const sessionUnlocked = sessionStorage.getItem(`unlocked_${user.uid}`);

      if (sessionUnlocked === "true") {
        setIsUnlocked(true);
      } else {
        setIsUnlocked(false);
      }
    } else {
      // No PIN required (either not setup or on no-PIN route)
      setIsUnlocked(true);
    }

    setCheckingUnlock(false);
  }, [user, userData, loading, location.pathname, navigate, isPublicRoute, isNoPinRoute, logout]);

  const handleUnlock = () => {
    if (user) {
      // Mark as unlocked in session storage
      sessionStorage.setItem(`unlocked_${user.uid}`, "true");
      setIsUnlocked(true);
    }
  };

  // Show loading state (but allow splash screen to render)
  if ((loading || checkingUnlock) && location.pathname !== "/") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Public routes → show directly
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Not unlocked and PIN is required → show PIN unlock
  if (!isUnlocked && userData?.hasPinSetup && !isNoPinRoute) {
    return <PinUnlock onUnlock={handleUnlock} />;
  }

  // Unlocked or no PIN required → show protected content
  return <>{children}</>;
};
