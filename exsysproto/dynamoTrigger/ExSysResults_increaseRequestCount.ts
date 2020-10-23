import AWS = require("aws-sdk");

import { put as putcfg, get as getcfg } from "../dynamo/experiments";
import { getApiGatewayARN, getCurrentStage, Config } from "../types/config";
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
      new Promise(async function (resolve, reject) {
        try {
          const cfg = await getcfg(dynClient, exId, true);
          var currSec = parseInt(((now-cfg.startTime) / 1000).toFixed());
          if (cfg.startTime == 0){
            currSec = 1;
          }

          await updateExperimentStatus(dynClient, now, cfg);
          await increase(dynClient, exId, counts[exId] * currSec);
                    
          resolve();
        } catch (err) {
          reject(err);
        }
      })
    );
  });

  await Promise.all(ps);
};

async function updateExperimentStatus(
  dynClient: AWS.DynamoDB.DocumentClient,
  now: number,
  cfg: Config
) {
  if (!cfg.active) {
    console.log("Experiment '" + cfg.id + "' is not active anymore");
    return;
  }

  // Check if experiment already set to started
  if (cfg.startTime == 0) {
    // Experiment just started
    cfg.startTime = now;
    cfg.active = true;
    cfg.stages[0].startTime = now;
    await putcfg(dynClient, cfg);
    return;
  }

  const csn = getCurrentStage(cfg, now).stageNumber;
  if (csn == -1) {
    // Experiment is over

    // check if already removed
    if (!cfg.active && cfg.endTime != undefined && cfg.endTime > 0) {
      return;
    }

    cfg.active = false;
    cfg.endTime = now;
    cfg.stages[cfg.stages.length - 1].endTime = now;
    await putcfg(dynClient, cfg);

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
    return;
  }

  if (cfg.stages[csn].startTime != undefined) {
    // we are in the same stage
    return;
  }

  // We are in a new stage
  // set end of last stage
  if (cfg.stages[csn - 1].endTime == undefined) {
    cfg.stages[csn - 1].endTime = now;
  }
  // Set start time of current stage
  cfg.stages[csn].startTime = now;
  await putcfg(dynClient, cfg);
  return;
}
