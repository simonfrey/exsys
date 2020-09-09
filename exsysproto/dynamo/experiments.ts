import { Config } from "../types/config"

const tableName = "ExSysConfig"
const cacheTimeS =1;

var cfgCache: {
    [id: string]: {
        cfg: Config,
        lastUpdate: Date,
    }
} = {};

var experimentStartCache: {
    [id: string]: number
} = {};
export async function put(
    dynClient: AWS.DynamoDB.DocumentClient,
    newConfig: Config): Promise<any> {

    var res = await dynClient.put({
        TableName: tableName,
        Item: newConfig
    }).promise();

  cfgCache[newConfig.id] = {cfg:newConfig as Config,lastUpdate:new Date()}
    return  newConfig
}

export async function get(
    dynClient: AWS.DynamoDB.DocumentClient,
    experimentID: string,
    noCache: boolean = false): Promise<Config> {
    if (noCache || cfgCache[experimentID] == undefined || (new Date().getTime())- cfgCache[experimentID]!.lastUpdate.getTime() > cacheTimeS * 1000) {
        // Load config from DB
        var res = await dynClient.query({
            TableName: tableName,
            KeyConditionExpression: "#id = :getID",
            ExpressionAttributeNames: {
                "#id": "id"
            },
            ExpressionAttributeValues: {
                ":getID": experimentID
            }
        }).promise();
        cfgCache[experimentID] = {cfg:res.Items![0] as Config,lastUpdate:new Date()};
    }
    
    return cfgCache[experimentID].cfg
}



export async function getExperimentStart(
    dynClient: AWS.DynamoDB.DocumentClient,
    experimentID: string): Promise<number> {
    if (experimentStartCache[experimentID] == undefined) {
        // Load config from DB
        var res = await dynClient.query({
            TableName: tableName,
            KeyConditionExpression: "#id = :getID",
            ExpressionAttributeNames: {
                "#id": "id"
            },
            ExpressionAttributeValues: {
                ":getID": experimentID
            }
        }).promise();
        var cfg = res.Items![0] as Config
        experimentStartCache[experimentID] = cfg.startTime;
    }
    
    return experimentStartCache[experimentID]
}



export async function setActive(
    dynClient: AWS.DynamoDB.DocumentClient,
    experimentID: string,
    active: boolean): Promise<Config> {
        var updateExpr =  "SET #a = :act"
        var updateAttrs:any = {
            '#a': 'active'
        }
        var res = await dynClient.update( {
            TableName: tableName,
            Key: {
                id: experimentID
            },
            UpdateExpression:updateExpr,
            ExpressionAttributeNames : updateAttrs,
            ExpressionAttributeValues: {
                ":act":  active,
            },
            ReturnValues: "ALL_NEW"
        }).promise();

        return res.$response.data as Config;
}
