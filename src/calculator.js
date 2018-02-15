/**
 * Created by guo_haipeng on 15/02/2018.
 */
const moment = require('moment');
const utils = require('./utils.js')
const defaults = require('./defaults.js')

const BASE_DATE = '01-12-2017'


class ConfigBuilder {

    constructor() {
        this.hourlyWage = defaults.HOURLY_WAGE
        this.eveningCompensation = defaults.EVENING_COMPENSATION
        this.overtimeThreshold = defaults.OVERTIME_THRESHOLD
        this.overtimeRate2 = defaults.OVERTIME_RATE_2
        this.overtimeRate4 = defaults.OVERTIME_RATE_4
        this.overtimeRate4Plus = defaults.OVERTIME_RATE_4_PLUS
        this.overtimeInterval2 = defaults.OVERTIME_INTERVAL_2
        this.overtimeInterval4 = defaults.OVERTIME_INTERVAL_4
        this.regularWorkhourStart = defaults.REGULAR_WORK_HOUR_START
        this.regularWorkhourEnd = defaults.REGULAR_WORK_HOUR_END
    }

    setHourlyWage(hourlyWage) {
        this.hourlyWage = hourlyWage
        return this
    }

    setEveningCompensation(eveningCompensation) {
        this.eveningCompensation = eveningCompensation
        return this
    }

    setOvertimeThreshold(overtimeThreshold) {
        this.overtimeThreshold = overtimeThreshold
        return this
    }

    setOvertimeRate2(overtimeRate2) {
        this.overtimeRate2 = overtimeRate2
        return this
    }

    setOvertimeRate4(overtimeRate4) {
        this.overtimeRate4 = overtimeRate4
        return this
    }

    setOvertimeRate4Plus(overtimeRate4Plus) {
        this.overtimeRate4Plus = overtimeRate4Plus
        return this
    }

    setOvertimeInterval2(overtimeInterval2) {
        this.overtimeInterval2 = overtimeInterval2
        return this
    }

    setOvertimeInterval4(overtimeInterval4) {
        this.overtimeInterval4 = overtimeInterval4
        return this
    }

    setRegularWorkhourStart(regularWorkhourStart) {
        this.regularWorkhourStart = regularWorkhourStart
        return this
    }

    setRegularWorkhourEnd(regularWorkhourEnd) {
        this.regularWorkhourEnd = regularWorkhourEnd
        return this
    }

    validate() {

        for (let prop in this) {
            if (this[prop] < 0)
                return false
        }

        if (this.overtimeInterval2 >= this.overtimeInterval4)
            return false

        if (this.regularWorkhourStart >= this.regularWorkhourEnd)
            return false

        return true
    }

    build() {
        if (this.validate())
            return this
    }
}

const defaultConfig = new ConfigBuilder().build()

