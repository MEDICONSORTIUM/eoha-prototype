const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../scripts/ncd-data.js');
const rows = [
 {Month:'Jan 2026', Province:'Limpopo', Municipali:'A', WardID:'001', Air_Temp_C:'0', LST_Surface_C:'20', Population_Density_Per_KM2:'10'},
 {Month:'Jan 2026', Province:'Gauteng', Municipali:'B', WardID:'002', Air_Temp_C:'20', LST_Surface_C:'', Population_Density_Per_KM2:'-1'}
];
test('missing and nonfinite numbers stay null; zero is valid', () => {
 for (const value of ['', ' ', null, undefined, 'NaN', Infinity]) assert.equal(data.number(value), null);
 assert.equal(data.number('0'), 0);
});
test('country, period and ward selection preserve string identifiers', () => {
 assert.equal(data.filter(rows,{country:'South Africa',month:'Jan 2026',province:'Limpopo',municipality:'A',ward:'001'}).length,1);
 assert.equal(data.filter(rows,{country:'Botswana',month:'Jan 2026'}).length,0);
 assert.equal(data.filter(rows,{country:'South Africa',month:'Feb 2026'}).length,0);
});
test('each measurement uses its valid-value denominator', () => {
 assert.deepEqual(data.summarize(rows),{Air_Temp_C:{value:10,count:2},LST_Surface_C:{value:20,count:1},Population_Density_Per_KM2:{value:10,count:1}});
});
test('empty regions produce unavailable measurements', () => {
 assert.equal(data.summarize([]).Air_Temp_C.value,null);
});
