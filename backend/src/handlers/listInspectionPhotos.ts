import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.INSPECTIONS_TABLE_NAME!;

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const inspectionId = event.pathParameters?.inspectionId;

    if (!inspectionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "inspectionId is required",
        }),
      };
    }

    const pk = `INSPECTION#${inspectionId}`;

    const result = await dynamo.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": pk,
          ":skPrefix": "PHOTO#",
        },
      }),
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        inspectionId,
        count: result.Items?.length ?? 0,
        photos: result.Items ?? [],
      }),
    };
  } catch (error) {
    console.error("Error listing inspection photos:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to list inspection photos",
      }),
    };
  }
};
