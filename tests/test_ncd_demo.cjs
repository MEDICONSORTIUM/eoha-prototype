const test = require('node:test');
const assert = require('node:assert/strict');
const demo = require('../scripts/ncd-demo.js');
const sample = Array.from({length: 100}, (_,i) => i+1);
const manifest = {synthetic:true, temporal_support:'monthly', version:'test', references:{key:{Province:'Limpopo',month_number:1,PM25_ug_m3:sample,Max_Air_Temp_C:sample,Min_Air_Temp_C:sample}}};
const row = {Synthetic:'true',Temporal_Support:'monthly',Reference_Version:'test',Reference_Key:'key',Province:'Limpopo',Period_Start:'2026-01-01',Valid_Days:'31',Expected_Days:'31',Spatial_Coverage:'1',PM25_ug_m3:'82',Max_Air_Temp_C:'97',Min_Air_Temp_C:'3'};
test('percentiles count ties and preserve zero', () => {
 assert.equal(demo.percentile(2,[1,2,2,3]),.75);
 assert.equal(demo.percentile(0,sample),0);
 for (const v of ['',null,undefined,NaN,Infinity]) assert.equal(demo.percentile(v,sample),null);
 assert.equal(demo.percentile(2,[]),null);
});
test('known component examples and tail boundaries', () => {
 const scores=demo.scores(row,manifest);
 assert.equal(scores.pollution,82);
 assert.ok(Math.abs(scores.heat-70)<1e-9);
 assert.ok(Math.abs(scores.cold-70)<1e-9);
 assert.equal(demo.scores({...row,Max_Air_Temp_C:90,Min_Air_Temp_C:10},manifest).heat,0);
 assert.equal(demo.scores({...row,Min_Air_Temp_C:10},manifest).cold,0);
 assert.equal(demo.scores({...row,Max_Air_Temp_C:200},manifest).heat,100);
});
test('both demo years use the same calendar-month reference', () => {
 assert.deepEqual(demo.scores({...row,Period_Start:'2025-01-01'},manifest),demo.scores(row,manifest));
 for (const start of ['2024-01-01','2027-01-01','2025-13-01','2025-01-02','2025-02-01']) {
  assert.deepEqual(demo.scores({...row,Period_Start:start},manifest),{pollution:null,heat:null,cold:null});
 }
});
test('real, incomplete, wrong-location and incompatible records never score', () => {
 for (const edit of [{Synthetic:'false'},{Temporal_Support:'daily'},{Reference_Version:'other'},{Valid_Days:'30'},{Spatial_Coverage:'.9'},{Province:'Gauteng'},{Period_Start:'2026-02-01'}]) {
  assert.deepEqual(demo.scores({...row,...edit},manifest),{pollution:null,heat:null,cold:null});
 }
});
test('missing components stay unavailable without rescaling other components', () => {
 const scores=demo.scores({...row,PM25_ug_m3:''},manifest);
 assert.equal(scores.pollution,null);
 assert.ok(Math.abs(scores.heat-70)<1e-9);
 assert.equal(demo.scores({...row,PM25_ug_m3:-1},manifest).pollution,null);
 assert.deepEqual(demo.average([], 'heat', manifest),{value:null,count:0});
 assert.deepEqual(demo.average([row,{...row,PM25_ug_m3:''}], 'pollution', manifest),{value:82,count:1});
});

test('malaria-style exposure colours handle exact thresholds and unavailable values', () => {
 for (const score of [0, 24.999]) assert.deepEqual(demo.scoreBand(score), {label:'Low',color:'#34a853'});
 for (const score of [25, 49.999]) assert.deepEqual(demo.scoreBand(score), {label:'Moderate',color:'#f9bb06'});
 for (const score of [50, 100]) assert.deepEqual(demo.scoreBand(score), {label:'High',color:'#d93025'});
 for (const score of [null, undefined, '', '50', NaN, Infinity, -1, 101])
  assert.deepEqual(demo.scoreBand(score), {label:'Unavailable',color:'#94a3b8'});
});
