'use strict';

var seed = require('../dynamo/Seed');
var response = require('../components/response');

module.exports.index = async event => {
  var resHeaders = {}
  if (event.headers != undefined && event.headers["X-ExSys-Artificial-Traffic"] != undefined) {
      resHeaders["X-ExSys-Result"] = JSON.stringify(exHead.ExSysHeaders(context))
  }

  try {

    await seed.SeedCustomers()
    console.info("Done seeding customers")

    await seed.SeedProducts()
    console.info("Done seeding products");

    return response.httpResponse(200,resHeaders)

  } catch (err) {
    console.log(err);
    return response.httpError(err,resHeaders)

  }

};