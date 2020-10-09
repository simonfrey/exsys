
import AWS = require('aws-sdk');
import { Result, Experiment } from "../types/experiment"
import { Config,getApiGatewayARN,apiGatewayDecoder,stagesDecoder,apiGateway,Stage } from "../types/config"
import { httpResponse,httpError } from "../components/response"
import { put as putExperimentConfig } from "../dynamo/experiments"
import uuid = require('uuid');
import { injectProxy } from "../apiGateway/proxy"


const region = "us-east-1";

// Setup the dynamo client
AWS.config.update({
    region: region
});
const dynClient = new AWS.DynamoDB.DocumentClient();
const apigateway: AWS.APIGateway = new AWS.APIGateway();
const lambdaClient: AWS.Lambda = new AWS.Lambda();

module.exports.handler = async event => {
    try {
        const body: Config = JSON.parse(event.body);

        apiGatewayDecoder.runWithException(body.apiGateway)
        stagesDecoder.runWithException(body.stages)


        // Decode experiment config
        const cfg: Config = {
            id: uuid.v1(),
            startTime: 0,
            endTime: 0,
            active: false,
            reqCount:0,
            apiGateway: body.apiGateway,
            stages: body.stages,
        }
    

        // Check for current integration
        var int: AWS.APIGateway.Integration = await apigateway.getIntegration({
            restApiId: cfg.apiGateway.restApiId,
            httpMethod: cfg.apiGateway.endpoint.httpMethod,
            resourceId: cfg.apiGateway.endpoint.resourceId
        }).promise()

        // Check if current integration has the expected ARN
        const origARN = getApiGatewayARN(cfg.apiGateway.arns.original);
        if (int.uri != origARN){
           throw `Integration uri "${int.uri}" is not expected original "${origARN}". Maybe another experiment is already running on this function?`
        }

        // Apparently ARN is fine. So deploy the proxy
        const newCFG:Config = await injectProxy(apigateway, lambdaClient, cfg)
        console.log("PROXY DEPLOYED")
        
        // Save the config into the db
        const res = await putExperimentConfig(dynClient, newCFG)
        console.log("Experiment config put.")

        return await httpResponse(200, res)
    } catch (err) {
        console.error("Error: ", err)
        return httpError(err)
    }
}

module.exports.getExampleConfig = async event => {
    const res:{
        apiGateway:apiGateway;
        stages:Stage[];
        cacheCount: number;
    } = {
        apiGateway:{
            arns:{
                experiment:"",
                original:""
            },
            endpoint:{
                httpMethod:"",
                resourceId:""
            },
            region:"",
            restApiId:"",
            stage:""
        },
        stages:[
            {
                time_s:600,
                canary:{
                    percent:23
                },
                shadow:{
                    totalRequestsPerSecond:200
                },
                saveResponseBody:false,
            },
            {
                time_s:600,
                shadow:{
                    multiplier:2
                },
                saveResponseBody:true,
            }
        ],
        cacheCount:10
    }
    return await httpResponse(200,res)
}
