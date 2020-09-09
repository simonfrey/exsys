interface aliasCfg {
    readonly region: string;
    readonly experimentID: string;
}
export const getAliasCfg = function (arn: string): aliasCfg {
    const arnSplit = arn.split(":");
    if (arnSplit.length != 8) {
        throw "Invalid alias arn: " + arn
    }
    const tmpCFG = arnSplit.slice(-1)[0].split("_")
    if (tmpCFG.length != 2) {
        throw "Invalid alias config: " + arnSplit.slice(-1)[0]
    }

    return {
        region: tmpCFG[0],
        experimentID: tmpCFG[1]
    }
}
