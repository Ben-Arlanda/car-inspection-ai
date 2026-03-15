import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
import {
  HttpApi,
  CorsHttpMethod,
  HttpMethod,
} from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const inspectionsBucket = new s3.Bucket(this, "InspectionsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const inspectionsTable = new dynamodb.Table(this, "InspectionsTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const createInspectionFn = new NodejsFunction(this, "CreateInspectionFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(
        __dirname,
        "../../backend/src/handlers/createInspection.ts",
      ),
      handler: "handler",
      environment: {
        INSPECTIONS_TABLE_NAME: inspectionsTable.tableName,
        INSPECTIONS_BUCKET_NAME: inspectionsBucket.bucketName,
      },
    });

    const getInspectionFn = new NodejsFunction(this, "GetInspectionFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(
        __dirname,
        "../../backend/src/handlers/getInspection.ts",
      ),
      handler: "handler",
      environment: {
        INSPECTIONS_TABLE_NAME: inspectionsTable.tableName,
      },
    });

    const generateUploadUrlFn = new NodejsFunction(
      this,
      "GenerateUploadUrlFn",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(
          __dirname,
          "../../backend/src/handlers/generateUploadUrl.ts",
        ),
        handler: "handler",
        environment: {
          INSPECTIONS_BUCKET_NAME: inspectionsBucket.bucketName,
          INSPECTIONS_TABLE_NAME: inspectionsTable.tableName,
        },
      },
    );

    const completePhotoUploadFn = new NodejsFunction(
      this,
      "CompletePhotoUploadFn",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(
          __dirname,
          "../../backend/src/handlers/completePhotoUpload.ts",
        ),
        handler: "handler",
        environment: {
          INSPECTIONS_TABLE_NAME: inspectionsTable.tableName,
        },
      },
    );

    const listInspectionPhotosFn = new NodejsFunction(
      this,
      "ListInspectionPhotosFn",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(
          __dirname,
          "../../backend/src/handlers/listInspectionPhotos.ts",
        ),
        handler: "handler",
        environment: {
          INSPECTIONS_TABLE_NAME: inspectionsTable.tableName,
        },
      },
    );

    const requestPhotoAnalysisFn = new NodejsFunction(
      this,
      "RequestPhotoAnalysisFn",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(
          __dirname,
          "../../backend/src/handlers/requestPhotoAnalysis.ts",
        ),
        handler: "handler",
        environment: {
          INSPECTIONS_TABLE_NAME: inspectionsTable.tableName,
        },
      },
    );

    inspectionsTable.grantReadWriteData(requestPhotoAnalysisFn);
    inspectionsTable.grantReadData(listInspectionPhotosFn);
    inspectionsBucket.grantPut(generateUploadUrlFn);
    inspectionsTable.grantReadWriteData(completePhotoUploadFn);
    inspectionsTable.grantReadData(getInspectionFn);
    inspectionsTable.grantReadWriteData(generateUploadUrlFn);
    inspectionsTable.grantReadWriteData(createInspectionFn);
    inspectionsBucket.grantReadWrite(createInspectionFn);

    const api = new HttpApi(this, "CarInspectionApi", {
      corsPreflight: {
        allowHeaders: ["content-type"],
        allowMethods: [CorsHttpMethod.ANY],
        allowOrigins: ["*"],
      },
    });

    api.addRoutes({
      path: "/inspections",
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        "CreateInspectionIntegration",
        createInspectionFn,
      ),
    });

    api.addRoutes({
      path: "/inspections/{inspectionId}",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "GetInspectionIntegration",
        getInspectionFn,
      ),
    });

    api.addRoutes({
      path: "/inspections/{inspectionId}/photos",
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        "GenerateUploadUrlIntegration",
        generateUploadUrlFn,
      ),
    });

    api.addRoutes({
      path: "/inspections/{inspectionId}/photos/{photoId}/complete",
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        "CompletePhotoUploadIntegration",
        completePhotoUploadFn,
      ),
    });

    api.addRoutes({
      path: "/inspections/{inspectionId}/photos",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "ListInspectionPhotosIntegration",
        listInspectionPhotosFn,
      ),
    });

    api.addRoutes({
      path: "/inspections/{inspectionId}/photos/{photoId}/analyze",
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        "RequestPhotoAnalysisIntegration",
        requestPhotoAnalysisFn,
      ),
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.apiEndpoint,
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: inspectionsBucket.bucketName,
    });

    new cdk.CfnOutput(this, "TableName", {
      value: inspectionsTable.tableName,
    });
  }
}
