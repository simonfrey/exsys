var seed = 1;
exports.Random = function() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}