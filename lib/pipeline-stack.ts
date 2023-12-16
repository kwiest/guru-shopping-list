import { Stack, StackProps } from "aws-cdk-lib";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
} from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { GuruShoppingListStage } from "./guru-shopping-list-stage";

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const connectionArn = StringParameter.fromStringParameterName(
      this,
      "GithubConnectionArn",
      "/Connections/GitHub/Arn"
    ).stringValue;

    const pipeline = new CodePipeline(this, "GuruShoppingListCiPipeline", {
      synth: new ShellStep("Synth", {
        input: CodePipelineSource.connection(
          "kwiest/guru-shopping-list",
          "main",
          { connectionArn }
        ),
        commands: ["npm ci", "npm run test", "npx cdk synth"],
      }),
    });

    const staging = new GuruShoppingListStage(this, "Staging", {
      environment: "staging",
    });
    pipeline.addStage(staging);

    const production = new GuruShoppingListStage(this, "Production", {
      environment: "production",
    });
    pipeline.addStage(production);
  }
}
