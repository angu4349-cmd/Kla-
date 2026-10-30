"""Replace the standalone Solutions page with the original PS-style workspace.

Does not alter problem inputs, solver, validation results, or original app.
"""
from pathlib import Path
import shutil

def install(site):
    site=Path(site)
    src=Path(__file__).resolve().parent
    for filename in ("solutions-workspace.css","solutions-workspace.js"):
        shutil.copy2(src/filename,site/filename)
    (site/"solutions.html").write_text((src/"solutions-workspace.html").read_text(encoding="utf-8"),encoding="utf-8")
    print("Installed PS-style Solutions workspace")
