import { randomUUID } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async () => {
  const inspectionId = randomUUID();
  const now = new Date().toISOString();

  const item = {
    pk: `INSPECTION#${inspectionId}`,
    sk: "META",
    inspectionId,
    status: "CREATED",
    createdAt: now,
    updatedAt: now,
  };

  const tableName = process.env.INSPECTIONS_TABLE_NAME;

  if (!tableName) {
    throw new Error("INSPECTIONS_TABLE_NAME is not defined");
  }

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    }),
  );

  return {
    statusCode: 201,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message: "Inspection created",
      inspection: item,
    }),
  };
};
