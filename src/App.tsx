import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster as SonnerToaster } from "sonner";
import SplashScreen from "./pages/SplashScreen";
import PlatformGate from "./pages/PlatformGate";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import VerifyOTP from "./pages/VerifyOTP";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <Routes>
            {/* Auth Flow */}
            <Route path="/" element={<SplashScreen />} />
            <Route path="/gate" element={<PlatformGate />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
            
            {/* Main App */}
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          <SonnerToaster position="top-center" richColors />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
