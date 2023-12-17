import * as cdk from "aws-cdk-lib";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import {
  OAuthScope,
  ResourceServerScope,
  UserPool,
} from "aws-cdk-lib/aws-cognito";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import {
  NodejsFunction,
  NodejsFunctionProps,
  OutputFormat,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "path";

type GuruShoppingListStackProps = {
  environment: "staging" | "production";
} & cdk.StackProps;

export class GuruShoppingListStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GuruShoppingListStackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      signInAliases: { email: true, phone: true },
      standardAttributes: {
        givenName: { mutable: true, required: false },
        familyName: { mutable: true, required: false },
        email: { mutable: true, required: false },
        phoneNumber: { mutable: true, required: false },
      },
      signInCaseSensitive: false,
    });
    const userPoolUrl = `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`;

    const readScope = new ResourceServerScope({
      scopeName: "shopping_lists.read",
      scopeDescription: "Read shopping lists",
    });
    const writeScope = new ResourceServerScope({
      scopeName: "shopping_lists.write",
      scopeDescription: "Write shopping lists",
    });
    const deleteScope = new ResourceServerScope({
      scopeName: "shopping_lists.delete",
      scopeDescription: "Delete shopping lists",
    });

    const resourceServer = userPool.addResourceServer("ShoppingListsApi", {
      identifier: "shopping_lists_api",
      scopes: [readScope, writeScope, deleteScope],
    });

    // Access the API via curl or other CLI
    const cliClient = userPool.addClient("CliClient", {
      oAuth: {
        flows: { implicitCodeGrant: true },
        scopes: [
          OAuthScope.resourceServer(resourceServer, readScope),
          OAuthScope.resourceServer(resourceServer, writeScope),
          OAuthScope.resourceServer(resourceServer, deleteScope),
        ],
      },
    });

    const cognitoDomain = userPool.addDomain("SignInDomain", {
      cognitoDomain: {
        domainPrefix: `guru-shopping-list-${props.environment}`,
      },
    });
    // Just use localhost to copy a JWT after sign-in
    const signInUrl = cognitoDomain.signInUrl(cliClient, {
      redirectUri: "http://localhost",
    });

    const ddbTable = new Table(this, "ShoppingListsTable", {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "PK", type: AttributeType.STRING },
      sortKey: { name: "SK", type: AttributeType.STRING },
    });

    const httpApi = new HttpApi(this, "ShoppingListsApi");

    const jwtAuthorizer = new HttpJwtAuthorizer(
      "ShoppingListsAuthorizer",
      userPoolUrl,
      {
        jwtAudience: [cliClient.userPoolClientId],
      }
    );

    const sharedLambdaConfig: Partial<NodejsFunctionProps> = {
      handler: "handler",
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.TWO_WEEKS,
      tracing: Tracing.ACTIVE,
      environment: {
        TABLE_NAME: ddbTable.tableName,
        POWERTOOLS_METRICS_NAMESPACE: "ShoppingLists",
      },
      bundling: {
        sourceMap: true,
        target: "node18",
        format: OutputFormat.ESM,
        nodeModules: [
          "@aws-lambda-powertools/logger",
          "@aws-lambda-powertools/tracer",
          "@aws-lambda-powertools/metrics",
          "@middy/core",
        ],
      },
    };

    const createListHandler = new NodejsFunction(
      this,
      "CreateShoppingListsHandler",
      {
        entry: path.join(
          __dirname,
          "..",
          "functions",
          "v1",
          "create-shopping-lists",
          "index.ts"
        ),
        ...sharedLambdaConfig,
      }
    );
    createListHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["dynamodb:PutItem"],
        resources: [ddbTable.tableArn],
      })
    );
    httpApi.addRoutes({
      integration: new HttpLambdaIntegration(
        "CreateShoppingListIntegration",
        createListHandler
      ),
      path: "/v1/shopping_lists",
      methods: [HttpMethod.POST],
      authorizer: jwtAuthorizer,
    });

    const getListHandler = new NodejsFunction(this, "GetShoppingListHandler", {
      entry: path.join(
        __dirname,
        "..",
        "functions",
        "v1",
        "get-shopping-list",
        "index.ts"
      ),
      ...sharedLambdaConfig,
    });
    getListHandler.role?.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["dynamodb:GetItem"],
        resources: [ddbTable.tableArn],
      })
    );
    httpApi.addRoutes({
      integration: new HttpLambdaIntegration(
        "GetShoppingListIntegration",
        getListHandler
      ),
      path: "/v1/shopping_lists/{listName}",
      methods: [HttpMethod.GET],
      authorizer: jwtAuthorizer,
    });

    const updateListHandler = new NodejsFunction(
      this,
      "UpdateShoppingListHandler",
      {
        entry: path.join(
          __dirname,
          "..",
          "functions",
          "v1",
          "update-shopping-list",
          "index.ts"
        ),
        ...sharedLambdaConfig,
      }
    );
    updateListHandler.role?.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["dynamodb:UpdateItem"],
        resources: [ddbTable.tableArn],
      })
    );
    httpApi.addRoutes({
      integration: new HttpLambdaIntegration(
        "UpdateShoppingListIntegration",
        updateListHandler
      ),
      path: "/v1/shopping_lists/{listName}",
      methods: [HttpMethod.PUT],
      authorizer: jwtAuthorizer,
    });

    new cdk.CfnOutput(this, "UserPoolOidcConfig", {
      exportName: `${props.environment}-user-pool-oidc-config-url`,
      value: userPoolUrl + "/.well-known/openid-configuration",
    });
    new cdk.CfnOutput(this, "SignInUrl", {
      exportName: `${props.environment}-sign-in-url`,
      value: signInUrl,
    });
    new cdk.CfnOutput(this, "ApiExecuteUrl", {
      exportName: `${props.environment}-shopping-lists-api-url`,
      value: httpApi.defaultStage!.url,
    });
  }
}
