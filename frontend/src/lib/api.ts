/**
 * api.ts — All the functions that talk to your backend.
 *
 * Each function maps to one of your backend endpoints.
 * We keep them in one file so the rest of the app never
 * has to think about URLs or fetch options.
 *
 * Change API_BASE to point at your deployed API Gateway URL.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001";

// ── Helpers ──────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Types ────────────────────────────────────────────────

export type Inspection = {
  inspectionId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PhotoUploadResponse = {
  photoId: string;
  key: string;
  uploadUrl: string;
  expiresIn: number;
};

export type PhotoItem = {
  photoId: string;
  s3Key: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  analyzedAt: string | null;
  damageSummary: string | null;
  detectedIssues: string[];
  confidence: number | null;
  failureReason: string | null;
};

export type InspectionReport = {
  inspectionId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  summary: {
    totalPhotos: number;
    completedPhotos: number;
    failedPhotos: number;
    pendingPhotos: number;
    issuesDetected: number;
    averageConfidence: number | null;
  };
  photos: PhotoItem[];
};

// ── 1. Create Inspection ─────────────────────────────────
// POST /inspections  →  creates a new inspection record

export async function createInspection(): Promise<Inspection> {
  const data = await request<{ inspection: Inspection }>("/inspections", {
    method: "POST",
  });
  return data.inspection;
}

// ── 2. Get Upload URL ────────────────────────────────────
// POST /inspections/{id}/photos  →  returns a presigned S3 URL

export async function getUploadUrl(
  inspectionId: string,
): Promise<PhotoUploadResponse> {
  return request<PhotoUploadResponse>(`/inspections/${inspectionId}/photos`, {
    method: "POST",
  });
}

// ── 3. Upload File to S3 ────────────────────────────────
// PUT to the presigned URL with the raw file bytes

export async function uploadFileToS3(
  uploadUrl: string,
  file: File,
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: file,
  });
  if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
}

// ── 4. Mark Upload Complete ──────────────────────────────
// POST /inspections/{id}/photos/{photoId}/complete

export async function completeUpload(
  inspectionId: string,
  photoId: string,
): Promise<void> {
  await request(`/inspections/${inspectionId}/photos/${photoId}/complete`, {
    method: "POST",
  });
}

// ── 5. Trigger Analysis ──────────────────────────────────
// POST /inspections/{id}/photos/{photoId}/analyze
// Queues the photo for AI analysis

export async function triggerAnalysis(
  inspectionId: string,
  photoId: string,
): Promise<void> {
  await request(`/inspections/${inspectionId}/photos/${photoId}/analyze`, {
    method: "POST",
  });
}

// ── 6. Get Report ────────────────────────────────────────
// GET /inspections/{id}/report  →  full inspection results

export async function getReport(
  inspectionId: string,
): Promise<InspectionReport> {
  return request<InspectionReport>(`/inspections/${inspectionId}/report`);
}
