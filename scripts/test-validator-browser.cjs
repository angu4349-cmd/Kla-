'use strict';
// Browser DOM smoke test using jsdom. Exercises the real PS-page loader and
// custom upload flow; all input files are in memory and never uploaded.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const site=process.argv[2]||'build/site';
const src=n=>fs.readFileSync(site+'/'+n,'utf8');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const manifest=JSON.parse(src('solutions/manifest.json'));
const fixtures={
  sem: {
    careareas:'0,0,10,0,10',
    metadata:'Main Field Size,Sub Field size\n12,10',
    mainfields:'0,-1,11,-1,11',
    subfields:'0,0,10,0,10,0'
  },
  mapping:{
    input:JSON.stringify({WaferDiameter:100,N:2}),
    output:JSON.stringify({points:[[0,0],[10,0]]})
  },
  schedule:{
    input:JSON.stringify({steps:[{id:'S1',dependency:null}],machines:[{machine_id:'M1',step_id:'S1',cooldown_time:1,n:1}],wafers:[{type:'W',quantity:1,processing_times:{S1:2}}]}),
    output:JSON.stringify({schedule:[{wafer_id:'W-1',step:'S1',machine:'M1',start_time:0,end_time:2}]})
  },
  route:{
    input:JSON.stringify({InitialPosition:[0,0],InitialAngle:0,StageVelocity:10,StageAcceleration:0,CameraVelocity:5,CameraAcceleration:0,Dies:[{Corners:[[9,-1],[11,-1],[11,1],[9,1]]},{Corners:[[19,-1],[21,-1],[21,1],[19,1]]}]}),
    output:JSON.stringify({TotalTime:2,Path:[[0,0],[10,0],[20,0]]})
  },
  workflow:{
    yaml:'Flow:\n  Type: Flow\n  Execution: Sequential',
    log:'2022-02-09 11:30:00.000000;Flow Entry\n2022-02-09 11:30:01.000000;Flow.Task Entry\n2022-02-09 11:30:01.000000;Flow.Task Executing TimeFunction(1)\n2022-02-09 11:30:02.000000;Flow.Task Exit\n2022-02-09 11:30:02.000000;Flow Exit'
  }
};
function newPage(html,url) {
 const dom=new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true});
 dom.window.fetch=async path=>{
   if(path==='solutions/manifest.json')return {ok:true,json:async()=>manifest};
   throw Error('Network disabled for browser test: '+path);
 };
 dom.window.scrollTo=()=>{};
 dom.window.requestAnimationFrame=callback=>{queueMicrotask(()=>{if(!dom.window.__closed)callback(Date.now())});return 1};
 for(let file of ['kla-validators.js','validator-ui.js','ps_solutions.js'])dom.window.eval(src(file));
 return dom;
}
function upload(window,root,values){
 for(const [id,value] of Object.entries(values)){
   const field=root.querySelector('[data-validator-file="'+id+'"]');
   assert.ok(field,'Missing '+id+' upload control');
   const file={name:id,size:value.length,text:async()=>value};
   Object.defineProperty(field,'files',{configurable:true,value:[file]});
   field.dispatchEvent(new window.Event('change',{bubbles:true}));
 }
}
async function validate(root,window,values,expected){
 upload(window,root,values);
 const run=root.querySelector('#validatorRun');
 assert.ok(run,'Missing run validator button');
 run.click();
 for(let i=0;i<30;i++){
   if(root.querySelector('.val-summary'))break;
   await pause(20);
 }
 const label=root.querySelector('.val-summary h3')?.textContent;
 assert.equal(label,expected,'Unexpected validator result '+(root.textContent||root.body?.textContent||'').slice(-500));
 assert.ok(root.querySelector('#validatorDownload'),'Missing report export button');
}
async function main(){
 const html=src('index.html');
 assert.ok(html.includes('kla-validators.js'),'Original PS missing validator engine');
 assert.ok(html.includes('validator-ui.js'),'Original PS missing upload UI');
 let counter=0;
 for(const id of ['sem','mapping','schedule','route','workflow']){
  const dom=newPage('<!doctype html><html><head></head><body><main id="main"><h1>'+id+'</h1></main></body></html>','https://example.test/index.html#'+id);
  const w=dom.window;
  await pause(35);
  const quick=w.document.querySelector('[data-pssol="quickValidator"]');
  assert.ok(quick,'Missing PS quick validator for '+id);
  quick.click();
  await pause(id==='route'?60:35);
  assert.ok(w.document.querySelector('#pssol-validator-mount'),id+' has no inline mount');
  const mount=w.document.querySelector('#pssol-validator-mount');
  assert.ok(mount.querySelector('#validatorRun'),id+' has no run button');
  await validate(mount,w,fixtures[id],id==='sem'||id==='schedule'||id==='route'?'PASS':'PARTIAL');
  counter++;
  w.__closed=true;
  w.close();
 }
 const solutionPage=src('solutions.html');
 assert.ok(solutionPage.includes('validator-ui.js'));
 const sol=new JSDOM(solutionPage,{url:'https://example.test/solutions.html?ps=sem&milestone=1#validator',runScripts:'outside-only',pretendToBeVisual:true});
 sol.window.fetch=async path=>path==='solutions/manifest.json'?{ok:true,json:async()=>manifest}:{ok:false};
 sol.window.scrollTo=()=>{};
 for(const file of ['kla-validators.js','validator-ui.js','solutions-workspace.js'])sol.window.eval(src(file));
 await pause(50);
 assert.ok(sol.window.document.querySelector('#validatorRun'),'Solutions page validator missing');
 await validate(sol.window.document,sol.window,fixtures.sem,'PASS');
 counter++;
 sol.window.close();
 console.log('Browser DOM validator E2E smoke tests passed:',counter,'page flows');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
