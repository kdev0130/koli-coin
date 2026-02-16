import React, { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { IconLock, IconShieldCheck } from "@tabler/icons-react";
import { Spotlight } from "@/components/ui/spotlight";
import { AnimatedInput } from "@/components/ui/animated-input";
import { KoliButton } from "@/components/ui/koli-button";
import koliLogo from "@/assets/koli-logo.png";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const PLATFORM_ACCEPTED_KEY = "koli_platform_accepted";
const PLATFORM_ACCESS_KEY = "koli_platform_access";

const PlatformGate = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Query Firestore for the platform code
      const codesRef = collection(db, "platformCodes");
      const q = query(
        codesRef, 
        where("code", "==", code.toUpperCase()),
        where("isActive", "==", true)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const codeDoc = querySnapshot.docs[0];
        const codeData = codeDoc.data();
        const maxUses = codeData.maxUses;
        const usageCount = Number(codeData.usageCount || 0);

        if (maxUses !== null && typeof maxUses === "number" && usageCount >= maxUses) {
          setError("This platform code has reached its maximum number of uses.");
          return;
        }

        // Valid code found - persist accepted access + leader metadata for signup
        localStorage.setItem(PLATFORM_ACCEPTED_KEY, "true");
        localStorage.setItem(
          PLATFORM_ACCESS_KEY,
          JSON.stringify({
            platformCodeId: codeDoc.id,
            platformCode: String(codeData.code || code.toUpperCase()),
            leaderId: codeData.leaderId || null,
            leaderName: codeData.leaderName || null,
            validatedAt: Date.now(),
          })
        );
        navigate("/signup");
      } else {
        setError("Invalid community code. Please contact your leader.");
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      setError("Error verifying code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background safe-top safe-bottom relative overflow-hidden">
      <Spotlight />
      
      <div className="flex-1 flex flex-col px-6 py-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center"
        >
          <img src={koliLogo} alt="KOLI" className="w-12 h-12" />
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <IconShieldCheck size={40} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Exclusive Access
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Exclusively for KOLI Community Donors. Enter the code your leader disseminated to you.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onSubmit={handleSubmit}
            className="w-full space-y-6"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <IconLock size={16} className="text-primary" />
                Platform Code
              </label>
              <AnimatedInput
                type="text"
                placeholder="Enter your community code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="uppercase tracking-widest text-center font-mono"
                required
              />
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-destructive text-sm text-center"
                >
                  {error}
                </motion.p>
              )}
            </div>

            <KoliButton
              type="submit"
              loading={loading}
              className="w-full"
            >
              Verify Access
            </KoliButton>
          </motion.form>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground"
        >
          Kingdom of Love International © 2024
        </motion.p>
      </div>
    </div>
  );
};

export default PlatformGate;
