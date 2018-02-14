/**
 * Created by guo_haipeng on 14/02/2018.
 */
const csv = require('csvtojson')

const OVERTIME_THRESHOLD = 8;
const HOURLY_WAGE = 3.75
const EVENING_COMPENSATION = HOURLY_WAGE + 1.15


class Calculator {
    constructor(hourlyWage = 3.75, envCompensationRate = 1.15, overtimeThreshold = 8) {
        this.hourlyWage = hourlyWage
        this.eveningWage = this.hourlyWage + envCompensationRate
        this.overtimeThreshold = overtimeThreshold
    }

    readCsv(filePath) {
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

    test() {
        console.log('test()')
    }
}

exports.Calculator = Calculator;

