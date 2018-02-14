/**
 * Created by guo_haipeng on 14/02/2018.
 */
"use strict";

const calc = require('./src/wage_calculator.js')
const utils = require('./src/utils.js')
const csvFilePath = 'data/Hours-201403.csv'

let c = new calc.Calculator()

// utils.readCsv(csvFilePath)
//     .then((df) => {
//
//         const wages = c.calculateMonthlyWage(df)
//         console.log(wages)
//
//     }).catch((err) => {
//         console.log('error, e=%s', err)
//     })
const hoursDay = {date: '27.3.2014', startHrs: ['9:00'], endHrs: ['20:00']}

c.calculateDailyWage(hoursDay)