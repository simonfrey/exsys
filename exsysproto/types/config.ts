import {Decoder, object, string, optional, number,array, boolean} from '@mojotech/json-type-validation'


export interface Config {
    readonly id: string;

    readonly apiGateway: apiGateway;

    stages: Stage[];

    startTime: number;
    endTime: number;
    active: boolean;
    currentStage: number;
    reqCount: number;
}


export const apiGatewayDecoder: Decoder<apiGateway> = object({
    region: string(),
    stage: string(),
    restApiId: string(),
    arns: object({
        original: string(),
        experiment: string(),
        proxy: optional(string())
    }),
    endpoint: object({
        httpMethod: string(),
        resourceId: string(),
    })
})

export interface apiGateway{
    readonly region: string;
    readonly stage: string;
    readonly restApiId: string;
    readonly arns:{
        readonly original:string;
        readonly experiment:string;
        proxy?:string;
    };
    readonly endpoint:{
        readonly httpMethod:string;
        readonly resourceId:string;
    }
}



export const stagesDecoder: Decoder<Stage[]> = array(object({
    time_s:number(),

    startTime:optional(number()),
    endTime:optional(number()),
    shadow: optional(object({
        totalRequestsPerSecond:optional(number()),
        multiplier:optional(number()),
    })),
    canary:optional(object({
        percent:number()
    })),
    saveResponseBody:boolean()
}))

export interface Stage {
    readonly time_s: number;

    readonly shadow?: {
        readonly totalRequestsPerSecond?: number;
        readonly multiplier?: number;
    },
    readonly canary?: {
        readonly percent: number
    },
    saveResponseBody: boolean;
    startTime?: number;
    endTime?: number;
}


export const getApiGatewayARN = function(arn:string):string{
    return "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/"+arn+"/invocations"   
}

