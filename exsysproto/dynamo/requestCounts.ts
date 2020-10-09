const tableName = "ExSysConfig";

export async function increase(
    dynClient: AWS.DynamoDB.DocumentClient,
    experimentID: string,
    increaseBy: number) {
    return dynClient.update( {
        TableName: tableName,
        Key: {
            id: experimentID
        },
        UpdateExpression: "ADD #c :inc",
        ExpressionAttributeNames : {
            '#c': 'reqCount'
        },
        ExpressionAttributeValues: {
            ":inc":  increaseBy
        },
        ReturnValues: "UPDATED_NEW"
    }).promise();
}



export async function get(
    dynClient: AWS.DynamoDB.DocumentClient,
    experimentID: string): Promise<number> {
        var res = await dynClient.query({
            TableName: tableName,
            KeyConditionExpression: "#id = :getID",
            ExpressionAttributeNames: {
                "#id": "id"
            },
            ExpressionAttributeValues: {
                ":getID": experimentID
            },
            ProjectionExpression: "reqCount",
        }).promise();

    return res.Items![0].reqCount as number
}
