const fs = require('fs');
const crypto = require("crypto")


const boot_time =  Math.round((Date.now()/1000));
var vm_id;

exports.ExSysHeaders = function (context,version) {
    const memory = context.memoryLimitInMB
    const timeout = JSON.stringify(context.getRemainingTimeInMillis()/1000)

    var newVM = false;
    if (vm_id === undefined){
        vm_id= crypto.randomBytes(16).toString("base64");
        newVM = true;
    }
    return {
        version:version,
        vm_id:vm_id,
        boot_time:boot_time,
        memory:memory,
        timeout:timeout,
        new_vm: newVM
    }
}