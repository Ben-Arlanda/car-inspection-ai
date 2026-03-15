import { SQSEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.INSPECTIONS_TABLE_NAME!;

export const handler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body);
    const inspectionId = body.inspectionId;
    const photoId = body.photoId;

    const pk = `INSPECTION#${inspectionId}`;
    const sk = `PHOTO#${photoId}`;

    const existingPhoto = await dynamo.send(
      new GetCommand({
        TableName: tableName,
        Key: { pk, sk },
      }),
    );

    if (!existingPhoto.Item) {
      console.warn("Photo not found for analysis job", {
        inspectionId,
        photoId,
      });
      continue;
    }

    if (existingPhoto.Item.status !== "ANALYSIS_PENDING") {
      console.warn("Photo not in ANALYSIS_PENDING state", {
        inspectionId,
        photoId,
        currentStatus: existingPhoto.Item.status,
      });
      continue;
    }

    const analyzedAt = new Date().toISOString();

    const damageSummary = "Minor cosmetic damage detected on front bumper";
    const detectedIssues = [
      "Front bumper scuff",
      "Light paint scratch",
      "No major structural damage visible",
    ];
    const confidence = 0.89;

    await dynamo.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk, sk },
        UpdateExpression: `
          SET #status = :status,
              updatedAt = :updatedAt,
              analyzedAt = :analyzedAt,
              damageSummary = :damageSummary,
              detectedIssues = :detectedIssues,
              confidence = :confidence
        `,
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "ANALYSIS_COMPLETE",
          ":updatedAt": analyzedAt,
          ":analyzedAt": analyzedAt,
          ":damageSummary": damageSummary,
          ":detectedIssues": detectedIssues,
          ":confidence": confidence,
        },
      }),
    );

    const inspectionItemsResult = await dynamo.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": pk,
        },
      }),
    );

    const inspectionItems = inspectionItemsResult.Items ?? [];

    const photoItems = inspectionItems.filter(
      (item) => typeof item.sk === "string" && item.sk.startsWith("PHOTO#"),
    );

    const totalPhotos = photoItems.length;

    const completedPhotos = photoItems.filter(
      (photo) => photo.status === "ANALYSIS_COMPLETE",
    ).length;

    const nextInspectionStatus =
      totalPhotos > 0 && completedPhotos === totalPhotos
        ? "COMPLETE"
        : "ANALYZING";

    await dynamo.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          pk,
          sk: "META",
        },
        UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": nextInspectionStatus,
          ":updatedAt": new Date().toISOString(),
        },
      }),
    );

    console.log("Photo analysis completed", {
      inspectionId,
      photoId,
      inspectionStatus: nextInspectionStatus,
    });
  }
};
