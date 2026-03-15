import { APIGatewayProxyEventV2 } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../lib/dynamo";

const TABLE_NAME = process.env.INSPECTIONS_TABLE_NAME!;

type PhotoItem = {
  pk: string;
  sk: string;
  photoId: string;
  inspectionId: string;
  s3Key: string;
  status:
    | "UPLOAD_URL_CREATED"
    | "UPLOADED"
    | "ANALYSIS_PENDING"
    | "ANALYSIS_IN_PROGRESS"
    | "ANALYSIS_COMPLETE";
  createdAt?: string;
  updatedAt?: string;
  analyzedAt?: string;
  damageSummary?: string;
  detectedIssues?: string[];
  confidence?: number;
};

type InspectionMetaItem = {
  pk: string;
  sk: "META";
  inspectionId: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    const inspectionId = event.pathParameters?.inspectionId;

    if (!inspectionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "inspectionId is required" }),
      };
    }

    const pk = `INSPECTION#${inspectionId}`;

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": pk,
        },
      }),
    );

    const items = result.Items ?? [];

    if (items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Inspection not found" }),
      };
    }

    const inspectionMeta = items.find((item) => item.sk === "META") as
      | InspectionMetaItem
      | undefined;

    const photoItems = items.filter(
      (item) => typeof item.sk === "string" && item.sk.startsWith("PHOTO#"),
    ) as PhotoItem[];

    const photosByStatus = {
      UPLOAD_URL_CREATED: 0,
      UPLOADED: 0,
      ANALYSIS_PENDING: 0,
      ANALYSIS_IN_PROGRESS: 0,
      ANALYSIS_COMPLETE: 0,
    };

    let completedAnalysisCount = 0;
    let pendingAnalysisCount = 0;
    let inProgressAnalysisCount = 0;
    let uploadedNotQueuedCount = 0;
    let damageDetectedPhotoCount = 0;

    const confidenceValues: number[] = [];
    const issueCounts: Record<string, number> = {};
    let lastAnalyzedAt: string | null = null;

    for (const photo of photoItems) {
      if (photo.status in photosByStatus) {
        photosByStatus[photo.status as keyof typeof photosByStatus]++;
      }

      if (photo.status === "ANALYSIS_COMPLETE") {
        completedAnalysisCount++;
      }

      if (photo.status === "ANALYSIS_PENDING") {
        pendingAnalysisCount++;
      }

      if (photo.status === "ANALYSIS_IN_PROGRESS") {
        inProgressAnalysisCount++;
      }

      if (photo.status === "UPLOADED") {
        uploadedNotQueuedCount++;
      }

      if (
        Array.isArray(photo.detectedIssues) &&
        photo.detectedIssues.length > 0
      ) {
        damageDetectedPhotoCount++;
      }

      if (typeof photo.confidence === "number") {
        confidenceValues.push(photo.confidence);
      }

      if (Array.isArray(photo.detectedIssues)) {
        for (const issue of photo.detectedIssues) {
          issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;
        }
      }

      if (photo.analyzedAt) {
        if (!lastAnalyzedAt || photo.analyzedAt > lastAnalyzedAt) {
          lastAnalyzedAt = photo.analyzedAt;
        }
      }
    }

    const averageConfidence =
      confidenceValues.length > 0
        ? Number(
            (
              confidenceValues.reduce((sum, value) => sum + value, 0) /
              confidenceValues.length
            ).toFixed(2),
          )
        : null;

    const overallAnalysisStatus =
      photoItems.length === 0
        ? "NO_PHOTOS"
        : completedAnalysisCount === photoItems.length
          ? "COMPLETE"
          : inProgressAnalysisCount > 0
            ? "IN_PROGRESS"
            : pendingAnalysisCount > 0
              ? "PENDING"
              : uploadedNotQueuedCount > 0
                ? "UPLOADED_WAITING_ANALYSIS"
                : "PARTIAL";

    const photoResults = photoItems.map((photo) => ({
      photoId: photo.photoId,
      s3Key: photo.s3Key,
      status: photo.status,
      analyzedAt: photo.analyzedAt ?? null,
      damageSummary: photo.damageSummary ?? null,
      detectedIssues: photo.detectedIssues ?? [],
      confidence:
        typeof photo.confidence === "number" ? photo.confidence : null,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        inspectionId,
        inspectionStatus: inspectionMeta?.status ?? null,
        summary: {
          totalPhotos: photoItems.length,
          photosByStatus,
          completedAnalysisCount,
          pendingAnalysisCount,
          inProgressAnalysisCount,
          uploadedNotQueuedCount,
          damageDetectedPhotoCount,
          averageConfidence,
          issueCounts,
          lastAnalyzedAt,
          overallAnalysisStatus,
        },
        photoResults,
      }),
    };
  } catch (error) {
    console.error("Failed to get inspection summary", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to get inspection summary",
      }),
    };
  }
};
