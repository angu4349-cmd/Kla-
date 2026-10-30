"""Embed the Solutions feature inside the existing problem statement views."""
from pathlib import Path
import shutil

def install(site):
    site=Path(site)
    scripts=Path(__file__).resolve().parent
    for filename in ('ps_solutions.js','ps_solutions.css'):
        shutil.copy2(scripts/filename,site/filename)
    index=site/'index.html'
    html=index.read_text(encoding='utf-8')
    css='<link rel="stylesheet" href="ps_solutions.css">'
    js='<script defer src="ps_solutions.js"></script>'
    if css not in html:
        if '</head>' not in html:
            raise RuntimeError('Cannot inject PS solutions CSS: head not found')
        html=html.replace('</head>',css+'</head>',1)
    if js not in html:
        if '</body>' not in html:
            raise RuntimeError('Cannot inject PS solutions JS: body not found')
        html=html.replace('</body>',js+'</body>',1)
    index.write_text(html,encoding='utf-8')
    print('Embedded Solutions feature in original problem statement views')
