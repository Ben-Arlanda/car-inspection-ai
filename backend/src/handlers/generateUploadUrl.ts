import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const s3 = new S3Client({});

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const BUCKET_NAME = process.env.INSPECTIONS_BUCKET_NAME!;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const inspectionId = event.pathParameters?.inspectionId;

  if (!inspectionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "inspectionId required" }),
    };
  }

  const photoId = randomUUID();
  const key = `inspections/${inspectionId}/${photoId}.jpg`;

  await ddb.send(
    new PutCommand({
      TableName: process.env.INSPECTIONS_TABLE_NAME!,
      Item: {
        pk: `INSPECTION#${inspectionId}`,
        sk: `PHOTO#${photoId}`,
        photoId,
        s3Key: key,
        status: "UPLOAD_URL_CREATED",
        createdAt: new Date().toISOString(),
      },
    }),
  );

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: "image/jpeg",
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: 300,
    unhoistableHeaders: new Set(["x-amz-checksum-crc32"]),
    unsignableHeaders: new Set([
      "x-amz-checksum-crc32",
      "x-amz-sdk-checksum-algorithm",
    ]),
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      photoId,
      key,
      uploadUrl,
      expiresIn: 300,
    }),
  };
};
