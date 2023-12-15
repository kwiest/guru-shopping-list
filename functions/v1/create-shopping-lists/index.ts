import { Logger, injectLambdaContext } from "@aws-lambda-powertools/logger";
import { Metrics, logMetrics } from "@aws-lambda-powertools/metrics";
import { Tracer, captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import middy from "@middy/core";
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";

const serviceName = "CreateShoppingList";
const logger = new Logger({ serviceName });
const tracer = new Tracer({ serviceName });
const metrics = new Metrics({ serviceName });

const ddb = tracer.captureAWSv3Client(new DynamoDBClient());
const TableName = process.env.TABLE_NAME as string;

async function lambdaHandler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = event.requestContext.authorizer.jwt.claims.sub as string;
  logger.appendKeys({ userId });
  tracer.putAnnotation("userId", userId);

  return { statusCode: 201 };
}

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics, { captureColdStartMetric: true }));
