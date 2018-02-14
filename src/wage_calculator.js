/**
 * Created by guo_haipeng on 14/02/2018.
 */
const moment = require('moment');
const utils = require('./utils.js')
const config = require('./config.js')

const BASE_DATE = '01-12-2017'


class Calculator {
    constructor(hourlyWage = 3.75, envCompensationRate = 1.15, overtimeThreshold = 8) {
        this.hourlyWage = hourlyWage
        this.eveningWage = this.hourlyWage + envCompensationRate
        this.overtimeThreshold = overtimeThreshold
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
            window.end = _getSegmentEnd(window.start, moment(regHrs.endHr))


            while (window.end <= moment(regHrs.endHr)) {
                calculateSegmentWage(window)
                if (window.end.isSame(moment(regHrs.endHr)))
                    break
                window.start = moment(window.end)
                window.end = _getSegmentEnd(window.start, moment(regHrs.endHr))
            }

        })

        return window.wage

    }

    calculateMonthlyWage(dataFrame) {
        const wages = []
        const workHours = _aggregateWorkHoursById(dataFrame)

        let d

        for (let key in workHours) {
            const pid = key
            let monthlyWage = 0
            let workingDays = workHours[pid].workingDays;
            // console.log(workingDays)

            for (let wd in workingDays) {
                const dailyWage = this.calculateDailyWage(workingDays[wd])
                d = wd
                monthlyWage += dailyWage
            }

            wages.push({
                id: pid,
                month: moment(d, 'DD.MM.YYYY').format('MM.YYYY').toString(),
                name: workHours[pid].name,
                wage: utils.toDecimal2(monthlyWage)
            })
        }

        return wages
    }

}


function _isSegmentRegular(window) {
    const regularPeriod = {
        startHr: moment(window.start).startOf('day').hour(6),
        endHr: moment(window.start).startOf('day').hour(18),
    }

    return window.start >= regularPeriod.startHr && window.end <= regularPeriod.endHr
}

function _calculateHourlyWage(hoursWorked, start, end, hourlyWage) {
    var remainHours = moment.duration(end - start).asHours();
    var hoursNeeded = config.OVERTIME_THRESHOLD - hoursWorked;
    if (remainHours <= hoursNeeded) {
        return {
            wage: remainHours * hourlyWage,
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
    var hoursNeeded = (config.OVERTIME_THRESHOLD - hoursWorked < 0) ? 0 : config.OVERTIME_THRESHOLD - hoursWorked
    var overdueHours = moment.duration(remainHours).asHours() - hoursNeeded

    const overtime = {
        wage: 0,
        hours: 0
    }

    if (overdueHours <= 0) {
        return overtime
    }

    let countedOverdueHours = (hoursWorked - config.OVERTIME_THRESHOLD < 0) ? 0 : hoursWorked - config.OVERTIME_THRESHOLD
    const interval2Hours = config.OVERTIME_INTERVAL_2 - countedOverdueHours

    if(interval2Hours > 0){
        if(overdueHours > interval2Hours){
            overtime.wage += interval2Hours * hourlyWage * config.OVERTIME_RATE_2
            overtime.hours += interval2Hours
            overdueHours -= interval2Hours
            countedOverdueHours += interval2Hours
        } else {
            overtime.wage += overdueHours * hourlyWage * config.OVERTIME_RATE_2
            overtime.hours += overdueHours
            return overtime
        }
    }

    const interval4Hours = config.OVERTIME_INTERVAL_4 - countedOverdueHours
    if(interval4Hours > 0){
        if(overdueHours > interval4Hours){
            overtime.wage += interval4Hours * hourlyWage * config.OVERTIME_RATE_4
            overtime.hours += interval4Hours
            overdueHours -= interval4Hours
            countedOverdueHours += interval4Hours
        } else {
            overtime.wage += overdueHours * hourlyWage * config.OVERTIME_RATE_4
            overtime.hours += overdueHours
            return overtime
        }
    }

    overtime.wage += overdueHours * hourlyWage * config.OVERTIME_RATE_4_PLUS
    overtime.hours += overdueHours
    return overtime

}

function calculateSegmentWage(window) {

    if (_isSegmentRegular(window)) {
        const rt = _calculateHourlyWage(window.totalHours, window.start, window.end, config.HOURLY_WAGE)
        window.regular += rt.hours
        window.wage += rt.wage

        const ot = _calculateOvertimeWage(window.totalHours, window.start, window.end, config.HOURLY_WAGE)
        window.overtimeRegular += ot.hours
        window.wage += ot.wage

    } else {
        const et = _calculateHourlyWage(window.totalHours, window.start, window.end, config.EVENING_COMPENSATION)
        window.evening += et.hours
        window.wage += et.wage

        const ot = _calculateOvertimeWage(window.totalHours, window.start, window.end, config.EVENING_COMPENSATION)
        window.overtimeEvening += ot.hours
        window.wage += ot.wage
    }
    window.totalHours += moment.duration(window.end - window.start).asHours()
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

function _aggregateWorkHoursById(workingHours) {
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

function _getSegmentEnd(currStart, lastPossibleEnd) {
    /**
     *
     * @type {{startHr: (start hour of regular working hours, endHr: end hour of regular working hours}}
     */
    const regularPeriod = {
        startHr: moment(currStart).startOf('day').hour(config.REGULAR_WORK_HOUR_START),
        endHr: moment(currStart).startOf('day').hour(config.REGULAR_WORK_HOUR_END),
    }

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


exports.Calculator = Calculator;

