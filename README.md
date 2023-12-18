# Serverless Guru code challenge implementation

> Build a Serverless Framework REST API with AWS API Gateway which supports CRUD functionality (Create, Read, Update, Delete) \*don't use service proxy integration directly to DynamoDB from API Gateway
>
> Please use GitHub Actions CI/CD pipeline, AWS CodePipeline, or Serverless Pro CI/CD to handle deployments.
>
> You can take screenshots of the CI/CD setup and include them in the README.

I created a personal shopping list API for this challenge. The end-result uses
CodePipeline for CI/CD deploying staging and production stages to the same AWS
account. Each stage is deployed to a single region (us-east-1) but can be
modified to target separate regions.\*

Normally, I would deploy each stage to a dedicated AWS account, but used a
single "Shared Services" account where I normally maintain CI/CD pipelines.

The working pipeline is included in the video.

\*_Some work would need to be done to set DynamoDB global tables for replication
and to use a single region's user pool as the definitive source since Cognito
does not have native replication._

I made some choices on the API implemtation to keep things simple that would
not be the best UX in a production environment. Typically, I prefer to define
the API via OpenAPI specs _first_, gather feedback, make mocks etc.

## Requirements

### All application code must be written in NodeJS, Typescript acceptable as well

All infrastructure and business logic is written in Typescript, compiled via esbuild.

### All AWS Infrastructure needs to be automated with IAC using Serverless Framework

The infrastructure is defined via the AWS CDK. I have not used the Serverless
Framework in some time but use CDK and Cloudformation daily. I'm familiar and
productive in more declarative definitions, but wanted to complete the project
with tooling I'm more intimately familiar with.

### The API Gateway REST API should store data in DynamoDB

✅ The API does read/write/delete from a DynamoDB table via lambda functions.

### There should be 4-5 lambdas that include the following CRUD functionality (Create, Read, Update, Delete) \*don't use service proxy integration directly to DynamoDB from API Gateway

✅ There are for lambda functions:

1. Create shopping lists
2. Get shopping list
3. Update shopping list
4. Delete shopping list

### Build the CI/CD pipeline to support multi-stage deployments e.g. dev, prod

✅ AWS CodePipeline deploys to staging and production on commit to `main`.

### The template should be fully working and documented

✅ See `lib` directory for infrastructure.

### A public GitHub repository must be shared with frequent commits

✅ You are here!

### A video should be recorded (www.loom.com) of you talking over the application code, IAC, and any additional areas you want to highlight in your solution to demonstrate additional skills#

✅ Video link: [https://share.zight.com/p9uBgpOX](https://share.zight.com/p9uBgpOX)
