import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const tableName = process.env.INSPECTIONS_TABLE_NAME!;

type InspectionMetaItem = {
  pk: string;
  sk: string;
  inspectionId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

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
    | "ANALYSIS_COMPLETE"
    | "ANALYSIS_FAILED";
  createdAt: string;
  updatedAt: string;
  analyzedAt?: string;
  damageSummary?: string;
  detectedIssues?: string[];
  confidence?: number;
  failureReason?: string;
};

const jsonResponse = (
  statusCode: number,
  body: Record<string, unknown>,
): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const inspectionId = event.pathParameters?.inspectionId;

    if (!inspectionId) {
      return jsonResponse(400, {
        message: "inspectionId path parameter is required",
      });
    }

    const pk = `INSPECTION#${inspectionId}`;

    const metaResult = await dynamo.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          pk,
          sk: "META",
        },
      }),
    );

    const inspection = metaResult.Item as InspectionMetaItem | undefined;

    if (!inspection) {
      return jsonResponse(404, {
        message: "Inspection not found",
      });
    }

    const photosResult = await dynamo.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :photoPrefix)",
        ExpressionAttributeValues: {
          ":pk": pk,
          ":photoPrefix": "PHOTO#",
        },
      }),
    );

    const photos = (photosResult.Items ?? []) as PhotoItem[];

    const completedPhotos = photos.filter(
      (photo) => photo.status === "ANALYSIS_COMPLETE",
    );

    const failedPhotos = photos.filter(
      (photo) => photo.status === "ANALYSIS_FAILED",
    );

    const pendingPhotos = photos.filter((photo) =>
      [
        "UPLOAD_URL_CREATED",
        "UPLOADED",
        "ANALYSIS_PENDING",
        "ANALYSIS_IN_PROGRESS",
      ].includes(photo.status),
    );

    const allDetectedIssues = completedPhotos.flatMap(
      (photo) => photo.detectedIssues ?? [],
    );

    const averageConfidence =
      completedPhotos.length > 0
        ? completedPhotos.reduce(
            (sum, photo) => sum + (photo.confidence ?? 0),
            0,
          ) / completedPhotos.length
        : null;

    const report = {
      inspectionId: inspection.inspectionId,
      status: inspection.status,
      createdAt: inspection.createdAt,
      updatedAt: inspection.updatedAt,
      summary: {
        totalPhotos: photos.length,
        completedPhotos: completedPhotos.length,
        failedPhotos: failedPhotos.length,
        pendingPhotos: pendingPhotos.length,
        issuesDetected: allDetectedIssues.length,
        averageConfidence,
      },
      photos: photos
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((photo) => ({
          photoId: photo.photoId,
          s3Key: photo.s3Key,
          status: photo.status,
          createdAt: photo.createdAt,
          updatedAt: photo.updatedAt,
          analyzedAt: photo.analyzedAt ?? null,
          damageSummary: photo.damageSummary ?? null,
          detectedIssues: photo.detectedIssues ?? [],
          confidence: photo.confidence ?? null,
          failureReason: photo.failureReason ?? null,
        })),
    };

    return jsonResponse(200, report);
  } catch (error) {
    console.error("Failed to get inspection report", error);

    return jsonResponse(500, {
      message: "Internal server error",
    });
  }
};
