import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqs = new SQSClient({});

const tableName = process.env.INSPECTIONS_TABLE_NAME!;
const analysisQueueUrl = process.env.ANALYSIS_QUEUE_URL!;

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

    if (existingPhoto.Item.status !== "ANALYSIS_FAILED") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Only failed photos can be retried",
          currentStatus: existingPhoto.Item.status,
        }),
      };
    }

    const updatedAt = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk, sk },
        UpdateExpression: `
          SET #status = :status,
              updatedAt = :updatedAt
          REMOVE failureReason
        `,
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "ANALYSIS_PENDING",
          ":updatedAt": updatedAt,
        },
      }),
    );

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
          ":status": "ANALYZING",
          ":updatedAt": updatedAt,
        },
      }),
    );

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: analysisQueueUrl,
        MessageBody: JSON.stringify({
          inspectionId,
          photoId,
        }),
      }),
    );

    return {
      statusCode: 202,
      body: JSON.stringify({
        message: "Photo re-queued for analysis",
        inspectionId,
        photoId,
        photoStatus: "ANALYSIS_PENDING",
        inspectionStatus: "ANALYZING",
        updatedAt,
      }),
    };
  } catch (error) {
    console.error("Error retrying photo analysis:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to retry photo analysis",
      }),
    };
  }
};
