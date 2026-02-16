import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

// Check install gate status (mobile browser vs standalone PWA)
const useInstallGate = () => {
  const [status, setStatus] = React.useState<{
    ready: boolean;
    isMobile: boolean;
    isStandalone: boolean;
  }>({
    ready: false,
    isMobile: false,
    isStandalone: false,
  });

  React.useEffect(() => {
    const checkInstallContext = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://') ||
        window.matchMedia('(display-mode: fullscreen)').matches;

      const userAgent = window.navigator.userAgent.toLowerCase();
      const isMobile = /android|iphone|ipad|ipod/.test(userAgent);

      setStatus({
        ready: true,
        isMobile,
        isStandalone,
      });
    };

    checkInstallContext();

    const timer = setTimeout(checkInstallContext, 100);
    return () => clearTimeout(timer);
  }, []);

  return status;
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
  const { ready, isMobile, isStandalone } = useInstallGate();

  // If still checking install context, show nothing
  if (!ready) {
    return null;
  }

  // Mobile browsers must install/open as standalone PWA before app access.
  // Desktop/web browsers continue directly without install wall.
  if (isMobile && !isStandalone) {
    return <InstallApp />;
  }

  // Installed PWA (mobile) or desktop/web mode - show full app with auth
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
