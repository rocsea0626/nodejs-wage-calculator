/**
 * Created by guo_haipeng on 15/02/2018.
 */
const assert = require('assert');
const config = require('../src/config.js')
const utils = require('../src/utils.js')
const calc = require('../src/wage_calculator.js')

// describe('Array', function () {
//     describe('#indexOf()', function () {
//         it('should return -1 when the value is not present', function () {
//             assert.equal(-1, [1, 2, 3].indexOf(5));
//             assert.equal(-1, [1, 2, 3].indexOf(0));
//         });
//     });
// });


const hourTypes = {
    R: 'regular hours',
    E1: 'evening hours before 6:00',
    E2: 'evening hours after 18:00',
    OR: 'overtime regular hours',
    OE1: 'overtime evening hours',
    OE2: 'overtime evening hours',
    fromTo: function (ht1, ht2) {
        return hourTypes[ht1] + ' -> ' + hourTypes[ht2]
    }
}

describe('Daily wage test, 1 record per day', function () {

    let c = new calc.Calculator()

    describe('Working hours do not span across regular/evening hours', function () {
        it('test R -> R', function () {
            const hoursDay = {date: '27.3.2014', startHrs: ['9:00'], endHrs: ['17:00']}
            const wage = c.calculateDailyWage(hoursDay)

            assert.equal(30, wage);
        });
        it('test E1 -> E1', () => {
            "use strict";
            const hoursDay = {date: '27.3.2014', startHrs: ['1:00'], endHrs: ['5:30']}
            const wage = c.calculateDailyWage(hoursDay)
            assert.equal(22.05, wage);
        });

        it('test E2 -> E2', () => {
            "use strict";
            const hoursDay = {date: '27.3.2014', startHrs: ['18:15'], endHrs: ['1:30']}
            const wage = c.calculateDailyWage(hoursDay)
            assert.equal('35.53', utils.toDecimal2(wage));
        });
    });

    describe('Working hours span across regular & evening hours', function () {
        it('test R -> E2', () => {
            "use strict";
            const hoursDay = {date: '27.3.2014', startHrs: ['15:00'], endHrs: ['22:00']}
            const wage = c.calculateDailyWage(hoursDay)
            assert.equal(30.85, wage);

        });
        it('test E1 -> R', () => {
            "use strict";
            const hoursDay = {date: '27.3.2014', startHrs: ['1:30'], endHrs: ['9:30']}
            const wage = c.calculateDailyWage(hoursDay)
            assert.equal(35.175, wage);
        });

        it('test E2 -> R', () => {
            "use strict";
            const hoursDay = {date: '27.3.2014', startHrs: ['23:45'], endHrs: ['7:30']}
            const wage = c.calculateDailyWage(hoursDay)
            assert.equal(36.25, wage);
        });
    });

    describe('Overtime', ()=>{

        it('test R -> OR', function () {
            const hoursDay = {date: '27.3.2014', startHrs: ['6:00'], endHrs: ['16:00']}
            const wage = c.calculateDailyWage(hoursDay)
            assert.equal(39.375, wage);
        });

        it('test E2 -> OE2', function () {
            const hoursDay = {date: '27.3.2014', startHrs: ['19:15'], endHrs: ['4:00']}
            const wage = c.calculateDailyWage(hoursDay)
            assert.equal(43.79375, wage);
        });

        it('test R -> OE2', function () {
            const hoursDay = {date: '27.3.2014', startHrs: ['10:00'], endHrs: ['19:00']}
            const wage = c.calculateDailyWage(hoursDay)
            assert.equal(36.125, wage);
        });

        it('test E1 -> OR', function () {
            const hoursDay = {date: '27.3.2014', startHrs: ['22:00'], endHrs: ['6.45']}
            const wage = c.calculateDailyWage(hoursDay)
            assert.equal(42.715625, wage);
        });

        it('test E1 -> OR, 1.5X overtime rate', function () {
            const hoursDay = {date: '27.3.2014', startHrs: ['22:00'], endHrs: ['10:00']}
            const wage = c.calculateDailyWage(hoursDay)
            assert.equal(59.825, wage);
        });

        it('test E1 -> OR, 2X overtime rate', function () {
            const hoursDay = {date: '27.3.2014', startHrs: ['22:00'], endHrs: ['12:00']}
            const wage = c.calculateDailyWage(hoursDay)
            assert.equal(74.825, wage);
        });

        it('test R -> OR -> OE1', function () {
            const hoursDay = {date: '27.3.2014', startHrs: ['9:00'], endHrs: ['19:00']}
            const wage = c.calculateDailyWage(hoursDay)
            assert.equal(40.8125, wage);
        });

        it('test R -> OR -> OE1 1.5X overtime rate', function () {
            const hoursDay = {date: '27.3.2014', startHrs: ['9:00'], endHrs: ['20:00']}
            const wage = c.calculateDailyWage(hoursDay)
            assert.equal(48.1625, wage);
        });
    })

});

describe('Daily wage test, 2 records per day', () => {

})
