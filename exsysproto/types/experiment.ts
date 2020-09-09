import { Config } from "../types/config"

export interface Experiment {
    readonly config: Config;
   // readonly reqCount: number;
    readonly results: Result[];
}

export interface Result{
    readonly id: string;
    readonly proxyID: string;
    readonly experimentID: string;
    readonly stage:number;
    readonly strategy:string;
    readonly trafficArtificial:boolean;
    readonly startTime:number;
    readonly executionTime:number;
    readonly statusCode:number;

    res: any;
    responseBody?:any;
}
