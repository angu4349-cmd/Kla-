# Independent milestone validators

The **Custom validator** tab in `solutions.html` checks user-selected input/output files **in the browser**. Files are not uploaded to the website.

## Status by problem

| Problem | Milestones | Implemented checks | Validation scope |
|---|---|---|---|
| PS01 SEM Scan Layout (2024) | Datasets 1–6 | CSV schema and unique IDs; metadata-permitted main/subfield sizes; parent references and containment; global positive-area subfield overlaps; complete rectangular care-area coverage | Feasibility only, **not** optimization or official Validator.exe parity |
| PS02 Wafer Mapping (Jan 2024) | Milestones 1–5 | Normalized JSON point count, duplicates, wafer radius, die index, partial die intersection, measurement radius and edge exclusion | **PARTIAL**: no official JSON format; no exhaustive die lattice, gripper masking or equal-spacing oracle |
| PS03 Wafer Processing (Dec 2024) | 0, 1, 2a–2b, 3a–3c, 4a–4c, 5a–5b, 6a–6b | Every required wafer/step, durations, machine assignment, machine and wafer overlap, step dependencies, machine parameter ranges, n-job drift, idle cooldown reset | Feasibility only, not minimum makespan or official validator parity |
| PS04 Inspection Path Planning (Dec 2025) | 1–4 | Finite coordinates, initial point, all die centers exactly once, camera/stage time recomputation, accelerations, forbidden-zone collision incl. boundary contact, no trailing waypoints | Feasibility only, not global route optimality or official validator parity |
| PS05 Workflow & Defect Binning (2022) | 1A, 1B, 2A, 2B | Log timestamps, Entry/Exit, nesting, Skipped vs Executing, concurrency-aware event parsing | **PARTIAL**: YAML execution semantics, dependencies and conditional evaluation not replayed |
| PS05 Defect Binning | 3A1 | CSV defect preservation, unique IDs, rule evaluation, precedence, expected Bincode for every defect | **PARTIAL** overall: binning result checked, workflow engine not replayed |

## Tested public fixtures

- PS01 original public SEM sample: 800 subfields, 2 care areas; all geometry checks passed.
- PS03: 14/14 public input/output pairs passed independent scheduling feasibility checks, including cooldown and process parameters.
- PS04: all 16 generated route outputs passed browser-engine regression checks against original inputs.
- PS05 milestone 3A1: all 5,235 public defect bin assignments matched the independent rule/precedence checker.

Tests also exercise missing/duplicate dies, forbidden-zone crossings, wrong total time, bad CSV dimensions, overlaps, missing dependencies, invalid machine parameter drift, insufficient cooldown, wrong bins and unbalanced workflow logs.

## Verification and reverse engineering

The original PS01 `Validator.zip` contains a Windows `Validator.exe` and sample files. Its binary has **not** been executed or reverse engineered, and this implementation does not claim to reproduce its internal scoring. The source PDFs, publicly available example inputs/outputs and documented rules were used to independently derive checks. Public candidate source code was not modified or executed.

`PASS` means all **implemented feasibility rules** for that problem passed. `FAIL` means one or more checks failed. `PARTIAL` means important rules remain unverified, even when the checked subset passes.

### Reproduce tests

```sh
node scripts/test-validators.cjs
python3 scripts/unpack.py
node scripts/test-validators.cjs build/site
```

GitHub Actions: `Verify PS-integrated solutions`, `Audit public SEM and wafer processing submissions`, `Inspect official workshop validator specifications`.
