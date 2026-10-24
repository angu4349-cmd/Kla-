# KLA Practice Lab

Website: https://kla-practice-lab.vercel.app/

This repository keeps the complete website in the uploaded
`KLA_Practice_Lab_GitHub_Repo.zip`. The Vercel build automatically extracts
that ZIP into `build/site`. You do not need to unpack the archive before
uploading it to GitHub.

## Update the website

Replace the ZIP with an updated package containing `site/index.html` and the
other files in their existing structure. The root `vercel.json` and
`scripts/unpack.py` control deployment. The ZIP's own `vercel.json` does not
override the repository's root configuration.

## Local build

Requires Python 3 and no third-party packages:

```sh
python scripts/unpack.py
python -m http.server 8000 --bind 127.0.0.1 --directory build/site
```

Open http://127.0.0.1:8000. Use `python3` instead of `python` if needed.

## Contents

The package includes five problem sets with their original input files and
PDF statements, an operating PowerPoint, a downloadable original SEM
Windows validator, and interactive teaching models. PS numbers match the
website menu rather than official KLA identifiers.

| PS | Problem | Workshop year |
| --- | --- | --- |
| 01 | SEM Scan Layout Optimization | 2024 |
| 02 | Wafer Mapping | January 2024 |
| 03 | Wafer Processing Optimization | December 2024 |
| 04 | Wafer Inspection Path Planning | December 2025 |
| 05 | Workflow Framework & Defect Binning | 2022 |

The website is independent of KLA. Original materials retain their authors'
ownership and applicable terms. No additional redistribution license is
implied. Browser checks inspect file format only. The other four original
validators are historical web services and were unavailable at the recorded
checks. Code compilation, official grading and proven-optimal reference
solutions are not implemented.

Notes and progress stay in browser local storage. Use Export progress and
Restore progress when changing device, browser or website address.
