import AWS = require("aws-sdk");
import { getApiGatewayARN, Config } from "../types/config";
import { httpResponse, httpError } from "../components/response";
import { setActive, get as getExperimentConfig } from "../dynamo/experiments";
import { removeProxy } from "../apiGateway/proxy";
import { put as putcfg } from "../dynamo/experiments";

const region = "us-east-1";

// Setup the dynamo client
AWS.config.update({
  region: region,
});
const dynClient = new AWS.DynamoDB.DocumentClient();
const lambdaClient: AWS.Lambda = new AWS.Lambda();
const apigateway: AWS.APIGateway = new AWS.APIGateway();

module.exports.stopHandler = async (event) => {
  return startStopHandler(event, false);
};
module.exports.startHandler = async (event) => {
  return startStopHandler(event, true);
};

const startStopHandler = async (event, active) => {
  try {
    const experimentID: string = event.pathParameters.id;
    if (experimentID == "") {
      return httpError("Experiment ID can not be empty", undefined, 404);
    }

    // Check if config exists
    var cfg = await getExperimentConfig(dynClient, experimentID, true);
    if (cfg == undefined || cfg.id == "") {
      return httpError(
        "Experiment could not be found. Is the ID correct?",
        undefined,
        404
      );
    }

    if (active) {
      cfg = await activateExperiment(cfg);
    } else {
      cfg = await deactivateExperiment(cfg);
    }


    return await httpResponse(200, cfg);
  } catch (err) {
    console.error("Error: ", err);
    return httpError(err);
  }
};

async function activateExperiment(cfg: Config): Promise<Config> {
  if (cfg.apiGateway.arns.proxy == undefined) {
    if (cfg.endTime != 0) {
      throw `The experiment did already run and can not be reactivated. Please put a new experiment.`;
    }

    throw `Proxy ARN is undefined"${getApiGatewayARN(
      cfg.apiGateway.arns.proxy!
    )}". Maybe this experiment is not yet put?`;
  }

  // Check if their is no other experiment running at that moment
  var int: AWS.APIGateway.Integration = await apigateway
    .getIntegration({
      restApiId: cfg.apiGateway.restApiId,
      httpMethod: cfg.apiGateway.endpoint.httpMethod,
      resourceId: cfg.apiGateway.endpoint.resourceId,
    })
    .promise();

  if (int.uri != getApiGatewayARN(cfg.apiGateway.arns.proxy!)) {
    throw `Integration uri "${
      int.uri
    }" is not expected proxy "${getApiGatewayARN(
      cfg.apiGateway.arns.proxy!
    )}". Maybe this experiment is not yet put?`;
  }

  if (cfg.active) {
    // Experiment is already activated
    return cfg;
  }

  await setActive(dynClient, cfg.id, true);

  cfg.active = true;

  return cfg;
}

async function deactivateExperiment(cfg: Config) {
  if (cfg.apiGateway.arns.proxy == undefined) {
    throw `Proxy ARN is undefined. Maybe this experiment is not yet put?`;
  }

  // Check if their is no other experiment running at that moment
  var int: AWS.APIGateway.Integration = await apigateway
    .getIntegration({
      restApiId: cfg.apiGateway.restApiId,
      httpMethod: cfg.apiGateway.endpoint.httpMethod,
      resourceId: cfg.apiGateway.endpoint.resourceId,
    })
    .promise();

  const proxyARN = getApiGatewayARN(cfg.apiGateway.arns.proxy!);
  if (int.uri != proxyARN) {
    if (int.uri == getApiGatewayARN(cfg.apiGateway.arns.original)) {
      if (cfg.startTime == 0) {
        throw `Integration uri "${int.uri}" is original ARN. It seems the experiment was never started.`;
      }
      throw `Integration uri "${int.uri}" is original ARN. It seems the experiment is already deactivated.`;
    }
    throw `Current integration "${int.uri}" is not expected proxy ARN "${proxyARN}"`;
  }

  cfg.active = false;
  const newCFG = await removeProxy(apigateway, lambdaClient, cfg);

  await putcfg(dynClient, newCFG);
  return newCFG;
}
