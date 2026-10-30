'use strict';
const fs=require('node:fs'),path=require('node:path'),V=require('./kla-validators.js');
const [semDir,scheduleDir]=process.argv.slice(2);
const out={sem:null,schedule:[]};
try{
 const base=path.join(semDir,'Dataset-0','Sample','Input and Output');
 const read=(p)=>fs.readFileSync(path.join(base,p),'utf8');
 const result=V.sem({careareas:read('CareAreas.csv'),metadata:read('metadata.csv')},{mainfields:read('mainfields.csv'),subfields:read('subfields.csv')},1);
 out.sem={verdict:result.verdict,errors:result.errors.slice(0,5),checks:result.checks};
}catch(e){out.sem={error:e.message}}
for(let name of ['Milestone0','Milestone1','Milestone2a','Milestone2b','Milestone3a','Milestone3b','Milestone3c','Milestone4a','Milestone4b','Milestone4c','Milestone5a','Milestone5b','Milestone6a','Milestone6b']){
 try{
 const dir=name.startsWith('Milestone6')?'Input/Extra':'Input';
 const input=JSON.parse(fs.readFileSync(path.join(scheduleDir,dir,name+'.json'),'utf8'));
 const output=JSON.parse(fs.readFileSync(path.join(scheduleDir,'Output',name+'.json'),'utf8'));
 const result=V.schedule(input,output,name);
 out.schedule.push({case:name,verdict:result.verdict,errors:result.errors.slice(0,5),errorCount:result.errors.length});
 }catch(e){out.schedule.push({case:name,error:e.message})}
}
console.log(JSON.stringify(out,null,2));
