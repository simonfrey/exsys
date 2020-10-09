import AWS = require("aws-sdk");
import { Config, getApiGatewayARN } from "../types/config";

export const injectProxy = async function (
  apiGateway: AWS.APIGateway,
  lambdaClient: AWS.Lambda,
  cfg: Config
): Promise<Config> {
  const integrationRequest = {
    httpMethod: cfg.apiGateway.endpoint.httpMethod,
    resourceId: cfg.apiGateway.endpoint.resourceId,
    restApiId: cfg.apiGateway.restApiId,
  };

  // 1. Check API gateway
  try {
    var int: AWS.APIGateway.Integration = await apiGateway
      .getIntegration(integrationRequest)
      .promise();
  } catch (err) {
    throw "Could not find integration: " + err;
  }

  if (int.type != "AWS_PROXY") {
    throw "Wrong integration type: " + int.type + " != AWS_PROXY";
  }

  const invoURI = getApiGatewayARN(cfg.apiGateway.arns.original);
  if (int.uri == getApiGatewayARN(cfg.apiGateway.arns.proxy!)) {
    throw "Proxy is already deployed: " + cfg.apiGateway.arns.proxy;
  }

  if (int.uri != invoURI) {
    throw "Wrong integration uri: " + int.uri + " != " + invoURI;
  }
  console.log("Integration: ", int);

  // 2. CREATE ALIAS
  var aliasName = cfg.apiGateway.region + "_" + cfg.id;
  try {
    var aliasParams = {
      FunctionName: "exsys-dev-proxy",
      Name: aliasName,
    };

    try {
      // Check if alias exists
      var res = await lambdaClient.getAlias(aliasParams).promise();
    } catch (err) {
      // Create new alias
      var res = await lambdaClient
        .createAlias({ ...aliasParams, FunctionVersion: "$LATEST" })
        .promise();
    }
    console.log(res);
    var aliasARN = res.AliasArn;
  } catch (err) {
    throw "Could not create alias : " + err;
  }

  // 3. Allow api gateway to invoke the alias
  try {
    const acc = await apiGateway.getAccount({}).promise();
    const arnArr = acc.cloudwatchRoleArn?.split(":");
    const accountID = arnArr![4];
    const resource = await apiGateway
      .getResource({
        restApiId: cfg.apiGateway.restApiId,
        resourceId: cfg.apiGateway.endpoint.resourceId,
      })
      .promise();

    // "arn:aws:execute-api:region:account-id:api-id/stage/METHOD_HTTP_VERB/Resource-path"
    const pSArn =
      "arn:aws:execute-api:" +
      cfg.apiGateway.region +
      ":" +
      accountID +
      ":" +
      cfg.apiGateway.restApiId +
      "/*/" +
      cfg.apiGateway.endpoint.httpMethod +
      resource.path;
    console.log("SOURCE ARN: ", pSArn);

    var pemRes = await lambdaClient
      .addPermission({
        Action: "lambda:InvokeFunction",
        FunctionName: "exsys-dev-proxy:" + aliasName,
        Principal: "apigateway.amazonaws.com",
        SourceArn: pSArn,
        StatementId: "exSysExperiment_" + cfg.id,
      })
      .promise();
    console.log("PemRes: ", pemRes);
  } catch (err) {
    throw "Could not add permission: " + err;
  }

  // Update uri for integration request
  try {
    await apiGateway
      .updateIntegration({
        ...integrationRequest,
        patchOperations: [
          {
            op: "replace",
            path: "/uri",
            value: getApiGatewayARN(aliasARN!),
          },
        ],
      })
      .promise();
  } catch (err) {
    throw "Could not update integration request : " + err;
  }

  // Deploy stage
  try {
    await apiGateway
      .createDeployment({
        restApiId: cfg.apiGateway.restApiId,
        description: "DEPLOY ExSysExperiment " + cfg.id,
        stageName: cfg.apiGateway.stage,
      })
      .promise();
  } catch (err) {
    throw "Could not deploy stage '" + cfg.apiGateway.stage + "': " + err;
  }

  // Add proxy arn to config
  cfg.apiGateway.arns.proxy = aliasARN;
  return cfg;
};

export const removeProxy = async function (
  apiGateway: AWS.APIGateway,
  lambdaClient: AWS.Lambda,
  cfg: Config
) {
  const integrationRequest = {
    httpMethod: cfg.apiGateway.endpoint.httpMethod,
    resourceId: cfg.apiGateway.endpoint.resourceId,
    restApiId: cfg.apiGateway.restApiId,
  };

  // 1. Check API gateway
  try {
    var int: AWS.APIGateway.Integration = await apiGateway
      .getIntegration(integrationRequest)
      .promise();
  } catch (err) {
    throw "Could not find integration: " + err;
  }

  if (int.type != "AWS_PROXY") {
    throw "Wrong integration type: " + int.type + " != AWS_PROXY";
  }

  const proxyURI = getApiGatewayARN(cfg.apiGateway.arns.proxy!);

  if (int.uri != proxyURI) {
    throw "Wrong proxy uri: " + int.uri + " != " + proxyURI;
  }
  console.log("Integration: ", int);

  // 2. Update uri for integration request
  try {
    await apiGateway
      .updateIntegration({
        ...integrationRequest,
        patchOperations: [
          {
            op: "replace",
            path: "/uri",
            value: getApiGatewayARN(cfg.apiGateway.arns.original),
          },
        ],
      })
      .promise();
  } catch (err) {
    throw "Could not update integration request : " + err;
  }

  // 3. Deploy stage
  try {
    await apiGateway
      .createDeployment({
        restApiId: cfg.apiGateway.restApiId,
        description: "REMOVE ExSysExperiment " + cfg.id,
        stageName: cfg.apiGateway.stage,
      })
      .promise();
  } catch (err) {
    throw "Could not deploy stage '" + cfg.apiGateway.stage + "': " + err;
  }

  // 3. Delete ALIAS
  try {
    var aliasParams = {
      FunctionName: "exsys-dev-proxy",
      Name: cfg.apiGateway.region + "_" + cfg.id,
    };

    var res = await lambdaClient.deleteAlias(aliasParams).promise();

    console.log(res);
  } catch (err) {
    throw "Could not delete alias : " + err;
  }

  // Remove proxy arn from config
  cfg.apiGateway.arns.proxy = undefined;
  return cfg;
};
