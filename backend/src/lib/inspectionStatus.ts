export type PhotoStatus =
  | "UPLOAD_URL_CREATED"
  | "UPLOADED"
  | "ANALYSIS_PENDING"
  | "ANALYSIS_IN_PROGRESS"
  | "ANALYSIS_COMPLETE"
  | "ANALYSIS_FAILED";

export type InspectionStatus = "CREATED" | "ANALYZING" | "COMPLETE" | "FAILED";

type PhotoLike = {
  status: PhotoStatus;
};

export const calculateInspectionStatus = (
  photos: PhotoLike[],
): InspectionStatus => {
  if (photos.length === 0) {
    return "CREATED";
  }

  const allComplete = photos.every(
    (photo) => photo.status === "ANALYSIS_COMPLETE",
  );

  if (allComplete) {
    return "COMPLETE";
  }

  const allFailed = photos.every((photo) => photo.status === "ANALYSIS_FAILED");

  if (allFailed) {
    return "FAILED";
  }

  const hasAnalysisWorkStarted = photos.some((photo) =>
    [
      "ANALYSIS_PENDING",
      "ANALYSIS_IN_PROGRESS",
      "ANALYSIS_COMPLETE",
      "ANALYSIS_FAILED",
    ].includes(photo.status),
  );

  if (hasAnalysisWorkStarted) {
    return "ANALYZING";
  }

  return "CREATED";
};
