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
import { getListByName } from "./get-list-by-name";

const serviceName = "GetShoppingList";
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

  try {
    const res = await getListByName({ ddb, tableName, userId, listName });
    const list = res.Item;

    if (!list) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: `List ${listName} not found for this user.`,
        }),
      };
    }

    metrics.addMetric("shoppingListLoaded", MetricUnits.Count, 1);

    return {
      statusCode: 200,
      body: JSON.stringify({
        list_name: list.list_name.S,
        items: list.items.SS,
      }),
    };
  } catch (e) {
    logger.error("Error getting shopping list", e as Error);

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
