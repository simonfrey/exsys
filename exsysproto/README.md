# Experiment System (ExSys)

This directory contains the experiment system (ExSys) that injects a proxy function into an exsting api gateway. This proxy collects information about the executed functions and enables percent based and shadow traffic strategies.


## Deploy

### Setup Serverless.com

For deployment the [serverless.com](https://serverless.com/) framework was chosen. Please follow the [get started guide](https://serverless.com/framework/docs/getting-started/) to setup the serverless framework on your machine. The following instructions assume that serverless is installed and the `serverless` (or short `sls`) command works in your terminal.

### Install dependencies

This project is build with [yarn](https://yarnpkg.com/) for installing the dependencies of the project install yarn as described in the [yarn getting started](https://yarnpkg.com/getting-started/install) and run `yarn`.

### Deploy Bifr into your AWS 

To deploy Bifr into your AWS simply execute `sls deploy` within the top level of this directory.

## DynamoDB table structure

After deploying ExSys you find three new DynamoDB tables in your [AWS DynamoDB console](https://console.aws.amazon.com/dynamodb/home?region=us-east-1): 
- ExSysConfig: Containing the config for your experiments
- ExSysReqCount: Is a counter for already processed requests. It aggregates the requests logged in `ExSysResults`. 1:1 relationship to experiment in `ExSysConfig`
- ExSysResults: Target for the ExSys Proxy to write the results of the lambda functions for the experiments

## Run experiment

In order to run an experiment you must create a new experiment config entry in the `ExSysConfig` DynamoDB. If it is a valid config the systems starts your configured experiment in the moment you save the config. A config has the following JSON structure:

```JSON
{
  "active": true,
  "apiGateway": {
    "arns": {
      "experiment": "[ARN of the experiment lambda function]",
      "original": "[ARN of the original deployed function]",
    },
    "endpoint": {
      "httpMethod": "[GET/POST/PUT/DELETE]",
      "resourceId": "[ID of the resource where the experiment should be injected]"
    },
    "region": "us-east-1",
    "restApiId": "[ID of your rest API to run the experiment on]",
    "stage": "[STAGE in the API to deploy the experiment to]"
  },
  "id": "myExperiment",
  "stages": []
}
```

A stage of the experiment is described with the following structure: 
```JSON
{
    "requestCount": 5,
    "canary": {
        "Percent": 0
    },
    "shadow": {
        "Multiplier": 2,
        "Percent": 0.3
    }
}
```

`requestCount` is the number of request for which this stage should be active. 
Both canary and shadow traffic can be configured in the same stage. Only one of them is required for the stage to be valid. Both traffic forms are routed to the experiment lambda function configured in `apiGateway>arns>experiment`.