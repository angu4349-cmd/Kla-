'use strict';
const fs=require('node:fs'),path=require('node:path'),V=require('./kla-validators.js');
const [semDir,scheduleDir,workflowDir]=process.argv.slice(2);
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
try{
 const w=(p)=>fs.readFileSync(path.join(workflowDir,p),'utf8');
 const binInput={defects:w('Milestone3/Milestone3A_DataInput1.csv'),precedence:w('Milestone3/Milestone3A_PrecedenceFile1.txt'),rules:[500,501,502,503,504].map(n=>w('Milestone3/Milestone3A_BinningRule_'+n+'.csv'))};
 const binOutput={results:w('results/Milestone3A_DataOutput1.csv')};
 const r=V.binning(binInput,binOutput,'3A1');
 out.binning={verdict:r.verdict,errorCount:r.errors.length,errors:r.errors.slice(0,5),checks:r.checks};
 for(const [m,stem] of [['1A','M1A'],['1B','M1B'],['2A','M2A'],['2B','M2B']]){
   const result=V.workflow({yaml:w('Milestone'+m[0]+'/Milestone'+m+'.yaml')},{log:w('logs/'+stem+'_Workflow.txt')},m);
   (out.workflow||(out.workflow=[])).push({milestone:m,verdict:result.verdict,errors:result.errors.slice(0,3),errorCount:result.errors.length});
 }
}catch(e){out.workflowError=e.message}
console.log(JSON.stringify(out,null,2));
