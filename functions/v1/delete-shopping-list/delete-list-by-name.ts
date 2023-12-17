import { DeleteItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";

export async function deleteListByName({
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
  const cmd = new DeleteItemCommand({
    TableName: tableName,
    Key: {
      PK: { S: userId },
      SK: { S: `LIST#${listName}` },
    },
  });

  return ddb.send(cmd);
}
