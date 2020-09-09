'use strict';
var auth = require('../components/auth');
var Product = require('../dynamo/ProductSchema');
var Transaction = require('../dynamo/TransactionSchema');
var response = require('../components/response');
var exHead = require('../components/exSysHeader');

module.exports.index = async (event, context) => {
    var resHeaders = {}
    if (event.headers != undefined && event.headers["X-ExSys-Artificial-Traffic"] != undefined) {
        resHeaders["X-ExSys-Result"] = JSON.stringify(exHead.ExSysHeaders(context))
    }



    try {
        // Check if user is logged in 
        var customer = await auth.isAuthenticated(event)
        if (customer == null) {
            return response.httpResponse(401)
        }
        var products = await Product.GetAllProducts();
        return response.httpResponse(200, products, resHeaders)
    } catch (err) {
        console.log("error: ", err);
        return response.httpError(err, resHeaders)
    }
};
const getProduct = async function (id) {
    var product = await Product.GetSingleProduct(id);

    var count = await (await Transaction.GetTransactionsByProductID(id)).length;
    if (!product) {
        return null
    }
    product.buyers = count;
    return product;
}

module.exports.getProduct = async event => {
    var resHeaders = {}
    if (event.headers != undefined && event.headers["X-ExSys-Artificial-Traffic"] != undefined) {
        resHeaders["X-ExSys-Result"] = JSON.stringify(exHead.ExSysHeaders(context))
    }

    // Check if user is logged in 
    var customer = await auth.isAuthenticated(event)
    if (customer == null) {
        return response.httpResponse(401, resHeaders)

    }

    try {
        var product = await getProduct(event.pathParameters.id);
        if (product == null) {
            return response.httpResponse(404, resHeaders)

        }

        return response.httpResponse(200, product, resHeaders)
    } catch (err) {
        console.log("error: ", err);
        return response.httpError(err, resHeaders);
    }
};
module.exports.buyProduct = async event => {
    var resHeaders = {}
    var isArtificial = false;
    if (event.headers != undefined && event.headers["X-ExSys-Artificial-Traffic"] != undefined) {
        isArtificial = event.headers["X-ExSys-Artificial-Traffic"] == true;
        resHeaders["X-ExSys-Result"] = JSON.stringify(exHead.ExSysHeaders(context))
    }

    // Check if user is logged in 
    var customer = await auth.isAuthenticated(event)
    if (customer == null) {
        return response.httpResponse(401, resHeaders)
    }

    try {
        if (!isArtificial) {
            await Transaction.PutTransaction(customer._id, event.pathParameters.id);
        }

        var product = await getProduct(event.pathParameters.id);
        if (product == null) {
            return response.httpResponse(404, resHeaders)
        }

        if (isArtificial) {
            product.buyers++
        }

        return response.httpResponse(200, product, resHeaders)

    } catch (err) {
        console.log("error: ", err);
        return response.httpError(err, resHeaders);
    }
};
module.exports.buyersProduct = async event => {
    var resHeaders = {}
    if (event.headers != undefined && event.headers["X-ExSys-Artificial-Traffic"] != undefined) {
        resHeaders["X-ExSys-Result"] = JSON.stringify(exHead.ExSysHeaders(context))
    }

    // Check if user is logged in 
    var customer = await auth.isAuthenticated(event)
    if (customer == null) {
        return response.httpResponse(401, resHeaders)
    }

    try {
        var transactions = await Transaction.GetTransactionsByProductID(event.pathParameters.id);
        return response.httpResponse(200, transactions, resHeaders);
    } catch (err) {
        console.log("error: ", err);
        return response.httpError(err, resHeaders)
    }
};
