"use client";
import { cn } from "@/lib/utils";
import React, { useRef } from "react";
import { motion, useAnimate } from "motion/react";

interface KoliButtonProps {
  className?: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const KoliButton = ({
  className,
  children,
  variant = "primary",
  loading = false,
  disabled,
  type = "button",
  onClick,
}: KoliButtonProps) => {
  const [scope, animate] = useAnimate();

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return;

    // Ripple animation
    await animate(
      scope.current,
      { scale: [1, 0.98, 1] },
      { duration: 0.15 }
    );
    
    onClick?.(event);
  };

  const baseStyles =
    "relative flex min-w-[120px] cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-base transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50";

  const variants = {
    primary:
      "bg-primary text-primary-foreground hover:brightness-110 glow-gold",
    secondary:
      "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80",
    ghost:
      "bg-transparent text-foreground hover:bg-secondary/50",
  };

  return (
    <motion.button
      ref={scope}
      layout
      type={type}
      className={cn(baseStyles, variants[variant], className)}
      disabled={disabled || loading}
      onClick={handleClick}
    >
      {loading && (
        <motion.svg
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M12 3a9 9 0 1 0 9 9" />
        </motion.svg>
      )}
      <span>{children}</span>
      
      {/* Bottom gradient highlight */}
      <span className="absolute inset-x-0 -bottom-px h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
    </motion.button>
  );
};
