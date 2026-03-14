import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const s3 = new S3Client({});

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

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: "image/jpeg",
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: 300,
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
