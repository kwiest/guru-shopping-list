import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { cleanListName } from "../util/clean-list-name";

export async function updateListItems({
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

  const cmd = new UpdateItemCommand({
    TableName: tableName,
    Key: {
      PK: { S: userId },
      SK: { S: `LIST#${cleanedName}` },
      items: { SS: items },
    },
    UpdateExpression: "SET #its = :itms",
    ExpressionAttributeNames: {
      "#its": "items",
    },
    ExpressionAttributeValues: {
      ":": { SS: items },
    },
    ConditionExpression: "attribute_exists(SK)",
  });

  return ddb.send(cmd);
}
