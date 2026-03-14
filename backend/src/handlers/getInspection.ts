import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.INSPECTIONS_TABLE_NAME!;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const inspectionId = event.pathParameters?.inspectionId;

  if (!inspectionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "inspectionId required" }),
    };
  }

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `INSPECTION#${inspectionId}`,
        sk: "META",
      },
    }),
  );

  if (!result.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: "Inspection not found" }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result.Item),
  };
};
