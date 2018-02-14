/**
 * Created by guo_haipeng on 14/02/2018.
 */
"use strict";

const calc = require('./src/wage_calculator.js')
const csvFile = 'data/Hours-201403.csv'

let c = new calc.Calculator()
c.test()

c.readCsv(csvFile).then((data) => {
    console.log(data)
}).catch((err) => {
    console.log(err)
})