'use strict';
var auth = require('../components/auth');
var response = require('../components/response');
var Customer = require('../dynamo/CustomerSchema');
var bcrypt = require('bcrypt')

module.exports.login = async event => {
  var resHeaders = {}
  if (event.headers != undefined && event.headers["X-ExSys-Artificial-Traffic"] != undefined) {
      resHeaders["X-ExSys-Result"] = JSON.stringify(exHead.ExSysHeaders(context))
  }

  if (event.queryStringParameters == undefined || event.queryStringParameters == null || !event.queryStringParameters.email || !event.queryStringParameters.password) {
    console.log("No email and password in query defined")
    return response.httpResponse(400,resHeaders)
  }

  try {
    console.log("try to find customer")
    var userAsObject = await Customer.GetCustomerByEmail(event.queryStringParameters.email);

    if (!userAsObject) {
      console.log("Customer not found for email " + event.queryStringParameters.email);
      return response.httpResponse(401,resHeaders)

    }

    console.info("compare bcrypt passwords: ", event.queryStringParameters.password, userAsObject.password)
    var passwordsEqual = await bcrypt.compare(event.queryStringParameters.password, userAsObject.password)

    if (!passwordsEqual) {
      console.log("Wrong password");
      return response.httpResponse(401,resHeaders)

    } else {
      console.log("password correct")
      return response.httpResponse(200, {
        "firstName": userAsObject.firstName,
        "lastName": userAsObject.lastName,
        "email": userAsObject.email,
        "jsonwebtoken": Customer.SignJWT(userAsObject.id)
      },resHeaders)
    }
  } catch (err) {
    console.log("error: ", err);
    return response.httpError(err,resHeaders)
  }
};