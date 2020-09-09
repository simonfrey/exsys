'use strict';

var Product = require('../dynamo/ProductSchema');
var response = require('../components/response');

module.exports.index = async event => {
  var resHeaders = {}
  if (event.headers != undefined && event.headers["X-ExSys-Artificial-Traffic"] != undefined) {
      resHeaders["X-ExSys-Result"] = JSON.stringify(exHead.ExSysHeaders(context))
  }

    if (event.queryStringParameters == undefined || event.queryStringParameters == null) {
       
      return response.httpResponse(400,resHeaders)
    }

    try {
        var products = await Product.QueryProductsByDescription(event.queryStringParameters.query);

        return response.httpResponse(200,products,resHeaders)
    } catch (err) {
            console.log(err);
          
         return response.httpError(err,resHeaders)
    }
};