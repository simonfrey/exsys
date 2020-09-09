"use strict";
var aws = require("./util.js");
var uuid = require('uuid');

var jwt = require('jsonwebtoken');

const tableName = "customers";


exports.PutCustomer = async function (email, password, firstName, lastName, ) {
    return await aws.PutItem({
        TableName: tableName,
        Item: {
            id: uuid.v1(),
            email: email,
            firstName: firstName,
            lastName: lastName,
            password: password
        }
    });
}



exports.GetCustomerByID = async function (id) {
    var res = await aws.QueryItems({
        TableName: tableName,
        KeyConditionExpression: "#id = :getID",
        ExpressionAttributeNames: {
            "#id": "id"
        },
        ExpressionAttributeValues: {
            ":getID": id
        }
    });
    return res.Items[0]
}


exports.GetCustomerByEmail = async function (email) {
    var res = await aws.QueryItems({
        TableName: tableName,
    
        IndexName: 'email_index',
        KeyConditionExpression: '#email = :email',
        ExpressionAttributeNames: {
            "#email": "email"
        },
        ExpressionAttributeValues: {
            ":email": email
        }
    });
    return res.Items[0]
}


exports.SignJWT = function(id){
    return jwt.sign({id: id}, process.env.JSONWEBTOKEN);
}