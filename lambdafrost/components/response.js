exports.httpResponse = function(statusCode, body,headers) {
    if (statusCode == null){
        statusCode = 200;
    }
    return {
        statusCode:statusCode,
        body: JSON.stringify(body),
        headers: {
            ...headers,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
          }
    }
}

exports.httpError = function (error,headers) {
    return {
        statusCode:500,
        body: JSON.stringify(error),
        headers: {
            ...headers,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
          }
    }
}