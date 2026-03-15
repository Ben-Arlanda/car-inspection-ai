import { SQSEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { updateInspectionStatus } from "../lib/updateInspectionStatus";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.INSPECTIONS_TABLE_NAME!;

export const handler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body);
    const inspectionId = body.inspectionId;
    const photoId = body.photoId;

    const pk = `INSPECTION#${inspectionId}`;
    const sk = `PHOTO#${photoId}`;

    try {
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

      const inProgressAt = new Date().toISOString();

      await dynamo.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { pk, sk },
          UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":status": "ANALYSIS_IN_PROGRESS",
            ":updatedAt": inProgressAt,
          },
        }),
      );

      // Simulated AI result
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

      await updateInspectionStatus({
        dynamo,
        tableName,
        inspectionId,
      });

      console.log("Photo analysis completed", {
        inspectionId,
        photoId,
      });
    } catch (error) {
      console.error("Photo analysis failed", {
        inspectionId,
        photoId,
        error,
      });

      throw error;
    }
  }
};
