import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { calculateInspectionStatus, PhotoStatus } from "./inspectionStatus";

type DynamoLike = {
  send: (command: unknown) => Promise<any>;
};

type PhotoItem = {
  status: PhotoStatus;
};

export const updateInspectionStatus = async ({
  dynamo,
  tableName,
  inspectionId,
}: {
  dynamo: DynamoLike;
  tableName: string;
  inspectionId: string;
}): Promise<void> => {
  const pk = `INSPECTION#${inspectionId}`;

  const photosResult = await dynamo.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :photoPrefix)",
      ExpressionAttributeValues: {
        ":pk": pk,
        ":photoPrefix": "PHOTO#",
      },
    }),
  );

  const photos = (photosResult.Items ?? []) as PhotoItem[];

  const nextStatus = calculateInspectionStatus(photos);

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
        ":status": nextStatus,
        ":updatedAt": new Date().toISOString(),
      },
    }),
  );
};
