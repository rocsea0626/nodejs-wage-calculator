/**
 * Created by guo_haipeng on 14/02/2018.
 */
"use strict";

const calc = require('./src/calculator.js')
const utils = require('./src/utils.js')
// const csvFilePath = 'data/Hours-201403.csv'

// let conf = new calc.ConfigBuilder().setHourlyWage(4).setEveningCompensation(2).build()
// let c = new calc.Calculator(conf)
// utils.readCsv(csvFilePath)
//     .then((df) => {
//
//         const wages = c.calculateMonthlyWage(df)
//         console.log(wages)
//
//     }).catch((err) => {
//         console.log('error, e=%s', err)
//     })
// const hoursDay = {date: '27.3.2014', startHrs: ['9:15', '12:45'], endHrs: ['10:15', '21:00']}
// const hoursDay = {date: '27.3.2014', startHrs: ['9:00'], endHrs: ['17:00']}
// let wage = c.calculateDailyWage(hoursDay)
// console.log(wage)

exports.readCsv = utils.readCsv
exports.Calculator = calc.Calculator
exports.ConfigBuilder = calc.ConfigBuilder


