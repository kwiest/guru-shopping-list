import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { cleanListName } from "../util/clean-list-name";

export async function putListItems({
  ddb,
  tableName,
  userId,
  listName,
  items,
}: {
  ddb: DynamoDBClient;
  tableName: string;
  userId: string;
  listName: string;
  items: string[];
}) {
  const cleanedName = cleanListName(listName);

  const cmd = new PutItemCommand({
    TableName: tableName,
    Item: {
      PK: { S: userId },
      SK: { S: `LIST#${cleanedName}` },
      items: { SS: items },
    },
    ConditionExpression: "attribute_exists(SK)",
  });

  return ddb.send(cmd);
}
