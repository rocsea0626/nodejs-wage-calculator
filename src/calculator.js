/**
 * Created by guo_haipeng on 15/02/2018.
 */
const moment = require('moment');
const utils = require('./utils.js')
const config = require('./config.js')

const BASE_DATE = '01-12-2017'

const Calculator = function (hourlyWage = 3.75) {

    const _hourlyWage = hourlyWage
    const _eveningWage = hourlyWage + 1.15
    const _overtimeThreshold = 8

    const _isSegmentRegular = function (segment) {
        const regularPeriod = {
            startHr: moment(segment.start).startOf('day').hour(6),
            endHr: moment(segment.start).startOf('day').hour(18),
        }

        return segment.start >= regularPeriod.startHr && segment.end <= regularPeriod.endHr
    }

    const _calculateHourlyWage = function (hoursWorked, start, end, hourlyWage) {
        const remainHours = moment.duration(end - start).asHours();
        const hoursNeeded = _overtimeThreshold - hoursWorked;
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

    const _calculateOvertimeWage = function (hoursWorked, start, end, hourlyWage) {
        var remainHours = end - start;
        var hoursNeeded = (_overtimeThreshold - hoursWorked < 0) ? 0 : _overtimeThreshold - hoursWorked
        var overdueHours = moment.duration(remainHours).asHours() - hoursNeeded

        const overtime = {
            wage: 0,
            hours: 0
        }

        if (overdueHours <= 0) {
            return overtime
        }

        let countedOverdueHours = (hoursWorked - _overtimeThreshold < 0) ? 0 : hoursWorked - _overtimeThreshold
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

    const _calculateSegmentWage = function (segment) {
        if (_isSegmentRegular(segment)) {
            const rt = _calculateHourlyWage(segment.totalHours, segment.start, segment.end, _hourlyWage)
            segment.regular += rt.hours
            segment.wage += rt.wage

            const ot = _calculateOvertimeWage(segment.totalHours, segment.start, segment.end, _hourlyWage)
            segment.overtimeRegular += ot.hours
            segment.wage += ot.wage

        } else {
            const et = _calculateHourlyWage(segment.totalHours, segment.start, segment.end, _eveningWage)
            segment.evening += et.hours
            segment.wage += et.wage

            const ot = _calculateOvertimeWage(segment.totalHours, segment.start, segment.end, _eveningWage)
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
        return {startHr: start, endHr: end}
    }

    const _getSegmentEnd = function (currStart, lastPossibleEnd) {
        /**
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


    return {

        calculateDailyWage: function (workHours) {
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
                window.end = _getSegmentEnd(window.start, moment(regHrs.endHr))


                while (window.end <= moment(regHrs.endHr)) {
                    _calculateSegmentWage(window)
                    if (window.end.isSame(moment(regHrs.endHr)))
                        break
                    window.start = moment(window.end)
                    window.end = _getSegmentEnd(window.start, moment(regHrs.endHr))
                }

            })

            return window.wage
        },

        calculateMonthlyWage: function (dataFrame) {
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

}

exports.Calculator = Calculator