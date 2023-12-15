import { Stage, StageProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { GuruShoppingListStack } from "./guru-shopping-list-stack";

export class GuruShoppingListStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    new GuruShoppingListStack(this, "GuruShoppingListStack", props);
  }
}
