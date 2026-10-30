"""Build independently validated route outputs into the KLA Practice Lab site.

Keeps existing pages, source PDFs and inputs untouched. Each output is generated
from the original site's input JSON, checked, and recorded in a manifest.
"""
from pathlib import Path
import json,shutil,sys,html
from route_solver import solve,validate
def publish(site):
    site=Path(site)
    root=site/'solutions'
    root.mkdir(exist_ok=True)
    shutil.copy2(Path(__file__).with_name('route_solver.py'),root/'route_solver.py')
    route={'name':'2025 Wafer Inspection Path Planning','year':'2025','milestones':[]}
    summary={'published':[],'excluded':[],'source':'Independent Python implementation; public source repository credited'}
    for m in range(1,5):
        cases=[]
        for i in range(1,5):
            inp=f'data/route/TestCases/Milestone{m}/Input_Milestone{m}_Testcase{i}.json'
            p=site/inp
            if not p.exists():
                summary['excluded'].append({'milestone':m,'case':i,'reason':'input missing'})
                continue
            try:
                x=json.loads(p.read_text(encoding='utf-8-sig'))
                y,meta=solve(x,m)
                check=validate(x,y,m)
                dest=f'solutions/route/milestone{m}/output_case{i}.json'
                q=site/dest;q.parent.mkdir(parents=True,exist_ok=True)
                q.write_text(json.dumps(y,indent=2)+'\n',encoding='utf-8')
                cases.append({'case':i,'input':inp,'output':dest,'time':y['TotalTime'],'dies':check['die_count'],'method':meta,'status':'feasible independently checked; global optimality not claimed'})
                summary['published'].append(f'2025-M{m}-case{i}')
            except Exception as e:
                summary['excluded'].append({'milestone':m,'case':i,'reason':str(e)})
        route['milestones'].append({'number':m,'cases':cases})
    (root/'manifest.json').write_text(json.dumps({'route':route,'summary':summary},indent=2)+'\n',encoding='utf-8')
    page='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0b1220"><title>Solutions | KLA Practice Lab</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0b1220;color:#e9f1fb;font:15px/1.55 system-ui,Segoe UI,sans-serif}a{color:#b8f76b;text-decoration:none}a:hover{text-decoration:underline}.layout{display:grid;grid-template-columns:258px minmax(0,1fr);min-height:100vh}.sidebar{background:#111c2e;border-right:1px solid #27374b;padding:28px 17px}.brand{font-weight:850;font-size:19px;color:#fff}.brand span{color:#b8f76b}.side-label,.eyebrow{font-size:11px;letter-spacing:.15em;color:#a0afc4;font-weight:800;margin:26px 0 10px}.nav{display:block;width:100%;text-align:left;background:transparent;border:0;color:#b9c8da;border-radius:10px;padding:13px;cursor:pointer;font:inherit}.nav.active{background:#243a35;color:#b8f76b}.nav:hover{background:#1c2c41}main{max-width:1150px;width:100%;margin:auto;padding:36px clamp(20px,5vw,66px) 100px}.top{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:#a0afc4;font-size:13px}h1{font-size:clamp(36px,5vw,64px);line-height:1.1;letter-spacing:-.06em;margin:46px 0 8px}h1 em{font-style:normal;color:#b8f76b}.intro{max-width:690px;color:#aab9cc}.notice{margin:28px 0;padding:17px 21px;border:1px solid #344758;border-radius:14px;background:#152338;color:#c4d0dd}.panel{background:#131f31;border:1px solid #28394f;border-radius:18px;padding:24px;margin:18px 0}.tabs{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}.tab{padding:10px 16px;background:#1d2d40;color:#c9d6e4;border:1px solid #35475c;border-radius:10px;cursor:pointer}.tab.active{color:#b8f76b;border-color:#b8f76b}.case{padding:18px;border-top:1px solid #2a3a50}.case:first-child{border:0}.casehead{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.pill{color:#b8f76b;background:#263d2b;border-radius:99px;padding:4px 10px;font-size:12px}.links{display:flex;gap:14px;flex-wrap:wrap;margin-top:12px}.muted{color:#9fb0c3}.source{margin-top:24px;padding-top:20px;border-top:1px solid #34475b}.count{font-size:26px;font-weight:800;color:#b8f76b}pre{overflow:auto;max-height:340px;padding:18px;background:#07111e;border-radius:10px;font-size:12px}button{font-family:inherit}#content h2{margin:0 0 8px;font-size:24px}#content p{color:#b4c2d2}.mini{font-size:12px;color:#9fb0c3}@media(max-width:750px){.layout{display:block}.sidebar{padding:16px;border-right:0;border-bottom:1px solid #27374b}.nav{display:inline-block;width:auto;font-size:12px;padding:9px}main{padding-top:18px}h1{margin-top:24px}}
