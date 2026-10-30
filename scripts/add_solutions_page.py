"""Add an audited Solutions tab without changing the original problem files."""
from pathlib import Path
import html,json

PROBLEMS=[
("sem","2024","SEM Scan Layout Optimization","AakashVelusamy/kla-unhack-mock-2024","Not independently validated"),
("mapping","2024","Wafer Mapping",None,"Original PDF and public solution match pending"),
("schedule","2024","Wafer Processing Optimization","livin-joseph/UnHack-2024","13 of 14 schedules passed basic checks; parameter rules not fully checked"),
("route","2025","Wafer Inspection Path Planning","AakashVelusamy/kla-unhack-2025","M1 cases 1–4 and M2 cases 1–3 exact optimum; M3 case 4 and M4 case 3 invalid"),
("workflow","2022","Workflow Framework & Defect Binning","AakashVelusamy/kla-unhack-2022","Workflow execution not independently validated"),
]
def install(site):
    site=Path(site)
    idx=site/"index.html"
    source=idx.read_text(encoding="utf-8")
    if 'href="solutions.html"' not in source:
        anchor='<div class="railbottom">'
        link='<div class="navlabel">SOLUTIONS</div><a href="solutions.html" class="solutions-nav-link">✓ Solutions &amp; audit</a>'
        if anchor not in source:
            raise ValueError("Navigation anchor missing; refusing to alter website")
        source=source.replace(anchor,link+anchor,1)
        idx.write_text(source,encoding="utf-8")
    cards=[]
    for key,year,name,repo,status in PROBLEMS:
        source_link=('<a target="_blank" rel="noopener noreferrer" href="https://github.com/'+html.escape(repo)+'">Browse original code and test data ↗</a>') if repo else '<span>No matching public solution established</span>'
        cards.append('<article class="card"><div class="eyebrow">'+year+' · '+key.upper()+'</div><h2>'+html.escape(name)+'</h2><p>'+html.escape(status)+'</p>'+source_link+'</article>')
    page='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Solutions & Audit | KLA Practice Lab</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0b1220;color:#e6edf7;font:16px/1.55 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:1120px;margin:auto;padding:36px 24px 80px}a{color:#b5fa6b}header{display:flex;align-items:center;gap:20px;flex-wrap:wrap}header a{text-decoration:none}h1{font-size:clamp(30px,5vw,52px);letter-spacing:-.05em;margin:36px 0 8px}.sub{color:#a8b5c9;max-width:760px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:16px;margin-top:32px}.card{background:#141f32;border:1px solid #283851;border-radius:18px;padding:24px}.card h2{font-size:21px;line-height:1.25}.card p{color:#b9c5d6;min-height:72px}.eyebrow{color:#b5fa6b;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.note{border-left:3px solid #b5fa6b;padding:10px 20px;background:#152134;margin-top:28px;color:#c6d2e2}.card a{font-weight:700}.card a:hover{text-decoration:none}
</style></head><body><main><header><a href="index.html">← Back to Practice Lab</a><span>Solutions / Independent Audit</span></header><h1>Solutions &amp; verification</h1><p class="sub">Explore source repositories for each problem and review independent checks before trusting an output. Original third-party code is linked rather than copied. Official KLA acceptance is not implied.</p><div class="note"><strong>Verification is still incomplete.</strong> Invalid public outputs are flagged rather than published as correct. The original problem PDFs and datasets remain available in the Practice Lab.</div><section class="grid">'''+''.join(cards)+'''</section></main></body></html>'''
    (site/"solutions.html").write_text(page,encoding="utf-8")
    print("Solutions audit page installed")
