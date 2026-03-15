"use client";

import { useState, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import StepIndicator from "@/components/StepIndicator";
import CreateStep from "@/components/CreateStep";
import UploadStep from "@/components/UploadStep";
import AnalyzingStep from "@/components/AnalyzingStep";
import ReportStep from "@/components/ReportStep";
import {
  createInspection,
  getUploadUrl,
  uploadFileToS3,
  completeUpload,
  triggerAnalysis,
  getReport,
  type InspectionReport,
} from "@/lib/api";

/**
 * page.tsx — The main (and only) page of the app.
 *
 * This component manages the overall flow:
 *
 *   Step 0 (Create)   → user clicks "Start" → POST /inspections
 *   Step 1 (Upload)   → user uploads photos  → presigned URL → S3 → complete
 *   Step 2 (Analyze)  → triggers analysis    → polls for results
 *   Step 3 (Report)   → shows final report
 *
 * All API calls are in src/lib/api.ts.
 */

export default function Home() {
  // ── State ──────────────────────────────────────────────

  const [step, setStep] = useState(0);             // which step we're on (0-3)
  const [inspectionId, setInspectionId] = useState(""); // ID from backend
  const [loading, setLoading] = useState(false);    // for the create button spinner
  const [analyzing, setAnalyzing] = useState(false);// for the analyze button spinner
  const [report, setReport] = useState<InspectionReport | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Step 0 → 1: Create Inspection ─────────────────────

  const handleCreate = useCallback(async () => {
    setLoading(true);
    try {
      const inspection = await createInspection();
      setInspectionId(inspection.inspectionId);
      setStep(1);
    } catch (err) {
      console.error("Failed to create inspection:", err);
      alert("Failed to create inspection. Is the API running?");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Step 1: Upload a single photo ─────────────────────
  // Called once per file. Returns the photoId on success.

  const handleUploadPhoto = useCallback(
    async (file: File): Promise<string> => {
      // 1. Ask backend for a presigned upload URL
      const { photoId, uploadUrl } = await getUploadUrl(inspectionId);

      // 2. Upload the file directly to S3
      await uploadFileToS3(uploadUrl, file);

      // 3. Tell the backend the upload is done
      await completeUpload(inspectionId, photoId);

      return photoId;
    },
    [inspectionId],
  );

  // ── Step 1 → 2: Trigger analysis & start polling ─────

  const handleAnalyze = useCallback(
    async (photoIds: string[]) => {
      setAnalyzing(true);
      try {
        // Trigger analysis for every uploaded photo
        await Promise.all(
          photoIds.map((id) => triggerAnalysis(inspectionId, id)),
        );

        setStep(2);
        setAnalyzing(false);

        // Start polling the report endpoint every 3 seconds
        pollRef.current = setInterval(async () => {
          try {
            const r = await getReport(inspectionId);
            setReport(r);

            // Check if all photos are in a terminal state
            const allDone = r.summary.pendingPhotos === 0;
            if (allDone) {
              // Stop polling and move to report step
              if (pollRef.current) clearInterval(pollRef.current);
              setStep(3);
            }
          } catch (err) {
            console.error("Polling error:", err);
          }
        }, 3000);
      } catch (err) {
        console.error("Failed to trigger analysis:", err);
        setAnalyzing(false);
      }
    },
    [inspectionId],
  );

  // ── Step 3 → 0: Reset for a new inspection ───────────

  const handleReset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep(0);
    setInspectionId("");
    setReport(null);
  }, []);

  // ── Render ─────────────────────────────────────────────

  return (
    <main className="min-h-screen dot-grid">
      {/* Ambient gradient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Step indicator */}
        <StepIndicator current={step} />

        {/* Step content — AnimatePresence handles enter/exit animations */}
        <AnimatePresence mode="wait">
          {step === 0 && (
            <CreateStep
              key="create"
              onStart={handleCreate}
              loading={loading}
            />
          )}

          {step === 1 && (
            <UploadStep
              key="upload"
              inspectionId={inspectionId}
              onUploadPhoto={handleUploadPhoto}
              onAnalyze={handleAnalyze}
              analyzing={analyzing}
            />
          )}

          {step === 2 && (
            <AnalyzingStep
              key="analyzing"
              report={report}
            />
          )}

          {step === 3 && report && (
            <ReportStep
              key="report"
              report={report}
              onReset={handleReset}
            />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
