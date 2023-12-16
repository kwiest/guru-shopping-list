import { Stage, StageProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { GuruShoppingListStack } from "./guru-shopping-list-stack";

type GuruShoppingListStageProps = {
  environment: "staging" | "production";
} & StageProps;

export class GuruShoppingListStage extends Stage {
  constructor(scope: Construct, id: string, props: GuruShoppingListStageProps) {
    super(scope, id, props);

    new GuruShoppingListStack(this, "GuruShoppingListStack", props);
  }
}
