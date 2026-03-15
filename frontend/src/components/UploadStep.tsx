"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  ImagePlus,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  X,
} from "lucide-react";

/**
 * UploadStep — Step 2
 *
 * Lets the user select photos via file picker or drag-and-drop.
 *
 * For each file, three API calls happen in sequence:
 *   1. getUploadUrl()   → asks the server for a presigned S3 URL
 *   2. uploadFileToS3() → PUTs the raw file bytes to that URL
 *   3. completeUpload() → tells the server the upload finished
 *
 * Once at least one photo is uploaded, the "Analyze" button appears.
 */

type UploadedPhoto = {
  file: File;
  photoId: string;
  preview: string;          // local blob URL for the thumbnail
  status: "uploading" | "done" | "error";
  error?: string;
};

type Props = {
  inspectionId: string;
  onUploadPhoto: (file: File) => Promise<string>;   // returns photoId
  onAnalyze: (photoIds: string[]) => void;
  analyzing: boolean;
};

export default function UploadStep({
  inspectionId,
  onUploadPhoto,
  onAnalyze,
  analyzing,
}: Props) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process files (from input or drop)
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        const preview = URL.createObjectURL(file);
        const placeholder: UploadedPhoto = {
          file,
          photoId: "",
          preview,
          status: "uploading",
        };

        // Add to list immediately so user sees the thumbnail
        setPhotos((prev) => [...prev, placeholder]);

        try {
          const photoId = await onUploadPhoto(file);
          setPhotos((prev) =>
            prev.map((p) =>
              p.preview === preview ? { ...p, photoId, status: "done" } : p,
            ),
          );
        } catch (err) {
          setPhotos((prev) =>
            prev.map((p) =>
              p.preview === preview
                ? { ...p, status: "error", error: String(err) }
                : p,
            ),
          );
        }
      }
    },
    [onUploadPhoto],
  );

  const removePhoto = (preview: string) => {
    setPhotos((prev) => prev.filter((p) => p.preview !== preview));
    URL.revokeObjectURL(preview);
  };

  const uploadedPhotos = photos.filter((p) => p.status === "done");
  const hasUploads = uploadedPhotos.length > 0;
  const allDone = photos.length > 0 && photos.every((p) => p.status !== "uploading");

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      {/* Inspection ID badge */}
      <div className="flex items-center justify-center mb-6">
        <span className="glass rounded-full px-4 py-1.5 text-xs font-mono text-zinc-400">
          Inspection {inspectionId.slice(0, 8)}...
        </span>
      </div>

      <h2 className="text-2xl font-bold text-white text-center mb-2">
        Upload Vehicle Photos
      </h2>
      <p className="text-zinc-400 text-center text-sm mb-8 max-w-md mx-auto">
        Drag and drop or click to select photos. Upload as many angles as you need.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed
          transition-all duration-300 p-10 text-center
          ${dragOver
            ? "border-accent bg-accent/5"
            : "border-glass-border hover:border-zinc-600 bg-surface-1"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-surface-2 border border-glass-border flex items-center justify-center">
            {dragOver ? (
              <Upload className="w-6 h-6 text-accent-light animate-bounce" />
            ) : (
              <ImagePlus className="w-6 h-6 text-zinc-500" />
            )}
          </div>
          <p className="text-sm text-zinc-400">
            <span className="text-accent-light font-medium">Click to browse</span>{" "}
            or drag images here
          </p>
          <p className="text-xs text-zinc-600">JPG, PNG — any resolution</p>
        </div>
      </div>

      {/* Photo grid */}
      <AnimatePresence>
        {photos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-6"
          >
            {photos.map((photo, i) => (
              <motion.div
                key={photo.preview}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: i * 0.05 }}
                className="relative group aspect-square rounded-xl overflow-hidden border border-glass-border bg-surface-2"
              >
                {/* Thumbnail */}
                <img
                  src={photo.preview}
                  alt="Vehicle photo"
                  className="w-full h-full object-cover"
                />

                {/* Status overlay */}
                <div
                  className={`
                    absolute inset-0 flex items-center justify-center
                    transition-all duration-300
                    ${photo.status === "uploading" ? "bg-black/60" : ""}
                    ${photo.status === "error" ? "bg-red-900/60" : ""}
                    ${photo.status === "done" ? "bg-black/0 group-hover:bg-black/40" : ""}
                  `}
                >
                  {photo.status === "uploading" && (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  )}
                  {photo.status === "done" && (
                    <CheckCircle2 className="w-6 h-6 text-success opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                  {photo.status === "error" && (
                    <AlertCircle className="w-6 h-6 text-danger" />
                  )}
                </div>

                {/* Remove button */}
                {photo.status !== "uploading" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removePhoto(photo.preview); }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}

                {/* Done badge */}
                {photo.status === "done" && (
                  <div className="absolute bottom-1.5 left-1.5 bg-success/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    Ready
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analyze button */}
      <AnimatePresence>
        {hasUploads && allDone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex justify-center mt-8"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onAnalyze(uploadedPhotos.map((p) => p.photoId))}
              disabled={analyzing}
              className="
                group flex items-center gap-3 px-8 py-4 rounded-xl
                bg-accent hover:bg-accent-light
                text-white font-semibold text-sm tracking-wide
                transition-all duration-300 shadow-lg shadow-accent/20
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {analyzing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Analyze {uploadedPhotos.length} Photo{uploadedPhotos.length !== 1 ? "s" : ""}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
