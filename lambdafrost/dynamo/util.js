var AWS = require("aws-sdk");


AWS.config.update({
    region: "us-east-1"
});

const client = new AWS.DynamoDB.DocumentClient();

exports.PutItem = async function (params) {
    return await client.put(params).promise();
}

exports.QueryItems = async function (params) {
    return await client.query(params).promise();
}
exports.ScanItems = async function (params) {
    return await client.scan(params).promise();
}
exports.BatchWrite = async function (params) {
    return await client.batchWrite(params).promise();
}

exports.ClearTable = async function (tableName) {
    var allItems = await this.ScanItems({
        TableName: tableName
    })


    var ps = [];


    var i = 0
    const l = allItems.Items.length
    do {
        const delItems = allItems.Items.slice(i * 25, ++i * 25)
        const batchDel = delItems.map((item) => {
            return {
                DeleteRequest: {
                    Key: {
                        id:  item.id
                    }
                }
            }
        })

        if (batchDel.length <= 0){
            break
        }

        that = this;
        ps.push(new Promise(async function (resolve, reject) {
            try {
                var params = { 
                    RequestItems : {
                        
                    }
                }
                params.RequestItems[tableName] = batchDel

                await that.BatchWrite(params)
                resolve();
            } catch (err) {
                console.log(err)
                reject()
            }
        }));

    } while (i * 25 < l)
    return await Promise.all(ps)
}