</style></head><body><div class="layout"><aside class="sidebar"><a class="brand" href="index.html">▦ KLA Practice <span>Lab</span></a><div class="side-label">SOLUTION LIBRARY</div><nav id="nav"></nav><p class="mini">Independent verification. Not affiliated with KLA.</p></aside><main><div class="top"><a href="index.html">← Back to practice lab</a><span>WORKSPACE / SOLUTIONS</span></div><h1>Solutions<em>.</em></h1><p class="intro">Explore runnable reference code, original inputs, generated outputs and validation results, organized by workshop problem and milestone.</p><div class="notice"><strong>Verification matters.</strong> Outputs are published only after coverage and collision checks pass. Feasible is not the same as officially accepted or globally optimal. Public source code is linked without modification.</div><div id="content" class="panel">Loading solutions…</div></main></div><script>
const entries=[
{id:'sem',title:'SEM Scan Layout',year:'2024',repo:'https://github.com/AakashVelusamy/kla-unhack-mock-2024',pdf:'data/sem-ProblemStatement.pdf',status:'Full validator and output audit pending'},
{id:'mapping',title:'Wafer Mapping',year:'2024',repo:null,pdf:'data/mapping-SW_Workshop_2024_ProblemStatement_Student_version_Final_PDF_12Jan.pdf',status:'Matching reference and complete validation pending'},
{id:'schedule',title:'Wafer Processing Optimization',year:'2024',repo:'https://github.com/livin-joseph/UnHack-2024',pdf:'data/schedule-SW_Workshop_2024_WaferProcessingOptimization.pdf',status:'Public schedules not fully verified; some cooldown checks failed'},
{id:'route',title:'Wafer Inspection Path Planning',year:'2025',repo:'https://github.com/AakashVelusamy/kla-unhack-2025',pdf:'data/route-Software_Workshop_Presentation_2025_Day1.pdf',status:'Independent reference code and checked outputs'},
{id:'workflow',title:'Workflow & Defect Binning',year:'2022',repo:'https://github.com/AakashVelusamy/kla-unhack-2022',pdf:'data/workflow-CY22 SW Workshop-Final.pdf',status:'Complete workflow validator pending'}
];
let state={problem:'route',milestone:1,manifest:null};
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
function select(id){state.problem=id;draw()}
function selectMilestone(m){state.milestone=m;draw()}
function draw(){document.getElementById('nav').innerHTML=entries.map(x=>'<button class="nav '+(x.id===state.problem?'active':'')+'" data-id="'+x.id+'">'+e(x.title)+'</button>').join('');document.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>select(b.dataset.id));
let x=entries.find(z=>z.id===state.problem),body='<div class="eyebrow">'+x.year+' / '+x.id.toUpperCase()+'</div><h2>'+e(x.title)+'</h2><p>'+e(x.status)+'</p><div class="links"><a href="'+e(x.pdf)+'" target="_blank">Original problem PDF ↗</a>'+(x.repo?'<a href="'+x.repo+'" target="_blank" rel="noopener">Original solution repository ↗</a>':'')+'</div>';
if(x.id==='route'&&state.manifest){let ms=state.manifest.route.milestones,sel=ms.find(z=>z.number===state.milestone);body+='<div class="tabs">'+ms.map(m=>'<button class="tab '+(m.number===state.milestone?'active':'')+'" data-ms="'+m.number+'">Milestone '+m.number+'</button>').join('')+'</div><div class="links"><a href="solutions/route_solver.py" download>Download independent Python solution ↓</a><a href="solutions/manifest.json" download>Verification manifest ↓</a></div>';body+=sel.cases.length?sel.cases.map(c=>'<div class="case"><div class="casehead"><strong>Test case '+c.case+'</strong><span class="pill">✓ Feasibility checked</span></div><div class="mini">'+c.dies+' dies · Total time: '+Number(c.time).toFixed(6)+' · Global optimum not claimed</div><div class="links"><a href="'+c.input+'" download>Input JSON ↓</a><a href="'+c.output+'" download>Output JSON ↓</a><button class="tab" data-output="'+c.output+'">Preview output</button></div></div>').join(''):'<p>No output passed validation for this milestone.</p>';body+='<div id="preview"></div>'}
else body+='<div class="source"><span class="pill" style="color:#ffcf86;background:#42331e">Verification pending</span><p>Candidate solutions are linked for inspection, but not distributed as verified results until complete checks pass.</p></div>';
document.getElementById('content').innerHTML=body;document.querySelectorAll('[data-ms]').forEach(b=>b.onclick=()=>selectMilestone(Number(b.dataset.ms)));document.querySelectorAll('[data-output]').forEach(b=>b.onclick=async()=>{let t=document.getElementById('preview');try{let r=await fetch(b.dataset.output);if(!r.ok)throw Error('HTTP '+r.status);t.innerHTML='<pre>'+e(await r.text())+'</pre>'}catch(err){t.textContent=err.message}})}
fetch('solutions/manifest.json').then(r=>r.json()).then(x=>{state.manifest=x;draw()}).catch(()=>draw());
</script></body></html>'''
    (site/'solutions.html').write_text(page,encoding='utf-8')
    print('Published',len(summary['published']),'independently checked outputs;',len(summary['excluded']),'excluded')
    return summary
