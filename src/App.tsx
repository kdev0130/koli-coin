import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Toaster as SonnerToaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AuthGuard } from "./components/AuthGuard";
import { ScrollToTop } from "./components/ScrollToTop";

import SplashScreen from "./pages/SplashScreen";
import PlatformGate from "./pages/PlatformGate";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import PinSetup from "./pages/PinSetup";
import Dashboard from "./pages/Dashboard";
import Donation from "./pages/Donation";
import Mining from "./pages/Mining";
import Profile from "./pages/Profile";
import KYCSubmission from "./pages/KYCSubmission";
import TransactionHistory from "./pages/TransactionHistory";
import InstallApp from "./pages/InstallApp";
import NotFound from "./pages/NotFound";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import VerifyResetOTP from "./pages/VerifyResetOTP";
import ResetPasswordPage from "./pages/ResetPasswordPage";

const queryClient = new QueryClient();

// Check if running as PWA
const useIsPWA = () => {
  const [isPWA, setIsPWA] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    // Multiple checks for better iOS compatibility
    const checkPWA = () => {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://') ||
        window.matchMedia('(display-mode: fullscreen)').matches;
      
      setIsPWA(isStandalone);
    };

    // Immediate check
    checkPWA();

    // Also check after a short delay for iOS
    const timer = setTimeout(checkPWA, 100);
    return () => clearTimeout(timer);
  }, []);

  return isPWA;
};

// Root Landing - shows install page or splash based on PWA mode
const RootLanding = () => {
  const isPWA = useIsPWA();

  // Loading state
  if (isPWA === null) {
    return null;
  }

  // TEMPORARILY DISABLED: Show install page if not installed, otherwise splash screen
  // return isPWA ? <SplashScreen /> : <InstallApp />;
  return <SplashScreen />;
};

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <SplashScreen />;
  }
  
  if (!user) {
    return <Navigate to="/signin" replace />;
  }
  
  return <>{children}</>;
};

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const hasAcceptedCode = localStorage.getItem("koli_platform_accepted") === "true";
  
  if (loading) {
    return <SplashScreen />;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

function AppRoutes() {
  const isPWA = useIsPWA();

  // TEMPORARILY DISABLED: If not a PWA and trying to access any route, show install page
  // if (isPWA === false) {
  //   return <InstallApp />;
  // }

  // If still checking PWA status, show nothing
  if (isPWA === null) {
    return null;
  }

  // PWA mode - show full app with auth
  return (
    <AuthGuard>
      <ScrollToTop />
      <Routes>
        {/* Root - splash screen in PWA mode */}
        <Route path="/" element={<SplashScreen />} />
        
        {/* Platform Gate */}
        <Route path="/gate" element={<PlatformGate />} />

        {/* Forgot Password Flow */}
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/verify-reset-otp" element={<PublicRoute><VerifyResetOTP /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
        
        {/* Auth Routes */}
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        
        {/* PIN Setup (optional - set during KYC or anytime) */}
        <Route path="/pin-setup" element={<PinSetup />} />
        
        {/* Protected Routes (require authentication, PIN unlock if PIN is set) */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/donation" element={<Donation />} />
        <Route path="/mining" element={<Mining />} />
        <Route path="/profile" element={<Profile />} />
        
        {/* KYC Submission */}
        <Route path="/kyc-submission" element={<KYCSubmission />} />
        
        {/* Transaction History */}
        <Route path="/transaction-history" element={<TransactionHistory />} />
        
        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <TooltipProvider>
            <AppRoutes />
            <Toaster />
            <SonnerToaster position="top-center" richColors />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
