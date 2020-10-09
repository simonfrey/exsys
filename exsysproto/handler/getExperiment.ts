import AWS = require("aws-sdk");
import { Result, Experiment } from "../types/experiment";
import { httpResponse,gzipedHttpResponse, httpError } from "../components/response";
import { get as getExperimentConfig } from "../dynamo/experiments";
import { get as getExperimentResults } from "../dynamo/results";
import { getCurrentStage } from "../types/config";

const region = "us-east-1";

// Setup the dynamo client
AWS.config.update({
  region: region,
});
const dynClient = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  try {
    const experimentID: string = event.pathParameters.id;
    if (experimentID == "") {
      return await httpResponse(404);
    }

    const now = new Date().getTime();
    var withBody = false;
    if (
      event.queryStringParameters != undefined &&
      event.queryStringParameters.withBody != undefined
    ) {
      withBody = true;
    }

    const cfg = await getExperimentConfig(dynClient, experimentID, true);
    if (cfg == undefined || cfg.id == "") {
      return await httpResponse(404);
    }

    // const reqCount = await getExperimentReqCount(dynClient, experimentID)
    var results = await getExperimentResults(dynClient, experimentID, withBody);

    if (withBody) {
      results.forEach((res) => {
        delete res.responseBody;
      });
    }

    var resultsByStages: {
      stage: number;
      res: Result[];
    }[] = [];

    results.forEach((res) => {
      if (res.startTime < cfg.startTime) {
        // Remove request that are executed before experiment started
        return;
      }

      if (resultsByStages[res.stage] == undefined) {
        resultsByStages[res.stage] = { stage: res.stage, res: [] as Result[] };
      }
      resultsByStages[res.stage].res.push(res);
    });


      // Check if experiment is already over
      const currStageNumber =  getCurrentStage(cfg,now).stageNumber

    resultsByStages.forEach((res) => {
      res.res.sort(function (a: Result, b: Result) {
        return a.startTime - b.startTime;
      });

      cfg.stages[res.stage].startTime = res.res[0].startTime;

      if (
        cfg.startTime != 0 && currStageNumber  ==-1
      ) {
        cfg.stages[res.stage].endTime =
          res.res[res.res.length - 1].startTime +
          res.res[res.res.length - 1].executionTime;
      }
    });

    cfg.startTime = cfg.stages[0].startTime!;

    // Check if experiment is already over
    if (!cfg.active) {
      var last = currStageNumber;
      if (last ==-1 || last >= cfg.stages.length){
        last = cfg.stages.length -1;
      }
      cfg.endTime = cfg.stages[last].endTime!;
    }




    return await gzipedHttpResponse(200, {
      config: cfg,
      results: resultsByStages,
    });
  } catch (err) {
    console.error("Error: ", err);
    return httpError(err);
  }
};
