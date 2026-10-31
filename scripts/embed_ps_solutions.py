"""Embed the Solutions feature inside the existing problem statement views."""
from pathlib import Path
import shutil

def install(site):
    site=Path(site)
    scripts=Path(__file__).resolve().parent
    for filename in ('ps_solutions.js','ps_solutions.css','kla-validators.js','validator-ui.js','validator-ui.css'):
        shutil.copy2(scripts/filename,site/filename)
    index=site/'index.html'
    html=index.read_text(encoding='utf-8')
    css='<link rel="stylesheet" href="ps_solutions.css"><link rel="stylesheet" href="validator-ui.css">'
    js='<script defer src="kla-validators.js"></script><script defer src="validator-ui.js"></script><script defer src="ps_solutions.js"></script>'
    if 'validator-ui.css' not in html:
        if '</head>' not in html:
            raise RuntimeError('Cannot inject PS solutions CSS: head not found')
        html=html.replace('</head>',css+'</head>',1)
    if 'validator-ui.js' not in html:
        if '</body>' not in html:
            raise RuntimeError('Cannot inject PS solutions JS: body not found')
        html=html.replace('</body>',js+'</body>',1)
    index.write_text(html,encoding='utf-8')
    print('Embedded Solutions feature in original problem statement views')
