"use client";

import { motion } from "framer-motion";
import {
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Camera,
  RotateCcw,
} from "lucide-react";
import type { InspectionReport } from "@/lib/api";

/**
 * ReportStep — Step 4
 *
 * Displays the full inspection report from GET /inspections/{id}/report.
 * Laid out in a dashboard-style grid with:
 *   - Summary stat cards across the top
 *   - Per-photo detail cards below
 */

type Props = {
  report: InspectionReport;
  onReset: () => void;
};

export default function ReportStep({ report, onReset }: Props) {
  const { summary, photos } = report;

  const confidencePercent = summary.averageConfidence
    ? Math.round(summary.averageConfidence * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center">
          <FileCheck className="w-5 h-5 text-success" />
        </div>
        <h2 className="text-2xl font-bold text-white">Inspection Complete</h2>
      </div>
      <p className="text-zinc-400 text-center text-sm mb-8">
        Inspection {report.inspectionId.slice(0, 8)}... — {new Date(report.createdAt).toLocaleDateString()}
      </p>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          {
            label: "Total Photos",
            value: summary.totalPhotos,
            icon: Camera,
            color: "text-zinc-300",
          },
          {
            label: "Analyzed",
            value: summary.completedPhotos,
            icon: CheckCircle2,
            color: "text-success",
          },
          {
            label: "Issues Found",
            value: summary.issuesDetected,
            icon: AlertTriangle,
            color: summary.issuesDetected > 0 ? "text-warning" : "text-zinc-400",
          },
          {
            label: "Confidence",
            value: confidencePercent !== null ? `${confidencePercent}%` : "—",
            icon: BarChart3,
            color: "text-accent-light",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            className="glass rounded-xl p-4 text-center"
          >
            <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider mt-1">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Per-photo details */}
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
        Photo Analysis Details
      </h3>
      <div className="space-y-3">
        {photos.map((photo, i) => {
          const isComplete = photo.status === "ANALYSIS_COMPLETE";
          const isFailed = photo.status === "ANALYSIS_FAILED";

          return (
            <motion.div
              key={photo.photoId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className={`
                glass rounded-xl p-5
                ${isComplete && photo.detectedIssues.length > 0 ? "glow-accent" : ""}
                ${isComplete && photo.detectedIssues.length === 0 ? "glow-success" : ""}
              `}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                  ) : isFailed ? (
                    <XCircle className="w-4 h-4 text-danger flex-shrink-0" />
                  ) : null}
                  <span className="text-xs font-mono text-zinc-400">
                    {photo.photoId.slice(0, 12)}...
                  </span>
                </div>
                {photo.confidence !== null && (
                  <span className="text-xs font-semibold text-accent-light bg-accent/10 px-2 py-0.5 rounded-full">
                    {Math.round(photo.confidence * 100)}% confidence
                  </span>
                )}
              </div>

              {/* Damage summary */}
              {photo.damageSummary && (
                <p className="text-sm text-zinc-300 leading-relaxed mb-3">
                  {photo.damageSummary}
                </p>
              )}

              {/* Detected issues as tags */}
              {photo.detectedIssues.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {photo.detectedIssues.map((issue, j) => (
                    <span
                      key={j}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-warning/10 text-warning border border-warning/20"
                    >
                      {issue}
                    </span>
                  ))}
                </div>
              )}

              {/* No issues */}
              {isComplete && photo.detectedIssues.length === 0 && (
                <p className="text-sm text-success/80">No damage detected</p>
              )}

              {/* Failed */}
              {isFailed && photo.failureReason && (
                <p className="text-sm text-danger/80">{photo.failureReason}</p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* New inspection button */}
      <div className="flex justify-center mt-10">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onReset}
          className="
            group flex items-center gap-2 px-6 py-3 rounded-xl
            bg-surface-2 hover:bg-surface-3 border border-glass-border
            text-zinc-300 font-medium text-sm
            transition-all duration-300
          "
        >
          <RotateCcw className="w-4 h-4 group-hover:-rotate-90 transition-transform duration-300" />
          New Inspection
        </motion.button>
      </div>
    </motion.div>
  );
}
