"use strict";

var aws = require("./util.js");
var uuid = require('uuid');

const tableName = "transactions";


exports.ClearTransactions = async function () {
    var allItems = await aws.ScanItems({
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
                        id:  item.id,
                        product:item.product
                    }
                }
            }
        })

        if (batchDel.length <= 0){
            break
        }

        ps.push(new Promise(async function (resolve, reject) {
            try {
                var params = { 
                    RequestItems : {
                        
                    }
                }
                params.RequestItems[tableName] = batchDel

                await aws.BatchWrite(params)
                resolve();
            } catch (err) {
                console.log(err)
                reject()
            }
        }));

    } while (i * 25 < l)
    return await Promise.all(ps)
}
exports.PutTransaction = async function (buyer,product) {
    return await aws.PutItem({
        TableName: tableName,
        Item: {
            id: uuid.v1(),
            buyer: buyer,
            product: product
        }
    });
}

exports.GetTransactionsByProductID = async function (productID) {
    var res = await aws.QueryItems({
        TableName: tableName,
        KeyConditionExpression: "#product = :getID",
        ExpressionAttributeNames: {
            "#product": "product"
        },
        ExpressionAttributeValues: {
            ":getID": productID
        }
    });
    return res.Items
}

this.PutTransaction("da","do")