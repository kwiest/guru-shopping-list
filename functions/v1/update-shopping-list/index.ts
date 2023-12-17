import { Logger, injectLambdaContext } from "@aws-lambda-powertools/logger";
import {
  MetricUnits,
  Metrics,
  logMetrics,
} from "@aws-lambda-powertools/metrics";
import { Tracer, captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import middy from "@middy/core";
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { updateListItems } from "./update-list-items";

const serviceName = "UpdateShoppingList";
const logger = new Logger({ serviceName });
const tracer = new Tracer({ serviceName });
const metrics = new Metrics({ serviceName });

const ddb = tracer.captureAWSv3Client(new DynamoDBClient());
const tableName = process.env.TABLE_NAME as string;

async function lambdaHandler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = event.requestContext.authorizer.jwt.claims.sub as string;
  logger.appendKeys({ userId });
  tracer.putAnnotation("userId", userId);

  const { listName } = event.pathParameters as { listName: string };
  logger.appendKeys({ listName });
  tracer.putAnnotation("listName", listName);

  const { items } = JSON.parse(event.body!);
  if (!items || !items.length) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Invalid request: You must update shopping list items.",
      }),
    };
  }

  try {
    await updateListItems({ ddb, tableName, userId, listName, items });

    metrics.addMetric("shoppingListUpdated", MetricUnits.Count, 1);

    return {
      statusCode: 200,
    };
  } catch (e) {
    if ((e as Error).name === "ConditionalCheckFailedException") {
      logger.error(
        "Error deleting shopping list that cannot be found",
        e as Error
      );
      return { statusCode: 404 };
    }

    logger.error("Error updating shopping list", e as Error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: (e as Error).message,
      }),
    };
  }
}

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics, { captureColdStartMetric: true }));
