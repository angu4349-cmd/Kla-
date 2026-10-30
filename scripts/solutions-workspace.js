(() => {
'use strict';
const problems=[
 {id:'sem',num:'PS 01',year:'2024',name:'SEM Scan Layout Optimization',short:'SEM Scan Layout',topic:'Geometry & coverage',pdf:'data/sem-ProblemStatement.pdf',source:'https://github.com/AakashVelusamy/kla-unhack-mock-2024',milestones:['Dataset 1','Dataset 2','Dataset 3','Dataset 4','Dataset 5','Dataset 6'],desc:'Plan main fields and scan tiles that cover care areas with minimal repeated scanning.',input:'CareAreas.csv and metadata.csv',output:'mainfields.csv and subfields.csv',status:'Public SEM sample passed independent coverage, overlap and geometry checks; other datasets and official validator parity are pending.'},
 {id:'mapping',num:'PS 02',year:'2024',name:'Wafer Mapping',short:'Wafer Mapping',topic:'Coordinate mapping',pdf:'data/mapping-SW_Workshop_2024_ProblemStatement_Student_version_Final_PDF_12Jan.pdf',source:'',milestones:['Milestone 1 · Bare wafer','Milestone 2 · Patterned wafer','Milestone 3 · Asymmetric wafer','Milestone 4 · Radius locations','Milestone 5 · Valid locations'],desc:'Map wafer coordinates and satisfy the original workshop problem statement.',input:'Original problem datasets',output:'As specified in original PDF',status:'Reference implementation and statement identity still require verification.'},
 {id:'schedule',num:'PS 03',year:'2024',name:'Wafer Processing Optimization',short:'Wafer Processing',topic:'Scheduling & optimization',pdf:'data/schedule-SW_Workshop_2024_WaferProcessingOptimization.pdf',source:'https://github.com/livin-joseph/UnHack-2024',milestones:['Milestone 0','Milestone 1','Milestone 2a','Milestone 2b','Milestone 3a','Milestone 3b','Milestone 3c','Milestone 4a','Milestone 4b','Milestone 4c','Milestone 5a','Milestone 5b','Milestone 6a','Milestone 6b'],desc:'Schedule wafer processing steps across constrained machines and optimize completion time.',input:'Machines, wafers, steps and dependencies (JSON)',output:'Wafer schedule with machines and start/end times',status:'Some public schedules pass basic checks; cooldown and full rule verification remain incomplete.'},
 {id:'route',num:'PS 04',year:'2025',name:'Wafer Inspection Path Planning',short:'Inspection Path Planning',topic:'Routing & motion planning',pdf:'data/route-Software_Workshop_Presentation_2025_Day1.pdf',pdf2:'data/route-Software_Workshop_Presentation_2025_Day2.pdf',source:'https://github.com/AakashVelusamy/kla-unhack-2025',milestones:['Milestone 1','Milestone 2','Milestone 3','Milestone 4'],desc:'Plan an inspection route across die centers with stage movement, camera rotation, acceleration and forbidden-zone constraints.',input:'Milestone-specific input JSON',output:'Path and total inspection time (JSON)',status:'16 generated route outputs passed independent feasibility checks; global optimality not guaranteed.'},
 {id:'workflow',num:'PS 05',year:'2022',name:'Workflow Framework & Defect Binning',short:'Workflow & Defect Binning',topic:'Workflow engineering',pdf:'data/workflow-CY22 SW Workshop-Final.pdf',source:'https://github.com/AakashVelusamy/kla-unhack-2022',milestones:['Milestone 1A · Sequential','Milestone 1B · Concurrent','Milestone 2A · Conditions','Milestone 2B · Data passing'],desc:'Build a workflow framework and perform defect classification and binning.',input:'Workshop workflow datasets',output:'As specified in original PDF',status:'End-to-end workflow execution validation is pending.'}
];
const $=s=>document.querySelector(s);
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={id:'route',milestone:0,caseNum:1,tab:'overview',manifest:null,preview:null,previewType:null,previewLoading:false};
const url=new URL(location.href);
const q=url.searchParams.get('ps');
if(problems.some(p=>p.id===q))state.id=q;
if(location.hash==='#validator')state.tab='validator';
const msParam=Number(url.searchParams.get('milestone'));
if(Number.isInteger(msParam)&&msParam>0)state.milestone=msParam-1;
function active(){return problems.find(p=>p.id===state.id)||problems[3];}
function currentMilestone(){return state.id==='route'||state.id==='mapping'?state.milestone+1:state.id==='workflow'?['1A','1B','2A','2B'][state.milestone]:state.id==='schedule'?['0','1','2a','2b','3a','3b','3c','4a','4b','4c','5a','5b','6a','6b'][state.milestone]:state.milestone;}
function cases(){if(state.id!=='route')return [];return state.manifest?.route?.milestones?.find(m=>m.number===currentMilestone())?.cases||[];}
function selected(){return cases().find(c=>c.case===state.caseNum)||cases()[0]||null;}
function updateUrl(){const u=new URL(location.href);u.searchParams.set('ps',state.id);u.searchParams.set('milestone',String(state.milestone+1));history.replaceState(null,'',u);}
function selectProblem(id){if(!problems.some(p=>p.id===id))return;state.id=id;state.milestone=0;state.caseNum=1;state.tab='overview';state.preview=null;state.previewType=null;updateUrl();render();window.scrollTo({top:0,behavior:'smooth'});closeMenu();}
function selectMilestone(n){state.milestone=n;state.caseNum=1;state.preview=null;state.previewType=null;updateUrl();render();}
function selectTab(tab){state.tab=tab;state.preview=null;state.previewType=null;render();}
function closeMenu(){document.body.classList.remove('sol-menu-open');$('#navBackdrop').hidden=true;}
function menu(){const open=document.body.classList.toggle('sol-menu-open');$('#navBackdrop').hidden=!open;}
function nav(){
 $('#problemNav').innerHTML=problems.map(p=>'<button class="sol-problem-link '+(p.id===state.id?'active':'')+'" data-problem="'+p.id+'" aria-current="'+(p.id===state.id?'page':'false')+'"><span class="sol-ps-number">'+p.num+'</span><span class="sol-nav-name">'+escapeHTML(p.short)+'<small>'+p.year+' · '+escapeHTML(p.topic)+'</small></span></button>').join('');
}
function tabs(){
 const t=[['overview','Overview'],['statement','Problem statement'],['solution','Solution code'],['datasets','Input / Output'],['verification','Validation'],['validator','Custom validator']];
 return '<div class="sol-view-tabs" role="tablist" aria-label="Problem workspace views">'+t.map(([id,label])=>'<button role="tab" aria-selected="'+(id===state.tab)+'" class="'+(id===state.tab?'active':'')+'" data-tab="'+id+'">'+label+'</button>').join('')+'</div>';
}
function milestonePicker(p){
 return '<div class="sol-milestone-bar"><div class="sol-section-label">MILESTONES / DATASETS</div><div class="sol-milestone-scroll">'+p.milestones.map((m,i)=>'<button data-ms="'+i+'" class="sol-ms '+(i===state.milestone?'active':'')+'" aria-pressed="'+(i===state.milestone)+'">'+escapeHTML(m)+'</button>').join('')+'</div></div>';
}
function statusBadge(p){return p.id==='route'?'<span class="sol-badge good"><span class="sol-dot"></span> Feasibility checked</span>':'<span class="sol-badge pending"><span class="sol-dot"></span> Validation pending</span>';}
function link(url,label,download=false){return '<a class="sol-action '+(download?'sol-action-download':'')+'" href="'+escapeHTML(url)+'" '+(download?'download':'target="_blank" rel="noopener noreferrer"')+'>'+escapeHTML(label)+' '+(download?'↓':'↗')+'</a>';}
function problemLinks(p){return '<div class="sol-actions">'+link(p.pdf,'Original PS PDF')+(p.pdf2?link(p.pdf2,'Day 2 PDF'):'')+(p.source?link(p.source,'Public solution repository'):'')+'</div>';}
function overview(p){
 const c=selected();
 let html='<div class="sol-two-col"><section class="sol-card"><div class="sol-card-kicker">PROBLEM BRIEF</div><h3>'+escapeHTML(p.name)+'</h3><p>'+escapeHTML(p.desc)+'</p><div class="sol-meta-grid"><div><span>Year</span><strong>'+p.year+'</strong></div><div><span>Problem</span><strong>'+p.num+'</strong></div><div><span>Current milestone</span><strong>'+escapeHTML(p.milestones[state.milestone])+'</strong></div><div><span>Category</span><strong>'+escapeHTML(p.topic)+'</strong></div></div>'+problemLinks(p)+'</section><section class="sol-card sol-next-card"><div class="sol-card-kicker">REFERENCE STATUS</div>'+statusBadge(p)+'<p>'+escapeHTML(p.status)+'</p>'+(p.id==='route'?'<div class="sol-big-stat">'+cases().length+' <span>checked test cases in this milestone</span></div><button class="sol-primary" data-tab="solution">Open reference solution →</button>':'<button class="sol-primary" data-tab="verification">View verification status →</button>')+'</section></div>';
 html+='<section class="sol-card sol-workflow-card"><div class="sol-card-kicker">WORKFLOW</div><h3>From problem statement to solution</h3><div class="sol-steps"><button data-tab="statement"><span>01</span><strong>Read the PS</strong><small>Original PDF and requirements</small></button><button data-tab="datasets"><span>02</span><strong>Inspect inputs</strong><small>Test case and output format</small></button><button data-tab="solution"><span>03</span><strong>Review code</strong><small>Reference implementation</small></button><button data-tab="verification"><span>04</span><strong>Validate output</strong><small>Independent feasibility results</small></button></div></section>';
 return html;
}
function statement(p){
 return '<section class="sol-card"><div class="sol-card-head"><div><div class="sol-card-kicker">ORIGINAL WORKSHOP MATERIAL</div><h3>Problem statement</h3><p>Review the original PDF alongside the solution. The source document is unchanged.</p></div>'+link(p.pdf,'Download / open PDF')+'</div><div class="sol-pdf-wrap"><iframe title="Original problem statement" loading="lazy" src="'+escapeHTML(p.pdf)+'#toolbar=1"></iframe></div>'+(p.pdf2?'<div class="sol-actions">'+link(p.pdf2,'Open Day 2 problem statement')+'</div>':'')+'</section>';
}
function casePicker(){
 const c=cases();
 if(!c.length)return '';
 if(!c.some(x=>x.case===state.caseNum))state.caseNum=c[0].case;
 return '<div class="sol-case-select"><span class="sol-section-label">TEST CASE</span><div class="sol-case-buttons">'+c.map(x=>'<button data-case="'+x.case+'" class="'+(x.case===state.caseNum?'active':'')+'">Case '+x.case+'</button>').join('')+'</div></div>';
}
function solution(p){
 if(p.id!=='route')return unavailable(p,'Reference solution not yet approved','A public candidate may exist, but the original problem requirements and complete outputs have not been independently confirmed.');
 return '<section class="sol-card"><div class="sol-card-head"><div><div class="sol-card-kicker">PYTHON REFERENCE IMPLEMENTATION</div><h3>Inspection path solver</h3><p>Independent implementation supporting Milestones 1–4. The original public repository is credited separately.</p></div><span class="sol-badge good">Available</span></div><div class="sol-actions">'+link('solutions/route_solver.py','Download solution.py',true)+link(p.source,'Original public code')+'<button class="sol-action" data-preview="code">View Python code ↗</button></div><div class="sol-note">This solver produces independently checked feasible routes. Its results are not guaranteed globally optimal or officially accepted by KLA.</div>'+previewPanel('code')+'</section><section class="sol-card"><div class="sol-card-kicker">RUN WITH PROVIDED INPUTS</div><h3>Reference outputs</h3>'+casePicker()+caseSummary()+'</section>';
}
function unavailable(p,title,detail){return '<section class="sol-card sol-empty"><div class="sol-empty-icon">⌁</div><div class="sol-card-kicker">NOT YET VERIFIED</div><h3>'+escapeHTML(title)+'</h3><p>'+escapeHTML(detail)+'</p><div class="sol-note">'+escapeHTML(p.status)+'</div><div class="sol-actions">'+(p.source?link(p.source,'Inspect candidate source'):'')+link(p.pdf,'Original problem statement')+'</div></section>';}
function caseSummary(){
 const c=selected();
 if(!c)return '<p class="sol-muted">No checked output is available for this milestone.</p>';
 return '<div class="sol-case-summary"><div><span>Input dies</span><strong>'+escapeHTML(c.dies)+'</strong></div><div><span>Total time</span><strong>'+Number(c.time).toFixed(6)+'</strong></div><div><span>Result</span><strong class="sol-positive">Feasible</strong></div></div><div class="sol-actions">'+link(c.input,'Download input.json',true)+link(c.output,'Download output.json',true)+'<button class="sol-action" data-preview="output">Preview output ↗</button></div>'+previewPanel('output');
}
function previewPanel(type){
 return '<div class="sol-preview" id="solPreview" '+(state.previewType===type?'':'hidden')+'><div class="sol-preview-head"><span>'+(type==='code'?'solution.py':'output.json')+'</span><button data-close-preview aria-label="Close preview">×</button></div><pre id="solPreviewText">'+(state.previewType===type?escapeHTML(state.preview||'Loading…'):'')+'</pre></div>';
}
function datasets(p){
 if(p.id!=='route')return unavailable(p,'Dataset catalog is in the PS tab','The complete input/output mapping for this problem has not yet been verified for publication. Use the original problem tab for source datasets.');
 return '<section class="sol-card"><div class="sol-card-kicker">INPUT / OUTPUT DATASETS</div><h3>'+escapeHTML(p.milestones[state.milestone])+' · Test cases</h3><p>Download the original input and independently generated output for each case.</p>'+casePicker()+caseSummary()+'</section><section class="sol-card"><div class="sol-card-kicker">FORMAT</div><div class="sol-format-grid"><div><h4>Input JSON</h4><p>Die corners, initial stage position and milestone-specific motion constraints.</p></div><div><h4>Output JSON</h4><p>Inspection Path coordinates and TotalTime for the route.</p></div></div></section>';
}
function verification(p){
 if(p.id!=='route')return unavailable(p,'Full verification pending','The available candidate solutions have not passed all required checks. No unverified output is marked correct.');
 const c=cases();
 return '<section class="sol-card"><div class="sol-card-kicker">INDEPENDENT VALIDATION</div><div class="sol-card-head"><div><h3>Validation results</h3><p>Results generated during the production build from original test case inputs.</p></div><span class="sol-badge good">Feasibility checks passed</span></div><div class="sol-check-grid"><div><strong>'+c.length+'</strong><span>Published cases</span></div><div><strong>'+c.length+'</strong><span>Feasible outputs</span></div><div><strong>—</strong><span>Official acceptance</span></div></div><div class="sol-note"><strong>Verification scope:</strong> all die centers are visited and route feasibility is checked against milestone constraints. This does not prove global optimality, and the official KLA validator has not approved these outputs.</div><div class="sol-case-table"><div class="sol-case-row sol-case-heading"><span>TEST CASE</span><span>TIME</span><span>STATUS</span><span>OUTPUT</span></div>'+c.map(x=>'<div class="sol-case-row"><span>Case '+x.case+'</span><span>'+Number(x.time).toFixed(6)+'</span><span class="sol-positive">✓ Feasible</span><span>'+link(x.output,'JSON',true)+'</span></div>').join('')+'</div><div class="sol-actions">'+link('solutions/manifest.json','Download audit manifest',true)+'</div></section>';
}
function validator(p){return '<div id="validatorMount"></div>';}
function render(){
 const p=active();
 nav();
 const total=state.manifest?.summary?.published?.length;
 $('#verifiedCount').textContent=Number.isInteger(total)?total:'—';
 $('#workspace').innerHTML='<div class="sol-problem-heading"><div><div class="sol-kicker">'+p.num+' <span>/</span> '+p.year+' <span>/</span> '+escapeHTML(p.topic)+'</div><h2>'+escapeHTML(p.name)+'</h2><p>'+escapeHTML(p.desc)+'</p></div>'+statusBadge(p)+'</div>'+milestonePicker(p)+tabs()+'<div class="sol-tab-content" role="tabpanel">'+({overview:overview,statement,solution,datasets,verification,validator}[state.tab]||overview)(p)+'</div>';
 if(state.tab==='validator'&&window.KLAValidatorUI)window.KLAValidatorUI.mount($('#validatorMount'),{problem:p.id,milestone:currentMilestone(),name:p.name,caseNum:state.caseNum,manifest:state.manifest});
 document.querySelectorAll('[data-problem]').forEach(b=>b.onclick=()=>selectProblem(b.dataset.problem));
 document.querySelectorAll('[data-ms]').forEach(b=>b.onclick=()=>selectMilestone(Number(b.dataset.ms)));
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>selectTab(b.dataset.tab));
 document.querySelectorAll('[data-case]').forEach(b=>b.onclick=()=>{state.caseNum=Number(b.dataset.case);state.preview=null;state.previewType=null;render();});
 document.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>showPreview(b.dataset.preview));
 document.querySelectorAll('[data-close-preview]').forEach(b=>b.onclick=()=>{state.preview=null;state.previewType=null;render();});
}
async function showPreview(type){
 const c=selected();
 const path=type==='code'?'solutions/route_solver.py':c?.output;
 if(!path)return;
 state.previewType=type;state.preview='Loading…';render();
 try{const res=await fetch(path);if(!res.ok)throw Error('HTTP '+res.status);state.preview=await res.text();}
 catch(err){state.preview='Preview unavailable: '+err.message;}
 if(state.previewType===type){const el=$('#solPreviewText');if(el)el.textContent=state.preview;}
}
$('#menuToggle').addEventListener('click',menu);
$('#navBackdrop').addEventListener('click',closeMenu);
window.addEventListener('popstate',()=>{const u=new URL(location.href);if(problems.some(p=>p.id===u.searchParams.get('ps')))state.id=u.searchParams.get('ps');render();});
fetch('solutions/manifest.json').then(r=>{if(!r.ok)throw Error('Manifest unavailable');return r.json()}).then(data=>{state.manifest=data;render()}).catch(()=>render());
render();
})();