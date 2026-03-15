import { SQSEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.INSPECTIONS_TABLE_NAME!;

export const handler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body);
    const inspectionId = body.inspectionId;
    const photoId = body.photoId;

    if (!inspectionId || !photoId) {
      console.warn("Invalid DLQ message body", { body });
      continue;
    }

    const pk = `INSPECTION#${inspectionId}`;
    const sk = `PHOTO#${photoId}`;
    const failedAt = new Date().toISOString();

    await dynamo.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk, sk },
        UpdateExpression: `
          SET #status = :status,
              updatedAt = :updatedAt,
              analyzedAt = :analyzedAt,
              failureReason = :failureReason
        `,
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "ANALYSIS_FAILED",
          ":updatedAt": failedAt,
          ":analyzedAt": failedAt,
          ":failureReason": "Analysis message moved to DLQ after max retries",
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
          ":status": "FAILED",
          ":updatedAt": failedAt,
        },
      }),
    );

    console.log("Marked photo and inspection as failed from DLQ", {
      inspectionId,
      photoId,
    });
  }
};
