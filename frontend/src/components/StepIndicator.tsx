"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

/**
 * StepIndicator — the horizontal progress bar at the top.
 *
 * Shows which step the user is on (Create → Upload → Analyze → Report).
 * Completed steps get a checkmark; the active step pulses with accent color.
 */

const steps = ["Create", "Upload", "Analyze", "Report"];

export default function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-12">
      {steps.map((label, i) => {
        const isFinalStep = current === steps.length - 1;
        const isComplete = i < current || (isFinalStep && i === current);
        const isActive = i === current && !isFinalStep;

        return (
          <div key={label} className="flex items-center gap-2">
            {/* Step circle */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`
                relative flex items-center justify-center w-9 h-9 rounded-full
                text-xs font-semibold tracking-wide transition-all duration-500
                ${isComplete
                  ? "bg-accent text-white"
                  : isActive
                    ? "bg-accent/20 text-accent-light border border-accent/50"
                    : "bg-surface-2 text-zinc-500 border border-glass-border"
                }
              `}
            >
              {isComplete ? <Check size={16} /> : i + 1}
              {isActive && (
                <span className="absolute inset-0 rounded-full border-2 border-accent pulse-ring" />
              )}
            </motion.div>

            {/* Label */}
            <span
              className={`text-xs font-medium tracking-wider uppercase hidden sm:inline ${
                isActive ? "text-accent-light" : isComplete ? "text-zinc-300" : "text-zinc-600"
              }`}
            >
              {label}
            </span>

            {/* Connector line (not after last) */}
            {i < steps.length - 1 && (
              <div className="w-8 sm:w-12 h-px mx-1">
                <motion.div
                  className="h-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: i * 0.15, duration: 0.4 }}
                  style={{
                    background: isComplete
                      ? "var(--color-accent)"
                      : "var(--color-glass-border)",
                    transformOrigin: "left",
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
