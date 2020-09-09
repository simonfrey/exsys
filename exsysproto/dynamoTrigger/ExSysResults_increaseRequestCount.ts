import AWS = require("aws-sdk");

import { put as putcfg, get as getcfg } from "../dynamo/experiments";
import { getApiGatewayARN } from "../types/config";
import { removeProxy } from "../apiGateway/proxy";
import { increase } from "../dynamo/requestCounts";

const region = "us-east-1";

// Setup the dynamo client
AWS.config.update({
  region: region,
});
const dynClient = new AWS.DynamoDB.DocumentClient();
const apigateway: AWS.APIGateway = new AWS.APIGateway();
const lambdaClient: AWS.Lambda = new AWS.Lambda();

module.exports.handler = async function (
  output: AWS.DynamoDBStreams.GetRecordsOutput
) {
  const now = new Date().getTime();

  console.log("Count: ", output.Records?.length);

  var counts = {};

  var arrayLength = output.Records!.length;

  for (var i = 0; i < arrayLength; i++) {
    let record = output.Records![i];

    if (record.dynamodb == undefined) {
      console.log("No dynamo event. continue");
      continue;
    }
    if (record.eventName != "INSERT") {
      console.log("No INSERT event. continue");
      continue;
    }

    const strategy = record.dynamodb!.NewImage!["strategy"]["S"] as string;
    console.log("Strategy: ", strategy);
    if (strategy != "canary" && strategy != "base") {
      console.log("Neither canary nor base traffic. continue");
      continue;
    }

    const experimentID: string = record.dynamodb!.NewImage!["experimentID"][
      "S"
    ] as string;
    console.log("I ExID: ", experimentID);
    if (counts[experimentID] == undefined) {
      counts[experimentID] = 0 as Number;
    }

    counts[experimentID] = counts[experimentID] + 1;
  }

  var ps: Promise<any>[] = [];
  Object.keys(counts).forEach(function (exId: string) {
    ps.push(
      new Promise(function (resolve, reject) {
        try {
          updateExperimentStatus(dynClient, exId, now);
        } catch (err) {
          console.log("Could not updateExperimentStatus: ", err);
        }
        try {
          increase(dynClient, exId, counts[exId]).then(() => {
            resolve();
          });
        } catch (err) {
          console.log("Could not increase: ", err);
        }
      })
    );
  });

  await Promise.all(ps);
};

async function updateExperimentStatus(
  dynClient: AWS.DynamoDB.DocumentClient,
  experimentID: string,
  now: number
) {
  var cfg = await getcfg(dynClient, experimentID, true);
  if (!cfg.active) {
    console.log("Experiment '" + experimentID + "' is not active anymore");
    return;
  }

  var currentStage = cfg.stages[cfg.currentStage];

  // Check if experiment already set to started
  if (cfg.startTime == 0) {
    // Experiment just started
    cfg.startTime = now;
    cfg.active = true;
    cfg.stages[cfg.currentStage].startTime = now;
    await putcfg(dynClient, cfg);

    return;
  }

  console.log(
    "Next stage?",
    currentStage.startTime! + currentStage.time_s * 1000 < now,
    currentStage.startTime!,
    currentStage.time_s * 1000,
    now
  );

  // Check if we are still in the same stage
  if (currentStage.startTime! + currentStage.time_s * 1000 > now) {
    // Same stage, nothing to do
    console.log("Same stage");
    return;
  }

  cfg.stages[cfg.currentStage].endTime = now;

  if (cfg.currentStage + 1 >= cfg.stages.length) {
    // Stage count smaller than currentStage. Experiment is over
    console.log("Set Experiment '" + experimentID + "' to inactive");
    cfg.active = false;
    cfg.endTime = now;
  } else {
    // Transition to next stage
    cfg.currentStage++;
    console.log("Set Experiment '" + experimentID + "' to next stage");
    cfg.stages[cfg.currentStage].startTime = now;
  }
  putcfg(dynClient, cfg);

  // Check if we should remove the proxy
  if (cfg.active) {
    return;
  }

  // Remove the proxy
  console.log("Try to remove proxy");

  if (cfg.apiGateway.arns.proxy == undefined) {
    throw "Proxy ARN is undefined";
  }

  var int: AWS.APIGateway.Integration = await apigateway
    .getIntegration({
      restApiId: cfg.apiGateway.restApiId,
      httpMethod: cfg.apiGateway.endpoint.httpMethod,
      resourceId: cfg.apiGateway.endpoint.resourceId,
    })
    .promise();

  const proxyARN = getApiGatewayARN(cfg.apiGateway.arns.proxy!);
  if (int.uri != proxyARN) {
    throw `Current integration "${int.uri}" is not expected proxy ARN "${proxyARN}"`;
  }

  const newCFG = await removeProxy(apigateway, lambdaClient, cfg);
  await putcfg(dynClient, newCFG);
}
