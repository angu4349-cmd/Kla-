/* Local validator UI. Files are read in-browser; nothing is uploaded. */
(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={context:'',files:{},report:null,busy:false};
function fields(problem){
 if(problem==='sem')return [
  ['careareas','CareAreas.csv','text/csv'],['metadata','metadata.csv','text/csv'],['mainfields','mainfields.csv','text/csv'],['subfields','subfields.csv','text/csv']];
 if(problem==='route'||problem==='schedule'||problem==='mapping')return [['input','Input JSON','application/json'],['output','Output JSON','application/json']];
 if(problem==='workflow')return [['yaml','Workflow configuration YAML','text/yaml'],['log','Execution log TXT','text/plain']];
 return [];
}
function label(milestone,problem){return problem==='sem'?'Dataset '+milestone:problem==='route'?'Milestone '+milestone:problem==='schedule'?'Milestone '+milestone:'Problem'}
function summary(r){
 const good=r.verdict==='PASS',bad=r.verdict==='FAIL',cls=good?'passed':bad?'failed':'partial';
 let out='<div class="val-summary '+cls+'"><div><span class="val-overline">VALIDATION RESULT</span><h3>'+esc(r.verdict)+'</h3><p>'+esc(r.disclaimer)+'</p></div><span class="val-status-dot" aria-hidden="true"></span></div>';
 out+='<div class="val-checks">'+(r.checks||[]).map(c=>'<div class="val-check"><span class="'+(c.passed?'yes':'no')+'">'+(c.passed?'✓':'×')+'</span><div><strong>'+esc(c.name)+'</strong><small>'+esc(c.detail)+'</small></div></div>').join('')+'</div>';
 if(r.errors.length)out+='<div class="val-issues"><h4>Errors ('+r.errors.length+')</h4>'+r.errors.map(x=>'<div class="val-issue error"><strong>'+esc(x.code)+'</strong> '+esc(x.message)+(x.where?' <small>'+esc(x.where)+'</small>':'')+'</div>').join('')+'</div>';
 if(r.warnings.length)out+='<div class="val-issues"><h4>Limitations and warnings ('+r.warnings.length+')</h4>'+r.warnings.map(x=>'<div class="val-issue warning"><strong>'+esc(x.code)+'</strong> '+esc(x.message)+'</div>').join('')+'</div>';
 out+='<div class="val-actions"><button type="button" class="sol-action" id="validatorDownload">Download validation report ↓</button></div>';
 return out;
}
async function readFile(file){if(!file)throw Error('Required file is missing');if(file.size>20*1024*1024)throw Error(file.name+' exceeds 20 MB safety limit');return file.text();}
function context(rootEl,opts){return String(opts.problem)+'|'+String(opts.milestone)}
function mount(rootEl,opts){
 if(!rootEl)return;
 const key=context(rootEl,opts);
 if(rootEl.dataset.validatorKey===key)return;
 rootEl.dataset.validatorKey=key;state.context=key;state.files={};state.report=null;
 const f=fields(opts.problem);
 let html='<div class="sol-card val-workspace"><div class="sol-card-kicker">CUSTOM MILESTONE VALIDATOR</div><div class="val-top"><div><h3>Validate your submission</h3><p>Check your solution against independently implemented milestone rules. Your files stay on your device.</p></div><span class="val-local">LOCAL · NO UPLOAD</span></div>';
 if(!f.length){html+='<div class="sol-note">This problem has no sufficiently specified custom validator yet. A PASS cannot be issued until its complete rules and sample tests are established.</div><div class="val-actions"><a class="sol-action" href="index.html">Review original PS ↗</a></div></div>';rootEl.innerHTML=html;return;}
 html+='<div class="val-current"><span>SELECTED PROBLEM</span><strong>'+esc(opts.name||opts.problem)+' · '+esc(label(opts.milestone,opts.problem))+'</strong></div>';
 html+='<div class="val-upload-grid">'+f.map(([id,name,accept])=>'<label class="val-upload"><span class="val-upload-icon">↥</span><strong>'+esc(name)+'</strong><small id="fileLabel-'+id+'">Choose '+esc(name)+'</small><input type="file" data-validator-file="'+id+'" accept="'+(accept==='text/csv'?'.csv,text/csv':accept==='text/yaml'?'.yaml,.yml,text/plain':accept==='text/plain'?'.txt,text/plain':'.json,application/json')+'"></label>').join('')+'</div>';
 html+='<div class="val-actions"><button type="button" class="sol-primary" id="validatorRun">Run custom validator →</button>';
 if(opts.problem==='route')html+='<button type="button" class="sol-action" id="validatorExample">Test published input &amp; output</button>';
 html+='</div><div id="validatorResults" aria-live="polite"></div>';
 html+='<div class="sol-note"><strong>Validation scope:</strong> '+(opts.problem==='route'?'Route completeness, duplicate visits, stage/camera timing, and forbidden-zone collision checks. Feasibility is not a proof of global optimality.':opts.problem==='sem'?'CSV schema, unique IDs, field dimensions, mainfield containment, subfield overlaps, and complete care-area coverage. Optimality is not graded.':opts.problem==='schedule'?'Task completeness, durations, machine compatibility, overlaps, dependencies, process parameter drift and cooldown simulation.':opts.problem==='mapping'?'Milestone-aware coordinate, wafer boundary, count and radius checks. Exact reticle enumeration and official output format are not certified.':'Workflow log timestamps, event formatting, entry/exit pairing, and skip consistency. YAML execution semantics require a full replay.')+'</div></div>';
 rootEl.innerHTML=html;
 for(const input of rootEl.querySelectorAll('[data-validator-file]'))input.onchange=()=>{
   const id=input.dataset.validatorFile,file=input.files?.[0];state.files[id]=file;
   rootEl.querySelector('#fileLabel-'+id).textContent=file?file.name:'Choose file';
 };
 const output=rootEl.querySelector('#validatorResults');
 async function evaluate(loadExample=false){
   const run=rootEl.querySelector('#validatorRun');
   if(state.busy)return;state.busy=true;run.disabled=true;output.innerHTML='<div class="val-running">Checking milestone rules…</div>';
   try{
     let inp,out;
     if(loadExample){
       const manifest=opts.manifest;
       const milestone=manifest?.route?.milestones?.find(m=>m.number===Number(opts.milestone));
       const sample=milestone?.cases?.find(c=>c.case===Number(opts.caseNum))||milestone?.cases?.[0];
       if(!sample)throw Error('No published example for this milestone');
       const [a,b]=await Promise.all([fetch(sample.input),fetch(sample.output)]);
       if(!a.ok||!b.ok)throw Error('Published input/output file not accessible');
       inp=await a.json();out=await b.json();
     }else if(opts.problem==='sem'){
       const content={};for(const [id] of f)content[id]=await readFile(state.files[id]);
       inp={careareas:content.careareas,metadata:content.metadata};out={mainfields:content.mainfields,subfields:content.subfields};
     }else if(opts.problem==='workflow'){inp={yaml:await readFile(state.files.yaml)};out={log:await readFile(state.files.log)};}else{inp=JSON.parse(await readFile(state.files.input));out=JSON.parse(await readFile(state.files.output));}
     const report=root.KLAValidators.validate(opts.problem,opts.milestone,inp,out);
     state.report=report;output.innerHTML=summary(report);
     output.querySelector('#validatorDownload').onclick=()=>{
       const blob=new Blob([JSON.stringify({...report,generatedAt:new Date().toISOString()},null,2)],{type:'application/json'});
       const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='kla-'+opts.problem+'-'+opts.milestone+'-validation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
     };
   }catch(ex){state.report=null;output.innerHTML='<div class="val-issue error"><strong>Could not validate:</strong> '+esc(ex.message||ex)+'</div>'}
   finally{state.busy=false;run.disabled=false;}
 }
 rootEl.querySelector('#validatorRun').onclick=()=>evaluate(false);
 if(opts.problem==='route')rootEl.querySelector('#validatorExample').onclick=()=>evaluate(true);
}
root.KLAValidatorUI={mount};
})(typeof window!=='undefined'?window:globalThis);
