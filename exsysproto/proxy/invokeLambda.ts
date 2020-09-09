import { put as putResult } from "../dynamo/results";
import AWS = require('aws-sdk');

export const invokeLambda = async (dynClient: AWS.DynamoDB.DocumentClient, lambdaClient: AWS.Lambda, ARN: string, proxyID:string,stage: number, experimentID: string, event, strategy: string, isArtificialTraffic: boolean, saveResponseBody: boolean,active: boolean): Promise<any> => {
    const timeStamp = (new Date()).getTime();

    const startTime = process.hrtime();
    var invokeResponse: AWS.Lambda.InvocationResponse = await lambdaClient!.invoke({
        FunctionName: ARN,
        Payload: JSON.stringify(addExSysHeader(event, isArtificialTraffic))
    }).promise();
    const executionTime = process.hrtime(startTime);
    const executionTimeMs = Math.round(executionTime[0] * 1000 + executionTime[1] * 0.000001)


    var pl = JSON.parse(invokeResponse.Payload as string)
    if (!active && strategy == "base"){
        // Experiment is over and we only have base traffic. Do not write results
        return pl
    }


    var result = {}
    if (pl != undefined && pl["headers"] != undefined && pl["headers"]["X-ExSys-Result"] != undefined) {
        result = JSON.parse(pl["headers"]["X-ExSys-Result"]);
        console.log("RESULT: ",result)

        var headers = pl["headers"]
        delete headers["X-ExSys-Result"]
        pl["headers"] = headers
    }
    putResult(dynClient!, experimentID, strategy, proxyID,stage, isArtificialTraffic, timeStamp, executionTimeMs, saveResponseBody, result,
        invokeResponse.StatusCode!,pl)

    return pl
}

const addExSysHeader = (event, isArtificialTraffic: boolean): any => {
    if (event.headers == undefined) {
        event.headers = {};
    }
    event.headers["X-ExSys-Artificial-Traffic"] = isArtificialTraffic;
    return event
}
