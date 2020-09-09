import AWS = require("aws-sdk");
import crypto = require("crypto")

import { get as getExperimentConfig } from "../dynamo/experiments";
import { invokeLambda } from "./invokeLambda";
import { getAliasCfg } from "./aliasConfig";

var region: string = "";
var lambdaClient: AWS.Lambda | undefined = undefined;
var dynClient: AWS.DynamoDB.DocumentClient | undefined = undefined;

const vm_id = crypto.randomBytes(16).toString("base64");

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

  const cfg = await getExperimentConfig(
    dynClient!,
    aliasCFG.experimentID,
    true
  );
  const stage = cfg!.stages[cfg.currentStage];

  const isActive = cfg.active && cfg.startTime != 0;

  if (isActive && (stage.shadow != undefined || stage.canary != undefined)) {
    console.log("Shadow or Canary traffic configured");


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
          stage.shadow!.totalRequestsPerSecond != undefined &&
          stage.shadow!.totalRequestsPerSecond > 0
        ) {
          // Shadow traffic with multiplier
          console.log(
            "Stage has shadow traffic goal: ",
            stage.shadow!.totalRequestsPerSecond
          );

          // Calculate multiplier
          if (cfg.reqCount == undefined || cfg.reqCount < 1) {
            throw "reqCount is smaller than one";
          }

          const secondsDone = (now - cfg.startTime) / 1000;
          const reqsPerSecond = cfg.reqCount / secondsDone;

          multiplier =
            Math.round(stage.shadow!.totalRequestsPerSecond / reqsPerSecond) -
            1;

          console.log(
            "Shadow multiplier",
            multiplier,
            "reqCount",
            cfg.reqCount,
            "secondsDone",
            secondsDone,
            "reqsPerSecond",
            reqsPerSecond
          );

          if (multiplier > stage.shadow!.totalRequestsPerSecond) {
            console.log("Multiplier too big. Set to total request count");
            multiplier = stage.shadow!.totalRequestsPerSecond;
          }
          if (reqsPerSecond >  stage.shadow!.totalRequestsPerSecond){
            multiplier = 0;
          }
        }

        // Invoke shadow functions
        for (var i = 0; i < multiplier-1; i++) {
          console.log("Invoke shadow " + i);
          invokeLambda(
            dynClient!,
            lambdaClient!,
            cfg.apiGateway.arns.experiment,
            vm_id,
            cfg.currentStage,
            cfg.id,
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

    // Canary traffic
    if (stage.canary != undefined) {
      const p = Math.random() * 100;

      console.log("Canary %: ", p, "<", stage.canary!.percent);
      if (p < stage.canary!.percent) {
        // Invoke canary function and return it's result
        console.log("Invoke canary");
        return await invokeLambda(
          dynClient!,
          lambdaClient!,
          cfg.apiGateway.arns.experiment,
          vm_id,
          cfg.currentStage,
          cfg.id,
          event,
          "canary",
          false,
          stage.saveResponseBody,
          true
        );
      }
    }
  }
  console.log("Invoke base");
  // Run original function and return result
  return await invokeLambda(
    dynClient!,
    lambdaClient!,
    cfg.apiGateway.arns.original,
    vm_id,
    cfg.currentStage,
    cfg.id,
    event,
    "base",
    false,
    stage.saveResponseBody,
    cfg.active
  );
};
