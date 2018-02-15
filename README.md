###  Table Of Contents
+ [Instruction](#intro)
+ [Installation](#install)
+ [Usage](#use)


### Instruction
`guo-wage-calculator` is a NodeJS tool to calculate each person's monthly from a given .csv file
+ output
```
{
    month: '03.2014',
    wages:
        [{ name: 'Janet Java', wage: '707.49' },
          { name: 'Scott Scala', wage: '659.35' },
          { name: 'Larry Lolcode', wage: '425.58' }]
}
```
+ data fields in a .csv file
```
Person Name, Person ID, Date, Start, End

Scott Scala, 2 ,2.3.2014, 6:00, 14:00
Janet Java, 1, 3.3.2014, 9:30, 17:00
Scott Scala, 2 ,3.3.2014, 8:15, 16:00
```

### Installation
use npm:
```
npm install guo-wage-calculator --save
```

### Usage

+ calculate monthly wage
```
const calc = require('guo-wage-calculator')
const csvFilePath = 'data/Hours-201403.csv'

const c = new calc.Calculator()
calc.readCsv(csvFilePath)
    .then((df) => {

        const wages = c.calculateMonthlyWage(df)
        console.log(wages)

    }).catch((err) => {
        console.log('error, e=%s', err)
    })
```

+ calculate a daily wage
```
const calc = require('guo-wage-calculator')
const c = new calc.Calculator()

const hoursDay = {date: '27.3.2014', startHrs: ['9:15', '12:45'], endHrs: ['10:15', '21:00']}
const wage = c1.calculateDailyWage(hoursDay)
console.log(wage)

```

+ config a calculator
```
const calc = require('guo-wage-calculator')
const conf = new calc.ConfigBuilder().setHourlyWage(4).setEveningCompensation(2).build()
if(conf){
    const c = new calc.Calculator(conf)
}

```