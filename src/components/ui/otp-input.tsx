"use client";
import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface OTPInputProps {
  length?: number;
  onComplete?: (otp: string) => void;
  className?: string;
}

export const OTPInput = ({ length = 6, onComplete, className }: OTPInputProps) => {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Move to next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    const otpValue = newOtp.join("");
    if (otpValue.length === length && !newOtp.includes("")) {
      onComplete?.(otpValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, length);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split("").forEach((char, i) => {
      if (i < length) newOtp[i] = char;
    });
    setOtp(newOtp);

    // Focus last filled input or next empty
    const lastIndex = Math.min(pastedData.length, length) - 1;
    inputRefs.current[lastIndex]?.focus();

    if (pastedData.length === length) {
      onComplete?.(pastedData);
    }
  };

  return (
    <div className={cn("flex gap-3 justify-center", className)}>
      {otp.map((digit, index) => (
        <motion.input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={cn(
            "w-12 h-14 text-center text-xl font-bold rounded-lg",
            "bg-secondary border-2 border-border",
            "text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30",
            "transition-all duration-200",
            digit && "border-primary bg-primary/10"
          )}
        />
      ))}
    </div>
  );
};
