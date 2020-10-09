import AWS = require("aws-sdk");
import crypto = require("crypto");

import { Config, Stage,getCurrentStage } from "../types/config";
import { get as getExperimentConfig } from "../dynamo/experiments";
import { get as getRequestCount } from "../dynamo/requestCounts";
import { invokeLambda } from "./invokeLambda";
import { getAliasCfg } from "./aliasConfig";

var region: string = "";
var lambdaClient: AWS.Lambda | undefined = undefined;
var dynClient: AWS.DynamoDB.DocumentClient | undefined = undefined;

const vm_id = crypto.randomBytes(16).toString("base64");
var config: Config | undefined = undefined;

module.exports.handler = async (event, context) => {
  // Load config
  const aliasCFG = getAliasCfg(context.invokedFunctionArn);

  const now = new Date().getTime();

  if (region != aliasCFG.region) {
    region = aliasCFG.region;
    // Setup clients with new region
    lambdaClient = new AWS.Lambda({
      region: region,
    });
    AWS.config.update({
      region: region,
    });
    dynClient = new AWS.DynamoDB.DocumentClient();
  }

  if (config == undefined || !config!.active || config!.startTime == 0) {
    // First run or not yet started load config
    const cfg = await getExperimentConfig(
      dynClient!,
      aliasCFG.experimentID,
      true
    );
    config = cfg;
  }

  const r = Math.random() * 100;
  const stageRes = getCurrentStage(config, now);
  const stage = stageRes.stage;
  const stageNumber = stageRes.stageNumber;


  console.log("STAGENUM: ",stageNumber)

  var clientResult: any = null;

  if (
    stage == undefined || // Experiment is not yet started or over
    stage!.canary == undefined || // only original traffic is configured
    stage!.canary!.percent > r // Canary traffic is not invoked as of random
  ) {
    // Run original function and return result
    console.log("Invoke base");
    var saveResponseBody = false;
    if (stage != undefined){
      saveResponseBody = stage!.saveResponseBody == true
    }
    clientResult = await invokeLambda(
      dynClient!,
      lambdaClient!,
      config.apiGateway.arns.original,
      vm_id,
      stageNumber,
      config.id,
      event,
      "base",
      false,
      saveResponseBody,
      config.active
    );

    if (stage == undefined) {
      // Reset config to force a reload on next run
      config = undefined;

      // No additional traffic will be invoked. Return now
      return clientResult;
    }
  } else {
    // Invoke canary function and return it's result
    console.log("Invoke canary");
    clientResult = await invokeLambda(
      dynClient!,
      lambdaClient!,
      config.apiGateway.arns.experiment,
      vm_id,
      stageNumber,
      config.id,
      event,
      "canary",
      false,
      stage.saveResponseBody,
      true
    );
  }

  // Shadow traffic
  if (
    stage.shadow != undefined &&
    (stage.shadow!.multiplier != undefined ||
      stage.shadow!.totalRequestsPerSecond != undefined)
  ) {
    try {
      var multiplier = 0;
      if (
        stage.shadow!.multiplier != undefined &&
        stage.shadow!.multiplier > 0
      ) {
        multiplier = stage.shadow!.multiplier;
      } else if (
        config.startTime > 0 &&
        stage.shadow!.totalRequestsPerSecond != undefined &&
        stage.shadow!.totalRequestsPerSecond > 0
      ) {
        // Load current requestCount
        const reqCount = await getRequestCount(dynClient!, config!.id);

        // Shadow traffic with multiplier
        console.log(
          "Stage has shadow traffic goal: ",
          stage.shadow!.totalRequestsPerSecond,
          "and go reqCount from db:",
          reqCount
        );

        // Calculate multiplier
        if (reqCount == undefined || reqCount < 1) {
          throw "reqCount is smaller than one";
        }

        const secondsDone = (now - config.startTime) / 1000;
        const reqsPerSecond = reqCount / secondsDone;

        multiplier =
          Math.round(stage.shadow!.totalRequestsPerSecond / reqsPerSecond) - 1;

        console.log(
          "Shadow multiplier",
          multiplier,
          "reqCount",
          reqCount,
          "secondsDone",
          secondsDone,
          "reqsPerSecond",
          reqsPerSecond
        );

        if (multiplier > stage.shadow!.totalRequestsPerSecond) {
          console.log("Multiplier too big. Set to total request count");
          multiplier = stage.shadow!.totalRequestsPerSecond;
        }
        if (reqsPerSecond > stage.shadow!.totalRequestsPerSecond) {
          multiplier = 0;
        }
      }

      // Invoke shadow functions
      for (var i = 0; i < multiplier - 1; i++) {
        console.log("Invoke shadow " + i);
        invokeLambda(
          dynClient!,
          lambdaClient!,
          config!.apiGateway.arns.experiment,
          vm_id,
          stageNumber,
          config!.id,
          event,
          "shadow",
          true,
          stage.saveResponseBody,
          true
        );
      }
    } catch (err) {
      console.error("Could not execute shadow functions: ", err);
    }
  }

  return clientResult;
};
