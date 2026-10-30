'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const V=require('./kla-validators.js');
let n=0;
function check(name,condition){assert.ok(condition,name);n++}
function die(x,y){return {Corners:[[x-1,y-1],[x+1,y-1],[x+1,y+1],[x-1,y+1]]}}
function routeInput(m=1){return {InitialPosition:[0,0],InitialAngle:0,StageVelocity:10,StageAcceleration:m>=3?10:0,CameraVelocity:5,CameraAcceleration:m>=3?5:0,Dies:[die(10,0),die(20,0)],ForbiddenZones:[]}}
function routeOutput(m=1){const input=routeInput(m);const mov=s=>m>=3?V.route(input,{Path:[[0,0],[10,0],[20,0]],TotalTime:0},m):null;let d=m>=3?4:2;return {Path:[[0,0],[10,0],[20,0]],TotalTime:d}}
for(let m=1;m<=4;m++){
 let x=routeInput(m),y=routeOutput(m);let result=V.route(x,y,m);
 check('valid route m'+m,result.verdict==='PASS');
 check('missing die m'+m,V.route(x,{...y,Path:[[0,0],[10,0]]},m).verdict==='FAIL');
 check('duplicate visit m'+m,V.route(x,{...y,Path:[[0,0],[10,0],[20,0],[10,0]]},m).verdict==='FAIL');
 check('wrong start m'+m,V.route(x,{...y,Path:[[1,0],[10,0],[20,0]]},m).verdict==='FAIL');
 check('wrong time m'+m,V.route(x,{...y,TotalTime:y.TotalTime+1},m).verdict==='FAIL');
 check('invalid numeric m'+m,V.route(x,{...y,TotalTime:Infinity},m).verdict==='FAIL');
}
let z=routeInput(4);z.ForbiddenZones=[{BottomLeft:[12,-1],TopRight:[15,1]}];check('obstacle crossing',V.route(z,routeOutput(4),4).verdict==='FAIL');
let s={careareas:'0,0,10,0,10',metadata:'Main Field Size,Sub Field size\n12,10',};
let o={mainfields:'0,-1,11,-1,11',subfields:'0,0,10,0,10,0'};
check('valid sem',V.sem(s,o,1).verdict==='PASS');
check('sem missing coverage',V.sem(s,{...o,subfields:'0,0,9,0,10,0'},1).verdict==='FAIL');
check('sem overlap',V.sem(s,{...o,subfields:'0,0,10,0,10,0\n1,0,10,0,10,0'},1).verdict==='FAIL');
check('sem bad parent',V.sem(s,{...o,subfields:'0,0,10,0,10,999'},1).verdict==='FAIL');
check('sem bad size',V.sem(s,{...o,mainfields:'0,0,10,0,10'},1).verdict==='FAIL');
const input={steps:[{id:'S1',dependency:null},{id:'S2',dependency:['S1']}],machines:[{machine_id:'M1',step_id:'S1',cooldown_time:5,n:1},{machine_id:'M2',step_id:'S2',cooldown_time:0,n:1}],wafers:[{type:'W',quantity:1,processing_times:{S1:10,S2:20}}]};
const output={schedule:[{wafer_id:'W-1',step:'S1',machine:'M1',start_time:0,end_time:10},{wafer_id:'W-1',step:'S2',machine:'M2',start_time:10,end_time:30}]};
check('valid schedule',V.schedule(input,output,'1').verdict==='PASS');
check('schedule overlap',V.schedule(input,{schedule:[output.schedule[0],{...output.schedule[1],start_time:5,end_time:25}]},'1').verdict==='FAIL');
check('schedule missing',V.schedule(input,{schedule:[output.schedule[0]]},'1').verdict==='FAIL');
const driftInput={steps:[{id:'S1',parameters:{P1:[10,20]},dependency:null}],machines:[{machine_id:'M1',step_id:'S1',cooldown_time:5,n:1,initial_parameters:{P1:19},fluctuation:{P1:2}}],wafers:[{type:'W',quantity:2,processing_times:{S1:1}}]};
const jobs=[{wafer_id:'W-1',step:'S1',machine:'M1',start_time:0,end_time:1},{wafer_id:'W-2',step:'S1',machine:'M1',start_time:1,end_time:2}];
check('parameter drift detected',V.schedule(driftInput,{schedule:jobs},'3a').errors.some(x=>x.code==='PARAMETER_OUT_OF_RANGE'));
check('cooldown reset passes',V.schedule(driftInput,{schedule:[jobs[0],{...jobs[1],start_time:6,end_time:7}]},'3a').verdict==='PASS');
check('mapping m1 partial',V.mapping({WaferDiameter:100,N:2},{points:[[0,0],[10,0]]},1).verdict==='PARTIAL');
check('mapping outside wafer',V.mapping({WaferDiameter:100,N:1},{points:[[100,0]]},1).verdict==='FAIL');
const wfLog=['2022-02-09 11:30:00.000000;Flow Entry','2022-02-09 11:30:01.000000;Flow.Task Entry','2022-02-09 11:30:01.000000;Flow.Task Executing TimeFunction(1)','2022-02-09 11:30:02.000000;Flow.Task Exit','2022-02-09 11:30:02.000000;Flow Exit'].join(String.fromCharCode(10));
check('workflow basic partial',V.workflow({yaml:'Type: Flow'},{log:wfLog},'1A').verdict==='PARTIAL');
check('workflow unbalanced fails',V.workflow({yaml:'Type: Flow'},{log:wfLog.replace('Flow.Task Exit','Flow.Task Skipped')},'1A').verdict==='FAIL');
check('unsupported never PASS',V.validate('mapping',1,{},{}).verdict!=='PASS');
const site=process.argv[2];
if(site){
 const manifest=JSON.parse(fs.readFileSync(site+'/solutions/manifest.json','utf8'));
 for(let m of manifest.route.milestones)for(let c of m.cases){
  const x=JSON.parse(fs.readFileSync(site+'/'+c.input,'utf8'));
  const y=JSON.parse(fs.readFileSync(site+'/'+c.output,'utf8'));
  const r=V.route(x,y,m.number);
  check('published route m'+m.number+' case '+c.case+' '+JSON.stringify(r.errors.slice(0,2)),r.verdict==='PASS');
 }
}
console.log('Validator regression checks passed:',n);
