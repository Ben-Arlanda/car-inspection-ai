"use client";

import { motion } from "framer-motion";
import { Scan, ArrowRight, Shield, Cpu, Zap } from "lucide-react";

/**
 * CreateStep — Step 1
 *
 * The landing view. Shows a hero section with a single CTA button.
 * When the user clicks "Start Inspection", we call POST /inspections
 * to create a new inspection record, then move to Step 2.
 */

const features = [
  { icon: Cpu, label: "AI-Powered", desc: "Claude vision analysis" },
  { icon: Zap, label: "Instant", desc: "Results in seconds" },
  { icon: Shield, label: "Accurate", desc: "Detailed damage detection" },
];

type Props = {
  onStart: () => void;
  loading: boolean;
};

export default function CreateStep({ onStart, loading }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center text-center"
    >
      {/* Hero icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        className="relative mb-8"
      >
        <div className="w-24 h-24 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center glow-accent">
          <Scan className="w-10 h-10 text-accent-light" />
        </div>
        {/* Decorative ring */}
        <div className="absolute -inset-3 rounded-3xl border border-accent/10 pulse-ring" />
      </motion.div>

      <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
        Vehicle Damage Inspector
      </h2>
      <p className="text-zinc-400 max-w-md mb-10 leading-relaxed">
        Upload photos of your vehicle and our AI will analyze each image
        for damage, scratches, dents, and other issues.
      </p>

      {/* Feature cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-10 w-full max-w-lg">
        {features.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="glass rounded-xl p-4 flex flex-col items-center gap-2"
          >
            <f.icon className="w-5 h-5 text-accent-light" />
            <span className="text-xs font-semibold text-white">{f.label}</span>
            <span className="text-[11px] text-zinc-500">{f.desc}</span>
          </motion.div>
        ))}
      </div>

      {/* CTA button */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        disabled={loading}
        className="
          group flex items-center gap-3 px-8 py-4 rounded-xl
          bg-accent hover:bg-accent-light
          text-white font-semibold text-sm tracking-wide
          transition-all duration-300 shadow-lg shadow-accent/20
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            Start Inspection
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </motion.button>
    </motion.div>
  );
}
