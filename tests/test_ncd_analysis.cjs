const test=require('node:test'), assert=require('node:assert/strict');
const analysis=require('../scripts/ncd-analysis.js');
test('month shifts cross year boundaries correctly',()=>{
 assert.equal(analysis.shiftMonth('2026-12',1),'2027-01');
 assert.equal(analysis.shiftMonth('2026-01',-12),'2025-01');
});
test('seasonal projection uses past matching months and preserves missingness',()=>{
 const series=[{month:'2025-02',value:32,count:3},{month:'2025-03',value:0,count:2},{month:'2026-02',value:99,count:4}];
 const result=analysis.project(series,'2026-01',3);
 assert.deepEqual(result.map(p=>p.value),[32,0,null]);
 assert.deepEqual(result.map(p=>p.month),['2026-02','2026-03','2026-04']);
 assert.equal(result[0].source,'2025-02');
 assert.equal(result[2].count,0);
});
test('projection never uses a source beyond its as-of date',()=>{
 const result=analysis.project([{month:'2026-02',value:99,count:1}],'2026-01',13);
 assert.equal(result[12].value,null);
});
test('regional means exclude unavailable scores and keep valid zeros',()=>{
 assert.equal(analysis.mean([0,null,40,NaN]),20);
 assert.equal(analysis.mean([null]),null);
});
