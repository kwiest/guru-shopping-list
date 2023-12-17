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
    },
    UpdateExpression: "SET #its = :itms",
    ExpressionAttributeNames: {
      "#its": "items",
    },
    ExpressionAttributeValues: {
      ":itms": { SS: items },
    },
    ReturnValues: "ALL_NEW",
    ConditionExpression: "attribute_exists(SK)",
  });

  return ddb.send(cmd);
}
