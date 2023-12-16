import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { cleanListName } from "./clean-list-name";

export async function insertList({
  ddb,
  tableName,
  userId,
  listName,
  createdAt,
}: {
  ddb: DynamoDBClient;
  tableName: string;

  // User ID: UUID
  userId: string;

  // Unique Shopping List name
  listName: string;

  // Date when this list was created
  createdAt: Date;
}) {
  const cleanedName = cleanListName(listName);

  const cmd = new PutItemCommand({
    TableName: tableName,
    Item: {
      PK: { S: userId },
      SK: { S: `LIST#${cleanedName}` },
      user_id: { S: userId },
      list_name: { S: listName },
      type: { S: "shopping_list" },
      created_at: { N: createdAt.getTime().toString() },
    },
    ConditionExpression: "attribute_not_exists(SK)",
  });

  await ddb.send(cmd);
}