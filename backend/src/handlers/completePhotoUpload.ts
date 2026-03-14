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

    const updatedAt = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk, sk },
        UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "UPLOADED",
          ":updatedAt": updatedAt,
        },
      }),
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Photo marked as uploaded",
        inspectionId,
        photoId,
        status: "UPLOADED",
        updatedAt,
      }),
    };
  } catch (error) {
    console.error("Error completing photo upload:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to complete photo upload",
      }),
    };
  }
};
