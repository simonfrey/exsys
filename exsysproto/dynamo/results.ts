import uuid = require('uuid');
import { Result } from "../types/experiment"

const tableName = "ExSysResults";

export async function put(
    dynClient: AWS.DynamoDB.DocumentClient,
    experimentID: string,
    strategy: string,
    proxyID: string,
    stage: number,
    isArtificialTraffic: boolean,
    startTime: number,
    executionTime: number,
    saveResponseBody: boolean,
    result: any,
    statusCode:number,
    invokePayload: { header: any, body: any, statusCode: number }) {

    var res: Result = {
        id: uuid.v1(),
        proxyID:proxyID,
        experimentID: experimentID,
        stage: stage,

        strategy: strategy,
        trafficArtificial: isArtificialTraffic,

        startTime: startTime,
        executionTime: executionTime,
        statusCode:statusCode,

        res: result,
    }

    if (saveResponseBody) {
        res.responseBody = invokePayload
    }

    return await dynClient.put({
        TableName: tableName,
        Item: res
    }).promise()
};


export async function get(
    dynClient: AWS.DynamoDB.DocumentClient,
    experimentID: string,
    withBody: boolean): Promise<Result[]> {
    var results: Result[] = []
    var lasEvalKey: AWS.DynamoDB.DocumentClient.Key | undefined = undefined;

    var projectionExpr: string = ""
    if (!withBody) {
        projectionExpr = "stage,proxyID,res,strategy,trafficArtificial,startTime,executionTime,statusCode"
    }

    do {
        const res = await dynClient.query({
            TableName: tableName,
            IndexName: 'experimentID_index',
            KeyConditionExpression: '#experimentID = :experimentID',
            ExpressionAttributeNames: {
                "#experimentID": "experimentID"
            },
            ExpressionAttributeValues: {
                ":experimentID": experimentID
            },
            ExclusiveStartKey: lasEvalKey,
            ProjectionExpression: projectionExpr,
        }).promise()
        results = results.concat(res.Items as Result[])
        lasEvalKey = res.LastEvaluatedKey
    } while (lasEvalKey != undefined);


    return results
};