const Calculator = function (config = defaultConfig) {

    this._config = {
        hourlyWage: config.hourlyWage,
        eveningWage: config.hourlyWage + config.eveningCompensation,
        regularWorkhourStart: config.regularWorkhourStart,
        regularWorkhourEnd: config.regularWorkhourEnd,
        overtimeThreshold: 8,
        overtimeRate2: 1.25,
        overtimeRate4: 1.5,
        overtimeRate4Plus: 2,
        overtimeInterval2: 2,
        overtimeInterval4: 4
    }

    const _isSegmentInRegularHours = function (segment, config) {
        const regularPeriod = {
            startHr: moment(segment.start).startOf('day').hour(config.regularWorkhourStart),
            endHr: moment(segment.start).startOf('day').hour(config.regularWorkhourEnd),
        }

        return segment.start >= regularPeriod.startHr && segment.end <= regularPeriod.endHr
    }

    const _calculateHourlyWage = function (hoursWorked, start, end, config, wageThisHour) {
        const remainHours = moment.duration(end - start).asHours();
        const hoursNeeded = config.overtimeThreshold - hoursWorked;
        if (remainHours <= hoursNeeded) {
            return {
                wage: remainHours * wageThisHour,
                hours: remainHours
            }
        }
        if (hoursNeeded > 0) {
            return {
                wage: hoursNeeded * wageThisHour,
                hours: hoursNeeded
            }
        }
        return {
            wage: 0,
            hours: 0
        }
    }

    const _calculateOvertimeWage = function (hoursWorked, start, end, config, wageThisHour) {
        var remainHours = end - start;
        var hoursNeeded = (config.overtimeThreshold - hoursWorked < 0) ? 0 : config.overtimeThreshold - hoursWorked
        var overdueHours = moment.duration(remainHours).asHours() - hoursNeeded

        const overtime = {
            wage: 0,
            hours: 0
        }

        if (overdueHours <= 0) {
            return overtime
        }

        let countedOverdueHours = (hoursWorked - config.overtimeThreshold < 0) ? 0 : hoursWorked - config.overtimeThreshold
        const interval2Hours = config.overtimeInterval2 - countedOverdueHours

        if (interval2Hours > 0) {
            if (overdueHours > interval2Hours) {
                overtime.wage += interval2Hours * wageThisHour * config.overtimeRate2
                overtime.hours += interval2Hours
                overdueHours -= interval2Hours
                countedOverdueHours += interval2Hours
            } else {
                overtime.wage += overdueHours * wageThisHour * config.overtimeRate2
                overtime.hours += overdueHours
                return overtime
            }
        }

        const interval4Hours = config.overtimeInterval4 - countedOverdueHours
        if (interval4Hours > 0) {
            if (overdueHours > interval4Hours) {
                overtime.wage += interval4Hours * wageThisHour * config.overtimeRate4
                overtime.hours += interval4Hours
                overdueHours -= interval4Hours
                countedOverdueHours += interval4Hours
            } else {
                overtime.wage += overdueHours * wageThisHour * config.overtimeRate4
                overtime.hours += overdueHours
                return overtime
            }
        }

        overtime.wage += overdueHours * wageThisHour * config.overtimeRate4Plus
        overtime.hours += overdueHours
        return overtime
    }

    const _calculateSegmentWage = function (segment, config) {
        if (_isSegmentInRegularHours(segment, config)) {
            const rt = _calculateHourlyWage(segment.totalHours, segment.start, segment.end, config, config.hourlyWage)
            segment.regular += rt.hours
            segment.wage += rt.wage

            const ot = _calculateOvertimeWage(segment.totalHours, segment.start, segment.end, config, config.hourlyWage)
            segment.overtimeRegular += ot.hours
            segment.wage += ot.wage

        } else {
            const et = _calculateHourlyWage(segment.totalHours, segment.start, segment.end, config, config.eveningWage)
            segment.evening += et.hours
            segment.wage += et.wage

            const ot = _calculateOvertimeWage(segment.totalHours, segment.start, segment.end, config, config.eveningWage)
            segment.overtimeEvening += ot.hours
            segment.wage += ot.wage
        }
        segment.totalHours += moment.duration(segment.end - segment.start).asHours()
    }

    /**
     * 1. regulate hours using same date
     * 2. if endHr < startHr, endDate+=1
     *
     * @param startHr
     * @param endHr
     * @returns {{startHr: number, endHr: number}}
     */
    const _regulateHours = function (startHr, endHr) {
        let start = moment(BASE_DATE + ' ' + startHr, 'DD-MM-YYYY HH:mm');
        let end = moment(BASE_DATE + ' ' + endHr, 'DD-MM-YYYY HH:mm');
        end = (end < start) ? end.add(1, 'days') : end
        if (!start.isValid() || !end.isValid())
            throw new Error('invalid date format, d=%s', start)
        if (!end.isValid())
            throw new Error('invalid date format, d=%s', end)
        return {startHr: start, endHr: end}
    }

    const _getSegmentEnd = function (currStart, maxEnd, config) {
        /**
         * @type {{startHr: (start hour of regular working hours, endHr: end hour of regular working hours}}
         */
        const regularHours = {
            startHr: moment(currStart).startOf('day').hour(config.regularWorkhourStart),
            endHr: moment(currStart).startOf('day').hour(config.regularWorkhourEnd),
        }

        if (currStart < regularHours.startHr && maxEnd <= regularHours.startHr)
            return maxEnd
        if (currStart < regularHours.startHr && maxEnd > regularHours.startHr)
            return regularHours.startHr

        if (currStart >= regularHours.endHr && maxEnd <= moment(regularHours.startHr).add(1, 'days'))
            return maxEnd
        if (currStart >= regularHours.endHr && maxEnd > moment(regularHours.startHr).add(1, 'days'))
            return moment(regularHours.startHr).add(1, 'days')

        if (currStart >= regularHours.startHr && maxEnd <= regularHours.endHr)
            return maxEnd
        if (currStart >= regularHours.startHr && maxEnd > regularHours.endHr)
            return regularHours.endHr
    }

    const _aggregateWorkHoursById = function (workingHours) {
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
     * Calculating daily wage for one person from given workHours on that day
     *
     * Upon receiving a pair of {start, end} time range, this function divides this time range into one or multiple
     * time segments for calculation
     *
     * @param workHours sampleWorkHours: {date: '27.3.2014', startHrs: ['9:15', '12:45'], endHrs: ['10:15', '21:00']}
     * @returns {number}
     */
    Calculator.prototype.calculateDailyWage = function (workHours) {
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
            const regHrs = _regulateHours(startHr, endHr)

            window.start = moment(regHrs.startHr)
            window.end = _getSegmentEnd(window.start, moment(regHrs.endHr), this._config)


            while (window.end <= moment(regHrs.endHr)) {
                _calculateSegmentWage(window, this._config)
                if (window.end.isSame(moment(regHrs.endHr)))
                    break
                window.start = moment(window.end)
                window.end = _getSegmentEnd(window.start, moment(regHrs.endHr), this._config)
            }

        })
        return window.wage
    }


    /**
     * Calculating monthly wage for each person from given dataFrame
     *
     * @param dataFrame json objects parsed from .csv file
     * @returns {{wages: Array}}
     */
    Calculator.prototype.calculateMonthlyWage = function (dataFrame) {
        "use strict";
        const wages = {
            wages: []
        }
        const workHours = _aggregateWorkHoursById(dataFrame)

        let d

        for (let key in workHours) {
            const pid = key
            let monthlyWage = 0
            let workingDays = workHours[pid].workingDays;
            // console.log(workingDays)

            for (let wd in workingDays) {
                try {
                    const dailyWage = this.calculateDailyWage(workingDays[wd])
                    d = wd
                    monthlyWage += dailyWage
                } catch (err) {
                    console.log(err)
                    monthlyWage = -1
                    break
                }
            }

            wages['wages'].push({
                // id: pid,
                // month: moment(d, 'DD.MM.YYYY').format('MM.YYYY').toString(),
                name: workHours[pid].name,
                wage: utils.toDecimal2(monthlyWage)
            })
        }
        wages['month'] = moment(d, 'DD.MM.YYYY').format('MM.YYYY').toString()

        return wages
    }

}

exports.Calculator = Calculator
exports.ConfigBuilder = ConfigBuilder