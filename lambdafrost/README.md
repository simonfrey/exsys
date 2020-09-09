# 01_Bifrost_Serverless_Test_Application (Bifr)

This directory contains the case study application taken from the Bifrost (BfCSA)  paper appendix. It is adapted to fit into the aws lambda infrastructure. 
The changes and reasons behind them are discussed within the thesis. The overal reason was to change the Micro-Service architekture of the BfCSA to a architekture fitting into the serverless paradigme. As storage layer Bifr uses AWS DynamoDB instead of the MongoDB used in BfCSA as DynamoDB can be considered as standard within the AWS landscape.


## Deploy

### Setup Serverless.com

For deployment the [serverless.com](https://serverless.com/) framework was chosen. Please follow the [get started guide](https://serverless.com/framework/docs/getting-started/) to setup the serverless framework on your machine. The following instructions assume that serverless is installed and the `serverless` (or short `sls`) command works in your terminal.

### Install dependencies

This project is build with [yarn](https://yarnpkg.com/) for installing the dependencies of the project install yarn as described in the [yarn getting started](https://yarnpkg.com/getting-started/install) and run `yarn`.

### Deploy Bifr into your AWS 

To deploy Bifr into your AWS simply execute `sls deploy` within the top level of this directory.

After the deployment succeeded the serverless CLI displays the endpoints you can use for accessing Bifr. 

## Seeding

For initialy seeding the database with values just send a GET request to the `/seed` endpoint.

## Testing

The code in this repository is standard Node.js as of why every single file can be run in the terminal with `node [filename]`. If you want you can run the api offline with `serverless offline`