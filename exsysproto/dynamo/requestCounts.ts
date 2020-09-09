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