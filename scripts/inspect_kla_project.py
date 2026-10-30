#!/usr/bin/env python3
import zipfile,io,re,subprocess,tempfile,os,json
from pathlib import Path
z=zipfile.ZipFile("KLA_Practice_Lab_GitHub_Repo.zip")
for name in ["site/index.html","site/app.js","site/catalog.js","site/visuals.js","site/style.css","site/data/manifest.json"]:
    b=z.read(name); t=b.decode("utf-8")
    print("\n====== FILE",name,"bytes",len(b),"======")
    if name.endswith("app.js"):
        for pat in ["render","nav","hashchange","challenges","solution","function","innerHTML"]:
            matches=list(re.finditer(re.escape(pat),t,re.I))
            print("KEYWORD",pat,"count",len(matches))
        print("APP HEAD\n",t[:12000],"\nAPP TAIL\n",t[-12000:])
    elif name.endswith("style.css"):
        print("CSS HEAD\n",t[:9000],"\nCSS TAIL\n",t[-3000:])
    elif name.endswith("catalog.js"):
        print("CATALOG\n",t[:19000])
    elif name.endswith("manifest.json"):
        print("MANIFEST\n",t[:12000])
    else: print(t[:14000])
for name in [x for x in z.namelist() if x.startswith("site/data/") and x.lower().endswith(".pdf")]:
    print("\n====== PDF",name,"======")
    with tempfile.NamedTemporaryFile(suffix=".pdf") as f:
        f.write(z.read(name));f.flush()
        p=subprocess.run(["pdftotext","-layout",f.name,"-"],capture_output=True,text=True)
        print(p.stdout[:12500] if p.returncode==0 else p.stderr[:1000])
print("\n====== MAPPING ALL FILES ======")
for n in z.namelist():
    if n.startswith("site/data/mapping/"):print(n)
