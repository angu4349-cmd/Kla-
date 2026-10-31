/* PS-integrated solutions: non-invasive companion to the original KLA app. */
(() => {
  'use strict';
  const ROOT_ID = 'kla-ps-solution-feature';
  const DATA_URL = 'solutions/manifest.json';
  const PROBLEMS = {
    sem: {name:'SEM Scan Layout Optimization', year:'2024', source:'https://github.com/AakashVelusamy/kla-unhack-mock-2024', note:'The public SEM sample passed independent geometric feasibility checks. Global optimality and official validator parity remain unverified.'},
    mapping: {name:'Wafer Mapping', year:'2024', source:'', note:'Problem statement and reference solution matching are pending.'},
    schedule: {name:'Wafer Processing Optimization', year:'2024', source:'https://github.com/livin-joseph/UnHack-2024', note:'All 14 public schedules passed the implemented feasibility, parameter and cooldown checks; optimality is not certified.'},
    route: {name:'Wafer Inspection Path Planning', year:'2025', source:'https://github.com/AakashVelusamy/kla-unhack-2025', note:'Independent reference solutions are available for all four milestones.'},
    workflow: {name:'Workflow & Defect Binning', year:'2022', source:'https://github.com/AakashVelusamy/kla-unhack-2022', note:'Complete workflow execution validation is pending.'}
  };
  const VALIDATOR_MILESTONES = {
    sem: Array.from({length:6},(_,i)=>({id:i+1,label:'Dataset '+(i+1)})),
    mapping: Array.from({length:5},(_,i)=>({id:i+1,label:'Milestone '+(i+1)})),
    schedule: ['0','1','2a','2b','3a','3b','3c','4a','4b','4c','5a','5b','6a','6b'].map(id=>({id,label:'Milestone '+id})),
    workflow: ['1A','1B','2A','2B','3A1'].map(id=>({id,label:'Milestone '+id})),
    route: [1,2,3,4].map(id=>({id,label:'Milestone '+id}))
  };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = {problem:null, milestone:1, caseNum:1, open:false, manifest:null, loading:false, codeOpen:false,validatorOpen:false,validatorMilestoneIndex:0};
  let schedulePending=false;
  function identify() {
    const hash=decodeURIComponent(location.hash.slice(1)).toLowerCase();
    if (!hash || /^(home|guide|about|settings|help|dashboard)$/.test(hash)) return null;
    const direct=hash.match(/(?:^|[\\/_=.?&-])(sem|mapping|schedule|route|workflow)(?=$|[\\/_=.?&-])/);
    if (direct) return direct[1];
    const numeric=hash.match(/(?:^|[\\/_=.?&-])(?:ps|problem|challenge)[-_/=]?(0?[1-5])(?:$|[\\/_=.?&-])/);
    if (numeric) return ['sem','mapping','schedule','route','workflow'][Number(numeric[1])-1];
    const h=document.querySelector('#main h1, #main h2, main h1, main h2');
    const title=(h?.textContent||'').toLowerCase();
    if (title.includes('scan layout')) return 'sem';
    if (title.includes('wafer mapping')) return 'mapping';
    if (title.includes('wafer processing')) return 'schedule';
    if (title.includes('inspection path')) return 'route';
    if (title.includes('defect binning')||title.includes('workflow framework')) return 'workflow';
    return null;
  }
  function activeMain() {
    const m=document.querySelector('#main') || document.querySelector('main');
    return m && m.isConnected ? m : null;
  }
  function link(path,label) {
    return '<a class="pssol-link" href="'+esc(path)+'" download>'+esc(label)+' <span aria-hidden="true">↓</span></a>';
  }
  function selectedCase() {
    const ms=state.manifest?.route?.milestones || [];
    return ms.find(m=>m.number===state.milestone)?.cases?.find(c=>c.case===state.caseNum) || null;
  }
  function validatorMilestone() {
    if(state.problem==='route')return state.milestone;
    return VALIDATOR_MILESTONES[state.problem]?.[state.validatorMilestoneIndex]?.id ?? 1;
  }
  function validatorMarkup() {
    const milestones=VALIDATOR_MILESTONES[state.problem]||[];
    let html='<section class="pssol-validator-section" aria-label="Custom milestone validator">';
    html+='<div class="pssol-validator-heading"><div><span class="pssol-label">CUSTOM MILESTONE VALIDATOR</span><h3>Test your own solution</h3><p>Run independent checks here on this problem statement page. Files stay on your device.</p></div>';
    html+='<button type="button" class="pssol-toggle pssol-validate-toggle" data-pssol="toggleValidator" aria-expanded="'+state.validatorOpen+'">'+(state.validatorOpen?'Hide validator −':'Open validator +')+'</button></div>';
    if(state.validatorOpen){
      if(state.problem!=='route'){
        html+='<div class="pssol-label">CHOOSE DATASET / MILESTONE</div><div class="pssol-tabs pssol-validator-milestones" role="group" aria-label="Validator milestone">';
        html+=milestones.map((m,i)=>'<button type="button" data-pssol="validatorMilestone" data-value="'+i+'" class="'+(i===state.validatorMilestoneIndex?'selected':'')+'" aria-pressed="'+(i===state.validatorMilestoneIndex)+'">'+esc(m.label)+'</button>').join('');
        html+='</div>';
      }else html+='<p class="pssol-muted">The selected route milestone above is used for validation. Change the milestone to test another set of rules.</p>';
      html+='<div class="pssol-howto"><strong>How to use:</strong> 1. Select the milestone. 2. Choose your input and solution output files. 3. Select <strong>Run custom validator</strong> to see errors, checks and a downloadable report.</div>';
      html+='<div id="pssol-validator-mount"></div>';
    }
    html+='</section>';
    return html;
  }
  function content() {
    const p=PROBLEMS[state.problem];
    if (!p) return '';
    const open=state.open;
    let body='<div class="pssol-header"><div><div class="pssol-eyebrow">REFERENCE MATERIAL · '+esc(p.year)+'</div><h2>Solutions &amp; custom validator</h2><p>View solutions, run milestone validators, and check your submission directly here.</p></div><button type="button" class="pssol-toggle" data-pssol="toggle" aria-expanded="'+open+'">'+(open?'Hide solutions −':'View solutions +')+'</button></div>';
    if (!open) return body.replace('</button></div>','</button><button type="button" class="pssol-quick-validate" data-pssol="quickValidator">Validate submission →</button></div>');
    body+='<div class="pssol-body"><div class="pssol-note">'+esc(p.note)+'</div>'; 
    if (state.problem !== 'route') {
      body+='<p class="pssol-muted">No independently validated downloadable solution has been published for this problem yet. Unverified code is not presented as correct.</p>';
      if (p.source) body+='<a class="pssol-link" target="_blank" rel="noopener noreferrer" href="'+esc(p.source)+'">Inspect candidate repository ↗</a>';
      body+='<a class="pssol-link" href="solutions.html">Open solutions library ↗</a>'+validatorMarkup()+'</div>';
      return body;
    }
    const milestones=state.manifest?.route?.milestones || [];
    if (!milestones.length) return body+'<p class="pssol-muted">Loading the solution manifest…</p>'+validatorMarkup()+'</div>';
    body+='<div class="pssol-label">CHOOSE MILESTONE</div><div class="pssol-tabs" role="group" aria-label="Solution milestone">';
    body+=milestones.map(m=>'<button type="button" data-pssol="milestone" data-value="'+m.number+'" class="'+(m.number===state.milestone?'selected':'')+'" aria-pressed="'+(m.number===state.milestone)+'">Milestone '+m.number+'</button>').join('');
    body+='</div>';
    const milestone=milestones.find(m=>m.number===state.milestone);
    const cases=milestone?.cases||[];
    if (!cases.length) return body+'<p class="pssol-muted">No validated outputs available for this milestone.</p>'+validatorMarkup()+'</div>';
    if (!cases.some(c=>c.case===state.caseNum)) state.caseNum=cases[0].case;
    body+='<div class="pssol-label">TEST CASE</div><div class="pssol-tabs pssol-cases" role="group" aria-label="Solution test case">';
    body+=cases.map(c=>'<button type="button" data-pssol="case" data-value="'+c.case+'" class="'+(c.case===state.caseNum?'selected':'')+'" aria-pressed="'+(c.case===state.caseNum)+'">Case '+c.case+'</button>').join('');
    body+='</div>';
    const c=selectedCase();
    if (c) {
      body+='<div class="pssol-case"><div class="pssol-case-top"><strong>Milestone '+state.milestone+' · Test case '+c.case+'</strong><span class="pssol-status">✓ Feasibility checked</span></div><div class="pssol-metrics"><span>Dies <strong>'+esc(c.dies)+'</strong></span><span>Total time <strong>'+Number(c.time).toFixed(6)+'</strong></span></div><p class="pssol-muted">Generated using the independent Python solver and checked for route feasibility. Global optimality and official acceptance are not claimed.</p><div class="pssol-actions">'+link(c.input,'Download input JSON')+link(c.output,'Download output JSON')+'<button type="button" class="pssol-link pssol-button" data-pssol="preview">Preview output</button></div><pre id="pssol-output" hidden aria-label="Output JSON preview"></pre></div>';
    }
    body+='<div class="pssol-code"><strong>Reference implementation</strong><p class="pssol-muted">Python route solver for Milestones 1–4. This is separate from the original third-party code.</p><div class="pssol-actions">'+link('solutions/route_solver.py','Download Python solution')+'<button type="button" class="pssol-link pssol-button" data-pssol="code">'+(state.codeOpen?'Hide code −':'Preview code +')+'</button><a class="pssol-link" href="solutions.html">Full solutions library ↗</a></div><pre id="pssol-code-preview" '+(state.codeOpen?'':'hidden')+' aria-label="Python solution code"></pre></div>'+validatorMarkup()+'</div>';
    return body;
  }
  async function loadManifest() {
    if (state.manifest || state.loading) return;
    state.loading=true;
    try {
      const res=await fetch(DATA_URL,{cache:'no-cache'});
      if (!res.ok) throw new Error('HTTP '+res.status);
      state.manifest=await res.json();
    } catch(e) {
      state.manifest={route:{milestones:[]}};
      const el=document.getElementById(ROOT_ID);
      if(el) el.dataset.error='Could not load solutions: '+e.message;
    } finally {state.loading=false;render();}
  }
  async function preview(url,targetId) {
    const target=document.getElementById(targetId);
    if(!target) return;
    target.hidden=false;
    target.textContent='Loading…';
    try {const r=await fetch(url);if(!r.ok)throw new Error('HTTP '+r.status);target.textContent=await r.text();}
    catch(e){target.textContent='Preview unavailable: '+e.message;}
  }
  function bind(root) {
    root.querySelectorAll('[data-pssol]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const kind=btn.dataset.pssol;
        if(kind==='toggle') {state.open=!state.open;state.codeOpen=false;render();}
        if(kind==='quickValidator'){state.open=true;state.validatorOpen=true;render();}
        if(kind==='toggleValidator'){state.validatorOpen=!state.validatorOpen;render();}
        if(kind==='validatorMilestone'){state.validatorMilestoneIndex=Number(btn.dataset.value);render();}
        if(kind==='milestone'){state.milestone=Number(btn.dataset.value);state.caseNum=1;state.codeOpen=false;render();}
        if(kind==='case'){state.caseNum=Number(btn.dataset.value);state.codeOpen=false;render();}
        if(kind==='preview'){const c=selectedCase();if(c)preview(c.output,'pssol-output');}
        if(kind==='code'){state.codeOpen=!state.codeOpen;render();if(state.codeOpen)preview('solutions/route_solver.py','pssol-code-preview');}
      });
    });
  }
  function pName(id){return PROBLEMS[id]?.name||id;}
  function render() {
    const problem=identify(), main=activeMain();
    const existing=document.getElementById(ROOT_ID);
    if(!problem||!main) {existing?.remove();return;}
    if(problem!==state.problem) {
      state.problem=problem;state.open=false;state.milestone=1;state.caseNum=1;state.codeOpen=false;state.validatorOpen=false;state.validatorMilestoneIndex=0;
    }
    // The original SPA replaces its own view; attach inside the problem statement, never the global navigation.
    let root=existing;
    if (!root || !main.contains(root)) {
      root=document.createElement('section');
      root.id=ROOT_ID;
      root.className='pssol';
      root.setAttribute('aria-label','Solutions for this problem statement');
      main.appendChild(root);
    }
    const next=content();
    if(root.dataset.html!==next){root.innerHTML=next;root.dataset.html=next;bind(root);}
    if(state.open&&state.validatorOpen&&window.KLAValidatorUI){
      const mount=root.querySelector('#pssol-validator-mount');
      if(mount)window.KLAValidatorUI.mount(mount,{problem:state.problem,milestone:validatorMilestone(),name:pName(state.problem),caseNum:state.caseNum,manifest:state.manifest});
    }
    if(state.open&&state.problem==='route'&&!state.manifest)loadManifest();
  }
  function schedule() {
    if(schedulePending)return;
    schedulePending=true;
    requestAnimationFrame(()=>{schedulePending=false;render();});
  }
  window.addEventListener('hashchange',schedule);
  document.addEventListener('click',event=>{
    if(event.target.closest('#'+ROOT_ID))return;
    // The main app may switch milestone and redraw without changing the URL.
    setTimeout(schedule,0);
  },true);
  const observer=new MutationObserver(records=>{
    if(records.some(r=>!r.target.closest?.('#'+ROOT_ID)))schedule();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
})();