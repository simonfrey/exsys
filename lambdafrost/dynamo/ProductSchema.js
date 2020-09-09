"use strict";
var aws = require("./util.js");
var uuid = require('uuid');

const tableName = "products";


exports.PutProduct = async function(name, category, description, image) {
    return await aws.PutItem({
        TableName: tableName,
        Item: {
            id:uuid.v1(),
            name: name,
            category: category,
            description: description,
            image: image
        }
    });
}
exports.GetSingleProduct = async function(id) {
    var res =  await aws.QueryItems({
        TableName: tableName,   
        KeyConditionExpression: "#id = :getID",
        ExpressionAttributeNames:{
            "#id": "id"
        },
        ExpressionAttributeValues: {
            ":getID": id
        }
    });
    return res.Items[0]
}

exports.GetAllProducts =async function  () {
    var res =  await aws.ScanItems({
        TableName: tableName
    });
    return res.Items;
}

exports.QueryProductsByDescription = async function (description) {
    var products = await this.GetAllProducts();
    return products.filter((v)=>{
       return v.description.includes(description)
    })
}