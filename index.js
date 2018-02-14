/**
 * Created by guo_haipeng on 14/02/2018.
 */
"use strict";

const calc = require('./src/wage_calculator.js')
const csvFilePath = 'data/Hours-201403.csv'

let c = new calc.Calculator()
c.calculateWage(csvFilePath)
    .then((wages) => {
        console.log(wages)
    }).catch((err) => {
        console.log('error, e=%s', err)
    })