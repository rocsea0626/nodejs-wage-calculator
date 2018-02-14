/**
 * Created by guo_haipeng on 14/02/2018.
 */
const csv = require('csvtojson')
const moment = require('moment');

const BASE_DATE = '01-12-2017'

const OVERTIME_THRESHOLD = 8;
const HOURLY_WAGE = 3.75
const EVENING_COMPENSATION = HOURLY_WAGE + 1.15

function _isSegmentRegular(window) {
    const regularPeriod = {
        startHr: moment(window.start).startOf('day').hour(6),
        endHr: moment(window.start).startOf('day').hour(18),
    }
    // console.log(window.start)
    // console.log(window.end)

    return window.start >= regularPeriod.startHr && window.end <= regularPeriod.endHr
}

function _calculateHourlyWage(hoursWorked, start, end, hourlyWage) {
    // console.log('hoursWorked=%d', hoursWorked)
    var remainHours = moment.duration(end - start).asHours();
    // console.log('remainHours=%d', remainHours)
    var hoursNeeded = OVERTIME_THRESHOLD - hoursWorked;
    // console.log('hoursNeeded=%d', hoursNeeded)
    if (remainHours <= hoursNeeded) {
        return {
            wage: (remainHours) * hourlyWage,
            hours: remainHours
        }
    }
    if (hoursNeeded > 0) {
        return {
            wage: hoursNeeded * hourlyWage,
            hours: hoursNeeded
        }
    }
    return {
        wage: 0,
        hours: 0
    }
}

function _calculateOvertimeWage(hoursWorked, start, end, hourlyWage) {
    var remainHours = end - start;
    // console.log(moment.duration(remainHours).asHours())
    var hoursNeeded = (OVERTIME_THRESHOLD - hoursWorked < 0) ? 0 : OVERTIME_THRESHOLD - hoursWorked
    var overdueHours = moment.duration(remainHours).asHours() - hoursNeeded
    // console.log(overdueHours)
    if (overdueHours <= 0) {
        return {
            wage: 0,
            hours: 0
        }
    }


    if (overdueHours <= 2) {
        return {
            hours: overdueHours,
            wage: hourlyWage * 1.25 * overdueHours
        }
    }

    if (overdueHours <= 4) {
        return {
            hours: overdueHours,
            wage: hourlyWage * 1.5 * overdueHours
        }
    }

    return {
        hours: overdueHours,
        wage: hourlyWage * 2 * overdueHours
    }
}

function calculateSegmentWage(window) {
    // console.log('calculateSegmentWage()')

    if (_isSegmentRegular(window)) {
        // console.log('_isSegmentRegular() == true')
        const rt = _calculateHourlyWage(window.totalHours, window.start, window.end, HOURLY_WAGE)
        // console.log(rt)
        window.regular += rt.hours
        window.wage += rt.wage
        // console.log(window)

        const ot = _calculateOvertimeWage(window.totalHours, window.start, window.end, HOURLY_WAGE)
        window.overtimeRegular += ot.hours
        window.wage += ot.wage
        // console.log(window)

    } else {
        // console.log('_isSegmentRegular() == false')
        const et = _calculateHourlyWage(window.totalHours, window.start, window.end, EVENING_COMPENSATION)
        window.evening += et.hours
        window.wage += et.wage
        // console.log(et)
        const ot = _calculateOvertimeWage(window.totalHours, window.start, window.end, EVENING_COMPENSATION)
        window.overtimeEvening += ot.hours
        window.wage += ot.wage
        // console.log(ot)
    }
    // window.totalHours += moment.duration(window.end - window.start).asHours()
}

/**
 * 1. regulate hours using same date
 * 2. if endHr < startHr, endDate+=1
 * @param startHr
 * @param endHr
 * @returns {{startHr: number, endHr: number}}
 */
