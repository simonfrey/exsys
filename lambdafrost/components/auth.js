var jwt = require('jsonwebtoken');
var Customer = require('../dynamo/CustomerSchema');

async function isAuthenticated(event) {
    var jsonwebtoken;

    if (!event.headers.Authorization || event.headers.Authorization.split(' ')[0] !== 'Bearer') {
        console.log("No token received");
        return null
    }

    try {
        jsonwebtoken = jwt.verify(event.headers.Authorization.split(' ')[1], process.env.JSONWEBTOKEN)
    } catch (err) {
        throw ('jwt verification failed: ', err);
    }

    if (!jsonwebtoken.id) {
        console.log('no id set');
        return null
    }
    console.log("TOKENID: ", jsonwebtoken.id)

    try {
        var customer = await Customer.GetCustomerByID(jsonwebtoken.id);

        if (!customer) {
            return null
        }
        console.log("Found customer from jwt: ", customer)

        return customer
    } catch (err) {
        throw ('monggose error: ', err);
    }
}

exports.isAuthenticated = isAuthenticated;