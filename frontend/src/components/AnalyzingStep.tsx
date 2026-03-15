"use client";

import { motion } from "framer-motion";
import { Scan, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import type { InspectionReport } from "@/lib/api";

/**
 * AnalyzingStep — Step 3
 *
 * Shows a progress view while the AI processes each photo.
 * We poll GET /inspections/{id}/report every 3 seconds.
 * Each photo shows its own status (pending → analyzing → done/failed).
 */

type Props = {
  report: InspectionReport | null;
};

export default function AnalyzingStep({ report }: Props) {
  const total = report?.summary.totalPhotos ?? 0;
  const done = (report?.summary.completedPhotos ?? 0) + (report?.summary.failedPhotos ?? 0);
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center"
    >
      {/* Animated scanner icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="relative mb-8"
      >
        <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center overflow-hidden scan-line">
          <Scan className="w-9 h-9 text-accent-light" />
        </div>
        <div className="absolute -inset-3 rounded-3xl border border-accent/10 pulse-ring" />
      </motion.div>

      <h2 className="text-2xl font-bold text-white mb-2">Analyzing Photos</h2>
      <p className="text-zinc-400 text-sm mb-8">
        AI is inspecting your vehicle images...
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-sm mb-3">
        <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
      <p className="text-xs text-zinc-500 font-mono mb-10">
        {done} / {total} photos complete — {percent}%
      </p>

      {/* Per-photo status cards */}
      {report && (
        <div className="w-full max-w-md space-y-2">
          {report.photos.map((photo, i) => {
            const isComplete = photo.status === "ANALYSIS_COMPLETE";
            const isFailed = photo.status === "ANALYSIS_FAILED";
            const isPending = !isComplete && !isFailed;

            return (
              <motion.div
                key={photo.photoId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <div className="flex-shrink-0">
                  {isComplete && <CheckCircle2 className="w-5 h-5 text-success" />}
                  {isFailed && <AlertCircle className="w-5 h-5 text-danger" />}
                  {isPending && <Loader2 className="w-5 h-5 text-accent-light animate-spin" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-mono truncate">
                    {photo.photoId.slice(0, 12)}...
                  </p>
                  <p className="text-xs text-zinc-500 capitalize">
                    {photo.status.replace(/_/g, " ").toLowerCase()}
                  </p>
                </div>
                {isComplete && photo.confidence !== null && (
                  <span className="text-xs font-semibold text-success">
                    {Math.round(photo.confidence * 100)}%
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
