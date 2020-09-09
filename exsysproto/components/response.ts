import zlib = require('zlib');

export async function httpResponse(statusCode?:number, body?:any,headers?:any) {
  if (statusCode == null){
    statusCode = 200;
  }
  
  return {
    statusCode:statusCode,
    body:JSON.stringify(body),
    headers: {
      ...headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    }
  }
}

export async function gzipedHttpResponse(statusCode?:number, body?:any,headers?:any) {
  if (statusCode == null){
    statusCode = 200;
  }
  
  
  const input = JSON.stringify(body);
  var buff;

  await new Promise( (resolutionFunc,rejectionFunc) => {
    zlib.gzip(input, (err, buffer) => { 
      if (err) { 
        rejectionFunc(err) 
        return;
      }
      
      buff = buffer.toString('base64');
      resolutionFunc();
    }); 
  });
    
  return {
    statusCode:statusCode,
    body:buff,
    "isBase64Encoded": true,
    headers: {
      ...headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      "Content-Encoding": "gzip"
    }
  }
}

export function httpError(error:any,headers?:any,statusCode:number=500) {
  return {
    statusCode:statusCode,
    body: JSON.stringify({error: error}),
    headers: {
      ...headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    }
  }
}