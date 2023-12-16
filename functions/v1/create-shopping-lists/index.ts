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
import { insertList } from "./insert-list";

const serviceName = "CreateShoppingList";
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

  const { list_name: listName, items } = JSON.parse(event.body!);
  if (!listName) {
    logger.error("Client error: missing list name");
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Invalid request: Missing required 'list_name'.",
      }),
    };
  }

  try {
    await insertList({
      ddb,
      tableName,
      userId,
      listName,
      items,
      createdAt: new Date(event.requestContext.timeEpoch),
    });
    metrics.addMetric("shoppingListCreated", MetricUnits.Count, 1);

    return { statusCode: 201 };
  } catch (e) {
    logger.error("Error saving shopping list", e as Error);

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
