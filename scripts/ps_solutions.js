/* PS-integrated solutions: non-invasive companion to the original KLA app. */
(() => {
  'use strict';
  const ROOT_ID = 'kla-ps-solution-feature';
  const DATA_URL = 'solutions/manifest.json';
  const PROBLEMS = {
    sem: {name:'SEM Scan Layout Optimization', year:'2024', source:'https://github.com/AakashVelusamy/kla-unhack-mock-2024', note:'Independent solution validation is pending.'},
    mapping: {name:'Wafer Mapping', year:'2024', source:'', note:'Problem statement and reference solution matching are pending.'},
    schedule: {name:'Wafer Processing Optimization', year:'2024', source:'https://github.com/livin-joseph/UnHack-2024', note:'Published schedules have not passed every required machine and cooldown check.'},
    route: {name:'Wafer Inspection Path Planning', year:'2025', source:'https://github.com/AakashVelusamy/kla-unhack-2025', note:'Independent reference solutions are available for all four milestones.'},
    workflow: {name:'Workflow & Defect Binning', year:'2022', source:'https://github.com/AakashVelusamy/kla-unhack-2022', note:'Complete workflow execution validation is pending.'}
  };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = {problem:null, milestone:1, caseNum:1, open:false, manifest:null, loading:false, codeOpen:false};
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
  function content() {
    const p=PROBLEMS[state.problem];
    if (!p) return '';
    const open=state.open;
    let body='<div class="pssol-header"><div><div class="pssol-eyebrow">REFERENCE MATERIAL · '+esc(p.year)+'</div><h2>Solution &amp; validation</h2><p>View reference code and test-case results for this problem statement.</p></div><button type="button" class="pssol-toggle" data-pssol="toggle" aria-expanded="'+open+'">'+(open?'Hide solutions −':'View solutions +')+'</button></div>';
    if (!open) return body;
    body+='<div class="pssol-body"><div class="pssol-note">'+esc(p.note)+'</div>';
    if (state.problem !== 'route') {
      body+='<p class="pssol-muted">No independently validated downloadable solution has been published for this problem yet. Unverified code is not presented as correct.</p>';
      if (p.source) body+='<a class="pssol-link" target="_blank" rel="noopener noreferrer" href="'+esc(p.source)+'">Inspect candidate repository ↗</a>';
      body+='<a class="pssol-link" href="solutions.html">Open solutions library ↗</a></div>';
      return body;
    }
    const milestones=state.manifest?.route?.milestones || [];
    if (!milestones.length) return body+'<p class="pssol-muted">Loading the solution manifest…</p></div>';
    body+='<div class="pssol-label">CHOOSE MILESTONE</div><div class="pssol-tabs" role="group" aria-label="Solution milestone">';
    body+=milestones.map(m=>'<button type="button" data-pssol="milestone" data-value="'+m.number+'" class="'+(m.number===state.milestone?'selected':'')+'" aria-pressed="'+(m.number===state.milestone)+'">Milestone '+m.number+'</button>').join('');
    body+='</div>';
    const milestone=milestones.find(m=>m.number===state.milestone);
    const cases=milestone?.cases||[];
    if (!cases.length) return body+'<p class="pssol-muted">No validated outputs available for this milestone.</p></div>';
    if (!cases.some(c=>c.case===state.caseNum)) state.caseNum=cases[0].case;
    body+='<div class="pssol-label">TEST CASE</div><div class="pssol-tabs pssol-cases" role="group" aria-label="Solution test case">';
    body+=cases.map(c=>'<button type="button" data-pssol="case" data-value="'+c.case+'" class="'+(c.case===state.caseNum?'selected':'')+'" aria-pressed="'+(c.case===state.caseNum)+'">Case '+c.case+'</button>').join('');
    body+='</div>';
    const c=selectedCase();
    if (c) {
      body+='<div class="pssol-case"><div class="pssol-case-top"><strong>Milestone '+state.milestone+' · Test case '+c.case+'</strong><span class="pssol-status">✓ Feasibility checked</span></div><div class="pssol-metrics"><span>Dies <strong>'+esc(c.dies)+'</strong></span><span>Total time <strong>'+Number(c.time).toFixed(6)+'</strong></span></div><p class="pssol-muted">Generated using the independent Python solver and checked for route feasibility. Global optimality and official acceptance are not claimed.</p><div class="pssol-actions">'+link(c.input,'Download input JSON')+link(c.output,'Download output JSON')+'<button type="button" class="pssol-link pssol-button" data-pssol="preview">Preview output</button></div><pre id="pssol-output" hidden aria-label="Output JSON preview"></pre></div>';
    }
    body+='<div class="pssol-code"><strong>Reference implementation</strong><p class="pssol-muted">Python route solver for Milestones 1–4. This is separate from the original third-party code.</p><div class="pssol-actions">'+link('solutions/route_solver.py','Download Python solution')+'<button type="button" class="pssol-link pssol-button" data-pssol="code">'+(state.codeOpen?'Hide code −':'Preview code +')+'</button><a class="pssol-link" href="solutions.html">Full solutions library ↗</a></div><pre id="pssol-code-preview" '+(state.codeOpen?'':'hidden')+' aria-label="Python solution code"></pre></div></div>';
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
        if(kind==='milestone'){state.milestone=Number(btn.dataset.value);state.caseNum=1;state.codeOpen=false;render();}
        if(kind==='case'){state.caseNum=Number(btn.dataset.value);state.codeOpen=false;render();}
        if(kind==='preview'){const c=selectedCase();if(c)preview(c.output,'pssol-output');}
        if(kind==='code'){state.codeOpen=!state.codeOpen;render();if(state.codeOpen)preview('solutions/route_solver.py','pssol-code-preview');}
      });
    });
  }
  function render() {
    const problem=identify(), main=activeMain();
    const existing=document.getElementById(ROOT_ID);
    if(!problem||!main) {existing?.remove();return;}
    if(problem!==state.problem) {
      state.problem=problem;state.open=false;state.milestone=1;state.caseNum=1;state.codeOpen=false;
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