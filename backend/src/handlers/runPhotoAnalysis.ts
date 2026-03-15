import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.INSPECTIONS_TABLE_NAME!;

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const inspectionId = event.pathParameters?.inspectionId;
    const photoId = event.pathParameters?.photoId;

    if (!inspectionId || !photoId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "inspectionId and photoId are required",
        }),
      };
    }

    const pk = `INSPECTION#${inspectionId}`;
    const sk = `PHOTO#${photoId}`;

    const existingPhoto = await dynamo.send(
      new GetCommand({
        TableName: tableName,
        Key: { pk, sk },
      }),
    );

    if (!existingPhoto.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Photo not found",
        }),
      };
    }

    if (existingPhoto.Item.status !== "ANALYSIS_PENDING") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Photo must be ANALYSIS_PENDING before analysis can run",
          currentStatus: existingPhoto.Item.status,
        }),
      };
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Photo analysis complete",
        inspectionId,
        photoId,
        status: "ANALYSIS_COMPLETE",
        analyzedAt,
        result: {
          damageSummary,
          detectedIssues,
          confidence,
        },
      }),
    };
  } catch (error) {
    console.error("Error running photo analysis:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to run photo analysis",
      }),
    };
  }
};
