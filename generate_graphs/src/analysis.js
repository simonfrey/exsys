if (typeof String.prototype.endsWith !== 'function') {
    String.prototype.endsWith = function (suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}

(async () => {



    const timeDivider = 1000;
    // Jmeter Data
    const jmeterRaw = await d3.csv("data/jmeter.csv");
    var startTS = Math.floor(jmeterRaw[0].timeStamp / timeDivider);
    var endTS = Math.floor(jmeterRaw[jmeterRaw.length - 1].timeStamp / timeDivider);

    var exsysData = await d3.json("data/exsys.json");
    const exSysStartTS = Math.floor(exsysData.config.startTime / timeDivider);
    const exSysEndTS = Math.floor(exsysData.config.endTime / timeDivider);
    if (exSysStartTS < startTS) {
        startTS = exSysStartTS
    }
    if (exSysEndTS < endTS) {
        endTS = exSysEndTS
    }


    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const chart = urlParams.get('c')

    switch (chart) {
        case "0":

            const jD = processJmeterData(timeDivider, startTS, endTS, jmeterRaw);
            const jmeterChart = LineChart("Request by statuscode (jmeter)", "Time (in seconds)", "Requests count", jD.labels, jD.datasets)

            break;
        case "1":


            const jD2 = processJmeterDataRequestDuration(timeDivider, startTS, endTS, jmeterRaw);
            const jmeterChart2 = LineChart("Request duration", "Time (in seconds)", "Request duration (ms)", jD2.labels, jD2.datasets)

            break;
        case "2":


            const eD = processExSysData(timeDivider, startTS, endTS, exsysData);
            const exSysChart = LineChart("Traffic on system (exsys)", "Time (in seconds)", "Requests count", eD.labels, eD.datasets)


            break;
        case "3":

            const eD2 = processExSysDataTotalRequest(timeDivider, startTS, endTS, exsysData);
            const exSysChart2 = LineChart("Total request in system", "Time (in seconds)", "Total requests count", eD2.labels, eD2.datasets)

            break;  
        case "4":

            const eD3 = processExSysContainerCount(timeDivider, startTS, endTS, exsysData);
            const exSysChart3 = LineChart("Container count", "Time (in seconds)", "Request count", eD3.labels, eD3.datasets)

            break;
        case "5":

                const eD4 = processExSysAverageRequestTimeout(timeDivider, startTS, endTS, exsysData);
                const exSysChart4 = LineChart("Average execution time count", "Time (in seconds)", "Execution time (ms)", eD4.labels, eD4.datasets)
    
                break;
    }



})()




function processExSysData(timeDiv, startTS, endTS, data) {
    var respObj = {};
    var labels = [];

    // Setup labels    
    const durationS = endTS - startTS + 1;
    for (var k = 0; k < durationS; k++) {
        labels[k] = k;
    }


    // Add default data series 
    ["total", "expected total"].forEach(function (item, index) {
        respObj[item] = [];
        for (var k = 0; k < durationS; k++) {
            respObj[item][k] = 0;
        }
    });



    // Process result data
    data.results.forEach(function (item, index) {
        if (item == null){
            return
        }
        item.res.forEach(function (item, index) {
            if (item.stage == 0) {
                return
            }

            const ts = Math.floor(item.startTime / timeDiv) - startTS;

            respObj["total"][ts] += 1

            if (respObj[item.strategy] == undefined) {
                respObj[item.strategy] = [];
                for (var k = 0; k < durationS; k++) {
                    respObj[item.strategy][k] = 0;
                }
            }


            respObj[item.strategy][ts] += 1
        })
    })

    // Add expected data
    var cStage = 0;
    respObj["expected total"].forEach(function (item, index) {
        if (item.stage < 1) {
            return
        }
        if (item.stage > data.config.currentStage) {
            return
        }


        const stageCFG = data.config.stages[cStage];

        if (stageCFG.shadow != undefined && stageCFG.shadow.totalRequestsPerSecond != undefined) {
            respObj["expected total"][index] = stageCFG.shadow.totalRequestsPerSecond;
        }
        else {
            var base = respObj["base"][index];
            if (respObj["canary"] != undefined && respObj["canary"][index] != 0) {
                base += respObj["canary"][index];
            }
            var res = base;

            if (stageCFG.shadow != undefined && stageCFG.shadow.multiplier != undefined) {
                res = base * (stageCFG.shadow.multiplier + 1);
            }


            respObj["expected total"][index] = res;
        }



        const stageEnd = Math.floor(data.config.stages[cStage].endTime / timeDiv) - startTS;
        if (stageEnd < index + 1) {
            cStage++;
        }


    })


    console.log(respObj)


    var result = {
        labels: labels, datasets: []
    }

    var k = kernel(9);// gaussian smoothing

    Object.keys(respObj).map(function (key, index) {
        var d = Object.keys(respObj[key]).map((ikey) => respObj[key][ikey]);

        result.datasets.push({
            color: "neutral",
            label: key,
            data: convolute(respObj[key], k, i => i)
        })
    });





    return result
}



function processExSysContainerCount(timeDiv, startTS, endTS, data) {
    var respObj = {};
    var labels = [];

    // Setup labels    
    const durationS = endTS - startTS + 1;
    for (var k = 0; k < durationS; k++) {
        labels[k] = k;
    }


    // Add default data series 
    ["Total Containers ExSys","New containers ExSys","Total Containers Proxy","New containers Proxy"].forEach(function (item, index) {
        respObj[item] = [];
        for (var k = 0; k < durationS; k++) {
            respObj[item][k] = 0;
        }
    });


    var seenContainers = {};



    // Process result data
    data.results.forEach(function (item, index) {
        if (item == null){
            return
        }
        item.res.forEach(function (item, index) {
            if (item.stage == 0) {
                return
            }

            const ts = Math.floor(item.startTime / timeDiv) - startTS;


            // Object.keys(seenContainers).forEach((k, i) => {
            //     const d = seenContainers[k];
            //     if (ts -d > 10){
            //         delete seenContainers[k];
            //     }
            // });

            if(item.res.vm_id != undefined && seenContainers[item.res.vm_id] == undefined){
                respObj["New containers ExSys"][ts] += 1;

                seenContainers[item.res.vm_id] = true;
            }
            if(item.proxyID != undefined && seenContainers[item.proxyID] == undefined){
                respObj["New containers Proxy"][ts] += 1;

                seenContainers[item.proxyID] = true;
            }




        })
    })



    var a = 0;
        function totalFunc(currentValue, index, arr) {
            var nC = a + currentValue;
            a = nC;
            return nC;
        }

        respObj["Total Containers ExSys"] = respObj["New containers ExSys"].map(totalFunc)

        a =0;
        respObj["Total Containers Proxy"] = respObj["New containers Proxy"].map(totalFunc)



    console.log(respObj)


    var result = {
        labels: labels, datasets: []
    }

    var k = kernel(9);// gaussian smoothing

    Object.keys(respObj).map(function (key, index) {
        var d = Object.keys(respObj[key]).map((ikey) => respObj[key][ikey]);

        result.datasets.push({
            color: "neutral",
            label: key,
            data: convolute(respObj[key], k, i => i)
        })
    });







    return result
}


function processExSysAverageRequestTimeout(timeDiv, startTS, endTS, data) {
    var respObj = {};
    var labels = [];

    // Setup labels    
    const durationS = endTS - startTS + 1;
    for (var k = 0; k < durationS; k++) {
        labels[k] = k;
    }


    // Add default data series 
    ["Average request timeout","request_count","total_request_time"].forEach(function (item, index) {
        respObj[item] = [];
        for (var k = 0; k < durationS; k++) {
            respObj[item][k] = 0;
        }
    });


    // Process result data
    data.results.forEach(function (item, index) {
        if (item == null){
            return
        }
        item.res.forEach(function (item, index) {
            if (item.stage == 0) {
                return
            }

            const ts = Math.floor(item.startTime / timeDiv) - startTS;

            if (item.res.vm_id == undefined){
                return
            }
            respObj["request_count"][ts] += 1;
            respObj["total_request_time"][ts] += item.executionTime;
       

        })
    })

    // Add expected data
    var cStage = 0;
    respObj["request_count"].forEach(function (item, index) {
        if (item == 0){
            return
        }

        respObj["Average request timeout"][index] =  respObj["total_request_time"][index]/item;
    })

    delete respObj['request_count'];
    delete respObj['total_request_time'];


    console.log(respObj)


    var result = {
        labels: labels, datasets: []
    }

    var k = kernel(9);// gaussian smoothing

    Object.keys(respObj).map(function (key, index) {
        var d = Object.keys(respObj[key]).map((ikey) => respObj[key][ikey]);

        result.datasets.push({
            color: "neutral",
            label: key,
            data: convolute(respObj[key], k, i => i)
        })
    });





    return result
}


function processExSysDataTotalRequest(timeDiv, startTS, endTS, data) {
    var respObj = {};
    var labels = [];
    var base = [];

    // Setup labels    
    const durationS = endTS - startTS + 1;
    for (var k = 0; k < durationS; k++) {
        labels[k] = k;
        base[k] = 0;

    }


    // Add default data series 
    ["total", "expected total"].forEach(function (item, index) {
        respObj[item] = [];
        for (var k = 0; k < durationS; k++) {
            respObj[item][k] = 0;
        }
    });


    // Process result data
    data.results.forEach(function (item, index) {
        if (item == null){
            return
        }
        item.res.forEach(function (item, index) {
            const ts = Math.floor(item.startTime / timeDiv) - startTS;

            respObj["total"][ts] += 1

            if (item.strategy != "shadow") {
                base[ts] += 1
            }


        })
    })


    // Add expected data
    var cStage = 0;
    respObj["expected total"].forEach(function (item, index) {
        if (item.stage < 1) {
            return
        }
        const stageCFG = data.config.stages[cStage];



        if (stageCFG.shadow != undefined && stageCFG.shadow.totalRequestsPerSecond != undefined) {
            respObj["expected total"][index] = stageCFG.shadow.totalRequestsPerSecond;
        } else {
            var res = base[index];
            if (stageCFG.shadow != undefined && stageCFG.shadow.multiplier != undefined) {
                res = base[index] * (stageCFG.shadow.multiplier + 1);
            }
            // TODO: base is weird wrong
            respObj["expected total"][index] = res;

        }

        const stageEnd = Math.floor(data.config.stages[cStage].endTime / timeDiv) - startTS;
        if (stageEnd < index + 1) {
            cStage++;
        }

    })

    console.log(respObj["expected total"])


    Object.keys(respObj).forEach(function (key, index) {
        var a = 0;
        function totalFunc(currentValue, index, arr) {
            var nC = a + currentValue;
            a = nC;
            return nC;
        }

        respObj[key] = respObj[key].map(totalFunc)

    })


    var result = {
        labels: labels, datasets: []
    }

    var k = kernel(9);// gaussian smoothing

    Object.keys(respObj).map(function (key, index) {
        var d = Object.keys(respObj[key]).map((ikey) => respObj[key][ikey]);

        result.datasets.push({
            color: "neutral",
            label: key,
            data: convolute(respObj[key], k, i => i)
        })
    });





    return result
}



function processJmeterData(timeDiv, startTS, endTS, data) {
    var respObj = {};
    var labels = [];

    // Setup labels    
    const durationS = endTS - startTS + 1;
    for (var k = 0; k < durationS; k++) {
        labels[k] = k;
    }


    // Save request
    data.forEach(function (item, index) {
        const ts = Math.floor(item.timeStamp / timeDiv) - startTS;

        if (!item.URL.endsWith("/products")) {
            return
        }

        if (respObj[item.responseCode] == undefined) {
            respObj[item.responseCode] = [];
            for (var k = 0; k < durationS; k++) {
                respObj[item.responseCode][k] = 0;
            }
        }

        respObj[item.responseCode][ts] += 1

    });

    console.log(respObj)


    var result = {
        labels: labels, datasets: []
    }

    var k = kernel(9);// gaussian smoothing

    Object.keys(respObj).map(function (key, index) {
        var d = Object.keys(respObj[key]).map((ikey) => respObj[key][ikey]);

        result.datasets.push({
            color: colorByStatusCode(key),
            label: key,
            data: convolute(respObj[key], k, i => i)
        })
    });

    console.log(respObj)




    return result
}


function processJmeterDataRequestDuration(timeDiv, startTS, endTS, data) {
    var respObj = {};
    var labels = [];

    // Setup labels    
    const durationS = endTS - startTS + 1;
    for (var k = 0; k < durationS; k++) {
        labels[k] = k;
    }


    // Add default data series 
    ["reqDuration", "reqCount", "Average request time"].forEach(function (item, index) {
        respObj[item] = [];
        for (var k = 0; k < durationS; k++) {
            respObj[item][k] = 0;
        }
    });

    // Save request
    data.forEach(function (item, index) {
        const ts = Math.floor(item.timeStamp / timeDiv) - startTS;
        if (!item.URL.endsWith("/products")) {
            return
        }

        respObj["reqCount"][ts] += 1
        respObj["reqDuration"][ts] += Number(item.elapsed);

    });

    console.log(respObj)


    respObj["reqCount"].forEach(function (item, index) {
        if (item == 0) {
            respObj["Average request time"][index] = 0
            return
        }


        console.log("RES", respObj["reqDuration"][index], item)

        respObj["Average request time"][index] = respObj["reqDuration"][index] / item;
    });
    delete respObj['reqDuration'];
    delete respObj['reqCount'];



    var result = {
        labels: labels, datasets: []
    }

    var k = kernel(9);// gaussian smoothing

    Object.keys(respObj).map(function (key, index) {
        var d = Object.keys(respObj[key]).map((ikey) => respObj[key][ikey]);

        result.datasets.push({
            color: "neutral",
            label: key,
            data: convolute(respObj[key], k, i => i)
        })
    });

    console.log(respObj)




    return result
}

function colorByStatusCode(statusCode) {
    if (statusCode.charAt(0) == "2") {
        return "positive"
    }
    return "negative"

}

function kernel(i) {
    if (i % 2 != 1) {
        throw "Kernel is must be uneven"
    }

    var kern = []

    for (var k = 1; k <= Math.ceil(i / 2); k++) {
        kern.push(k * 0.1);
    }

    for (var k = Math.floor(i / 2); k >= 1; k--) {
        kern.push(k * 0.1);
    }

    console.log(kern)


    return normaliseKernel(kern)
}





function convolute(data, kernel, accessor) {
    var kernel_center = Math.floor(kernel.length / 2);
    var left_size = kernel_center;
    var right_size = kernel.length - (kernel_center - 1);
    if (accessor == undefined) {
        accessor = function (datum) {
            return datum;
        }
    }

    function constrain(i, range) {
        if (i < range[0]) {
            i = 0;
        }
        if (i > range[1]) {
            i = range[1];
        }
        return i;
    }

    var convoluted_data = data.map(function (d, i) {
        var s = 0;
        for (var k = 0; k < kernel.length; k++) {
            var index = constrain((i + (k - kernel_center)), [0, data.length - 1]);
            s += kernel[k] * accessor(data[index]);
        }
        return Math.round(s);
    });


    return convoluted_data;
}



function normaliseKernel(a) {
    var sum_a = d3.sum(a);
    a = a.map(function (d) {
        return d / sum_a;
    })
    return a;
}