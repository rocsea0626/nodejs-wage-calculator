const csv = require('csvtojson')

exports.readCsv = function (filePath) {
    const p = new Promise((res, rej) => {
        const jsonObjs = []

        csv().fromFile(filePath)
            .on('json', function (jsonObj) {
                jsonObjs.push(jsonObj)
            })
            .on('done', function (err) {
                res(jsonObjs)
                if (err) {
                    rej(err)
                }
            })
    })
    return p
}

exports.toDecimal2 = function(x) {
    var f = parseFloat(x);
    if (isNaN(f)) {
        return false;
    }
    var f = Math.round(x*100)/100;
    var s = f.toString();
    var rs = s.indexOf('.');
    if (rs < 0) {
        rs = s.length;
        s += '.';
    }
    while (s.length <= rs + 2) {
        s += '0';
    }
    return s;
}