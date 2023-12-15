import * as cdk from "aws-cdk-lib";
import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import {
  OAuthScope,
  ResourceServerScope,
  UserPool,
} from "aws-cdk-lib/aws-cognito";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class GuruShoppingListStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
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
      cognitoDomain: { domainPrefix: "guru-shopping-list" },
    });
    // Just use localhost to copy a JWT after sign-in
    const signInUrl = cognitoDomain.signInUrl(cliClient, {
      redirectUri: "http://localhost",
    });

    const ddbTable = new Table(this, "ShoppingLists", {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "PK", type: AttributeType.STRING },
      sortKey: { name: "SK", type: AttributeType.STRING },
    });

    const httpApi = new HttpApi(this, "ShoppingLists");

    const jwtAuthorizer = new HttpJwtAuthorizer(
      "ShoppingListsAuthorizer",
      userPoolUrl,
      {
        jwtAudience: [cliClient.userPoolClientId],
      }
    );
  }
}
