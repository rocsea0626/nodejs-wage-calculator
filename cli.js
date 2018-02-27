/**
 * Created by guo_haipeng on 27/02/2018.
 */
const calc = require('./index.js')
const csvFilePath = 'data/Hours-201403.csv'

let conf = new calc.ConfigBuilder().setHourlyWage(4).setEveningCompensation(2).build()
let c = new calc.Calculator(conf)
calc.readCsv(csvFilePath)
    .then((df) => {

        const wages = c.calculateMonthlyWage(df)
        console.log(wages)

    }).catch((err) => {
    console.log('error, e=%s', err)
})
