import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

export async function getListByName({
  ddb,
  tableName,
  userId,
  listName,
}: {
  ddb: DynamoDBClient;
  tableName: string;
  userId: string;
  listName: string;
}) {
  const cmd = new GetItemCommand({
    TableName: tableName,
    Key: {
      PK: { S: userId },
      SK: { S: `LIST#${listName}` },
    },
  });

  return ddb.send(cmd);
}
