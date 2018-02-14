/**
 * Created by guo_haipeng on 14/02/2018.
 */
"use strict";

const calc = require('./src/wage_calculator.js')
const utils = require('./src/utils.js')
const csvFilePath = 'data/Hours-201403.csv'

let c = new calc.Calculator()

utils.readCsv(csvFilePath)
    .then((df) => {

        const wages = c.calculateMonthlyWage(df)
        console.log(wages)

    }).catch((err) => {
        console.log('error, e=%s', err)
    })



//
// c.calculateWage(csvFilePath)
//     .then((wages) => {
//         console.log(wages)
//     }).catch((err) => {
//         console.log('error, e=%s', err)
//     })