function regulateHours(startHr, endHr) {

    let start = moment(BASE_DATE + ' ' + startHr, 'DD-MM-YYYY HH:mm');
    let end = moment(BASE_DATE + ' ' + endHr, 'DD-MM-YYYY HH:mm');
    end = (end < start) ? end.add(1, 'days') : end
    return {startHr: start, endHr: end}

}

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

    aggregateWorkHoursById(workingHours) {
        const cwh = {}
        let d

        workingHours.forEach(function (val, idx) {
            let id = val['Person ID']
            let date = val['Date'];
            d = date
            if (!cwh[id]) {
                cwh[id] = {
                    name: val['Person Name'],
                    workingDays: {}
                }
            }
            if (!cwh[id].workingDays[date]) {
                cwh[id].workingDays[date] = {
                    date: date,
                    startHrs: [],
                    endHrs: []
                }
            }
            cwh[id].workingDays[date].startHrs.push(val['Start'])
            cwh[id].workingDays[date].endHrs.push(val['End'])
        })
        return cwh
    }

    /**
     *
     * @param workHours working hours in a given day
     */
    calculateDailyWage(workHours) {

        const window = {
            wage: 0,
            totalHours: 0,
            regular: 0,
            evening: 0,
            overtimeRegular: 0,
            overtimeEvening: 0,
            start: 0,
            end: 0
        }

        workHours.startHrs.forEach((val, idx) => {
            const startHr = val
            const endHr = workHours.endHrs[idx]
            const regHrs = regulateHours(startHr, endHr)

            window.start = moment(regHrs.startHr)
            window.end = calculateWindowEnd(window.start, moment(regHrs.endHr))


            while (window.end <= moment(regHrs.endHr)) {
                calculateSegmentWage(window)
                if (window.end.isSame(moment(regHrs.endHr)))
                    break
                window.start = moment(window.end)
                window.end = calculateWindowEnd(window.start, moment(regHrs.endHr))
                // console.log(window)
                // console.log(moment(regHrs.endHr))
            }

        })

        return window.wage

        function calculateWindowEnd(currStart, lastPossibleEnd) {
            /**
             *
             * @type {{startHr: (start hour of regular working hours, endHr: end hour of regular working hours}}
             */
            const regularPeriod = {
                startHr: moment(currStart).startOf('day').hour(6),
                endHr: moment(currStart).startOf('day').hour(18),
            }
            // console.log(mStart)
            // console.log(mEnd)

            if (currStart < regularPeriod.startHr && lastPossibleEnd <= regularPeriod.startHr)
                return lastPossibleEnd
            if (currStart < regularPeriod.startHr && lastPossibleEnd > regularPeriod.startHr)
                return regularPeriod.startHr

            if (currStart >= regularPeriod.endHr && lastPossibleEnd <= moment(regularPeriod.startHr).add(1, 'days'))
                return lastPossibleEnd
            if (currStart >= regularPeriod.endHr && lastPossibleEnd > moment(regularPeriod.startHr).add(1, 'days'))
                return moment(regularPeriod.startHr).add(1, 'days')

            if (currStart >= regularPeriod.startHr && lastPossibleEnd <= regularPeriod.endHr)
                return lastPossibleEnd
            if (currStart >= regularPeriod.startHr && lastPossibleEnd > regularPeriod.endHr)
                return regularPeriod.endHr
        }


    }

    calculateWage(csvFile) {

        const p = new Promise((res, rej)=>{
            const wages = []

            this.readCsv(csvFile).then((data) => {
                const workHours = this.aggregateWorkHoursById(data)

                let d

                for (let key in workHours) {
                    const pid = key
                    let monthlyWage = 0
                    let workingDays = workHours[pid].workingDays;

                    for (let wd in workingDays) {
                        // console.log(workHours[pid].workingDays[wd])
                        const dailyWage = this.calculateDailyWage(workingDays[wd])
                        d = wd
                        monthlyWage += dailyWage
                    }

                    wages.push({
                        id: pid,
                        month: moment(d, 'DD.MM.YYYY').format('DD.MM.YYYY').toString(),
                        name: workHours[pid].name,
                        wage: monthlyWage
                    })
                }

                res(wages)

            }).catch((err) => {
                console.log(err)
                rej(err)
            })
        })
        return p
    }
}

exports.Calculator = Calculator;

