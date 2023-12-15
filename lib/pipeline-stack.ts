import { Stack, StackProps, Stage, StageProps } from "aws-cdk-lib";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
} from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { GuruShoppingListStack } from "./guru-shopping-list-stack";

class GuruShoppingListStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    new GuruShoppingListStack(this, "GuruShoppingListStack", props);
  }
}

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

    const staging = new GuruShoppingListStage(this, "Staging");
    pipeline.addStage(staging);

    const production = new GuruShoppingListStage(this, "Production");
    pipeline.addStage(production);
  }
}
