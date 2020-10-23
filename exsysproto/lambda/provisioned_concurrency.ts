import AWS = require("aws-sdk");

export const setProvisionedConcurrency = async function (
  lambdaClient: AWS.Lambda,
  functionName: string,
  aliasName: string,
  count: number
) {
  var res = await lambdaClient
    .putProvisionedConcurrencyConfig({
      FunctionName: functionName,
      ProvisionedConcurrentExecutions: count,
      Qualifier: aliasName,
    })
    .promise();
};

export const deleteProvisionedConcurrency = async function (
  lambdaClient: AWS.Lambda,
  functionName: string,
  aliasName: string
) {
  var res = await lambdaClient
    .deleteProvisionedConcurrencyConfig({
      FunctionName: functionName,
      Qualifier: aliasName,
    })
    .promise();
};

export const isProvisionedConcurrencyReady = async function (
  lambdaClient: AWS.Lambda,
  functionName: string,
  aliasName: string
): Promise<boolean> {
  var res = await lambdaClient
    .getProvisionedConcurrencyConfig({
      FunctionName: functionName,
      Qualifier: aliasName,
    })
    .promise();

  return res.Status == "READY";
};

// (async () => {
//   const region = "us-east-1";
//   // Setup the dynamo client
//   AWS.config.update({
//     region: region,
//   });
//   const lambdaClient: AWS.Lambda = new AWS.Lambda();
//   const fName = "bifr-dev-p_index";
//   const alias = "provTest110";
//   const count = 2;

//   try {
//     var aliasParams = {
//       FunctionName: "bifr-dev-p_index",
// //      Qualifier: "120"
// //      Name: "aliasName",
//     };

//     var res = await lambdaClient.listVersionsByFunction(aliasParams).promise()

//     console.log(res)
//     console.log(    res.Versions![res.Versions!.length-1].Version
//       )

//     // await setProvisonedConcurrency(lambdaClient, fName, alias, count);
//     // console.log("SET");

//     // while (!(await isProvisonedConcurrencyReady(lambdaClient, fName, alias))) {
//     //   console.log("NOT READY");
//     // }
//     // console.log("READY");

//     // await deleteProvisonedConcurrency(lambdaClient, fName, alias);
//     // console.log("DELETED");
//   } catch (err) {
//     console.log(err);
//   }
// })();
