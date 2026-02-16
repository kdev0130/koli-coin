import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IconDeviceMobile, IconShare, IconPlus, IconCheck, IconExternalLink } from "@tabler/icons-react";
import koliLogo from "@/assets/koli-logo.png";
import { Button } from "@/components/ui/button";

type InstallState = 
  | "detecting" 
  | "android-ready" 
  | "android-installing" 
  | "ios-preparing" 
  | "ios-instructions" 
  | "in-app-browser" 
  | "already-installed" 
  | "unsupported";

export const InstallApp = () => {
  const [installState, setInstallState] = useState<InstallState>("detecting");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    detectPlatformAndState();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallState("android-ready");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const detectPlatformAndState = () => {
    // Check if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true) {
      setInstallState("already-installed");
      // Redirect to app after 2 seconds
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
    
    // Detect in-app browsers (Facebook, Instagram, LinkedIn, etc.)
    const isInAppBrowser = /fbav|fban|instagram|linkedin|twitter|tiktok|snapchat/.test(userAgent);

    if (isInAppBrowser) {
      setInstallState("in-app-browser");
      return;
    }

    // iOS Safari flow
    if (isIOS && isSafari) {
      setInstallState("ios-preparing");
      // Show preparation screen briefly before instructions
      setTimeout(() => {
        setInstallState("ios-instructions");
      }, 1500);
      return;
    }

    // Android Chrome flow
    if (isAndroid) {
      setInstallState("android-ready");
      return;
    }

    // Desktop or unsupported
    setInstallState("unsupported");
  };

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) {
      // Keep native install-only flow for Android
      setInstallState("android-ready");
      return;
    }

    setInstallState("android-installing");

    try {
      // Show native install prompt
      deferredPrompt.prompt();
      
      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        // Installation successful
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
      } else {
        // User dismissed prompt
        setInstallState("android-ready");
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Install error:', error);
      setInstallState("android-ready");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-sky-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-sky-400/15 blur-[100px]" />
      </div>

      <AnimatePresence mode="wait">
        {/* Detecting state */}
        {installState === "detecting" && (
          <motion.div
            key="detecting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center relative z-10"
          >
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Preparing installation...</p>
          </motion.div>
        )}

        {/* Already installed */}
        {installState === "already-installed" && (
          <motion.div
            key="installed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center relative z-10"
          >
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <IconCheck size={40} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">App Already Installed</h2>
            <p className="text-muted-foreground">Opening $KOLI...</p>
          </motion.div>
        )}

        {/* Android ready */}
        {installState === "android-ready" && (
          <motion.div
            key="android-ready"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-md w-full relative z-10 mb-20"
          >
            <div className="text-center mb-8">
              <img src={koliLogo} alt="KOLI" className="w-24 h-24 mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-foreground mb-3">
                Install $KOLI App
              </h1>
              <p className="text-muted-foreground">
                Get instant access to your crypto wallet, donations, and mining rewards.
              </p>
            </div>

            <div className="bg-white/90 dark:bg-card border border-sky-200/70 dark:border-border rounded-2xl p-6 mb-6 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <IconCheck size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Fast & Secure</p>
                    <p className="text-sm text-muted-foreground">Direct access without app stores</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <IconCheck size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Offline Access</p>
                    <p className="text-sm text-muted-foreground">Works without internet connection</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <IconCheck size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">One-Tap Updates</p>
                    <p className="text-sm text-muted-foreground">Always stay up to date</p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleAndroidInstall}
              disabled={!deferredPrompt}
              className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 text-white"
            >
              Install App Now
            </Button>

            {!deferredPrompt ? (
              <p className="text-center text-xs text-muted-foreground mt-4">
                Preparing native Android install prompt...
              </p>
            ) : (
              <p className="text-center text-xs text-muted-foreground mt-4">
                Installation takes less than 5 seconds
              </p>
            )}
          </motion.div>
        )}

        {/* Android installing */}
        {installState === "android-installing" && (
          <motion.div
            key="android-installing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center relative z-10"
          >
            <img src={koliLogo} alt="KOLI" className="w-20 h-20 mx-auto mb-6 animate-pulse" />
            <div className="mb-6">
              <div className="w-48 h-2 bg-secondary rounded-full mx-auto overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Installing $KOLI</h2>
            <p className="text-muted-foreground">Please wait a moment...</p>
          </motion.div>
        )}

        {/* iOS preparing */}
        {installState === "ios-preparing" && (
          <motion.div
            key="ios-preparing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center relative z-10"
          >
            <img src={koliLogo} alt="KOLI" className="w-20 h-20 mx-auto mb-6 animate-pulse" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Preparing Installation</h2>
            <p className="text-muted-foreground">Getting everything ready...</p>
          </motion.div>
        )}

        {/* iOS instructions */}
        {installState === "ios-instructions" && (
          <motion.div
            key="ios-instructions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-md w-full relative z-10 mb-20"
          >
            <div className="text-center mb-8">
              <img src={koliLogo} alt="KOLI" className="w-20 h-20 mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-foreground mb-3">
                Finish Installing $KOLI
              </h1>
              <p className="text-muted-foreground">
                Complete the installation with two quick taps
              </p>
            </div>

            <div className="bg-white/90 dark:bg-card border border-sky-200/70 dark:border-border rounded-2xl p-6 space-y-6 shadow-sm">
              {/* Step 1 */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-semibold text-foreground">Tap the Share button</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <div className="w-8 h-8 border-2 border-primary rounded-lg flex items-center justify-center">
                      <IconShare size={16} className="text-primary" />
                    </div>
                    <span>Located at the bottom or top of Safari</span>
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-border" />

              {/* Step 2 */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground mb-2">Select "Add to Home Screen"</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-8 h-8 border-2 border-primary rounded-lg flex items-center justify-center">
                      <IconPlus size={16} className="text-primary" />
                    </div>
                    <span>Scroll down if you don't see it</span>
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-border" />

              {/* Step 3 */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground mb-2">Tap "Add" to confirm</p>
                  <p className="text-sm text-muted-foreground">
                    The $KOLI app will appear on your home screen
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-20" />
          </motion.div>
        )}

        {/* In-app browser */}
        {installState === "in-app-browser" && (
          <motion.div
            key="in-app"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-md w-full relative z-10 mb-20"
          >
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
                <IconDeviceMobile size={40} className="text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">
                Open in Safari to Install
              </h1>
              <p className="text-muted-foreground">
                To install $KOLI, please open this page in Safari
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 text-sm">
                  1
                </div>
                <p className="text-foreground pt-1">
                  Tap the <strong>menu button</strong> (⋯) at the top or bottom
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 text-sm">
                  2
                </div>
                <div className="pt-1">
                  <p className="text-foreground mb-2">
                    Select <strong>"Open in Safari"</strong>
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconExternalLink size={16} />
                    <span>or "Open in Browser"</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 text-sm">
                  3
                </div>
                <p className="text-foreground pt-1">
                  Follow the installation steps in Safari
                </p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Installation only works in Safari on iPhone
              </p>
            </div>
          </motion.div>
        )}

        {/* Unsupported */}
        {installState === "unsupported" && (
          <motion.div
            key="unsupported"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-md w-full text-center relative z-10 mb-20"
          >
            <img src={koliLogo} alt="KOLI" className="w-20 h-20 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Desktop Version Available
            </h1>
            <p className="text-muted-foreground mb-8">
              For the best experience, access $KOLI from your mobile device
            </p>
            <Button
              onClick={() => window.location.href = "/dashboard"}
              className="w-full"
            >
              Continue to Web Version
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-8 left-0 right-0 text-center z-10"
      >
        <p className="text-xs text-muted-foreground">
          Kingdom of Love International © 2024
        </p>
      </motion.footer>
    </div>
  );
};

export default InstallApp;
