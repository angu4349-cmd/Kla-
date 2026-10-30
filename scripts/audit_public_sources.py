#!/usr/bin/env python3
"""Read-only verification of KLA Practice Lab PDFs against public source repos.
No third-party solution code is executed or modified here.
"""
import hashlib
import io
import json
import os
from pathlib import Path
import urllib.request
import urllib.parse
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ZIP = ROOT / "KLA_Practice_Lab_GitHub_Repo.zip"

PDFS = [
    ("sem", "site/data/sem-ProblemStatement.pdf", "AakashVelusamy/kla-unhack-mock-2024", "master", "ProblemStatement.pdf"),
    ("schedule", "site/data/schedule-SW_Workshop_2024_WaferProcessingOptimization.pdf", "livin-joseph/UnHack-2024", "main", "ProblemStatement/SW_Workshop_2024_WaferProcessingOptimization.pdf"),
    ("route1", "site/data/route-Software_Workshop_Presentation_2025_Day1.pdf", "AakashVelusamy/kla-unhack-2025", "main", "Day1/ProblemStatement/Software_Workshop_Presentation_2025_Day1.pdf"),
    ("route2", "site/data/route-Software_Workshop_Presentation_2025_Day2.pdf", "AakashVelusamy/kla-unhack-2025", "main", "Day2/ProblemStatement/Software_Workshop_Presentation_2025_Day2.pdf"),
    ("workflow", "site/data/workflow-CY22 SW Workshop-Final.pdf", "AakashVelusamy/kla-unhack-2022", "main", "CY22 SW Workshop-Final.pdf"),
]

def sha(b):
    return hashlib.sha256(b).hexdigest()

def github_raw(repo, branch, path):
    return "https://raw.githubusercontent.com/" + repo + "/" + branch + "/" + urllib.parse.quote(path, safe="/")

def get_raw(repo, branch, path):
    req = urllib.request.Request(github_raw(repo, branch, path), headers={"User-Agent": "KLA-Practice-Lab-Research/1"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def main():
    report = {"pdf_matches": [], "zip_inventory": {}, "status": "incomplete"}
    with zipfile.ZipFile(ZIP) as z:
        names = z.namelist()
        for prefix in ["site/data/sem/", "site/data/mapping/", "site/data/schedule/", "site/data/route/", "site/data/workflow/"]:
            items = [n for n in names if n.startswith(prefix) and not n.endswith("/")]
            report["zip_inventory"][prefix] = {"file_count": len(items), "filenames": [n[len(prefix):] for n in items[:20]]}
        for label, original, repo, branch, source in PDFS:
            item = {"problem": label, "original": original, "source_repo": repo, "candidate": source}
            try:
                a = z.read(original)
                b = get_raw(repo, branch, source)
                item.update({"source_bytes": len(a), "candidate_bytes": len(b), "source_sha256": sha(a), "candidate_sha256": sha(b), "exact": a == b})
                print(f'PDF_COMPARE {label}: {"EXACT" if item["exact"] else "DIFFERENT"} | {len(a)} vs {len(b)} bytes | {repo}')
            except Exception as exc:
                item["error"] = str(exc)
                print(f"PDF_COMPARE {label}: ERROR {exc}")
            report["pdf_matches"].append(item)
    report["status"] = "completed"
    print("AUDIT_REPORT_JSON_START")
    print(json.dumps(report, sort_keys=True, indent=2))
    print("AUDIT_REPORT_JSON_END")
    if any(not r.get("exact", False) for r in report["pdf_matches"]):
        raise SystemExit("One or more PDFs could not be established as byte-for-byte identical")

if __name__ == "__main__":
    main()
