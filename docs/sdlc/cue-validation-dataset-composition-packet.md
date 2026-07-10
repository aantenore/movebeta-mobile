# Cue Validation Dataset Composition Packet

Generated: 2026-07-10T08:48:14.981Z

- Status: needs-seed
- Source seed: empty
- Worksheet: empty
- Dataset: missing
- Clips: 0/20
- Worksheet rows: 0/0
- Missing scores: 0
- Missing reviewer IDs: 0
- Dataset write attempted: no
- Next action: Export a real cue-validation study seed from Sessions after athlete consent, then rerun npm run validation:cue:starter -- --seed <seed.json>.
- Raw worksheet included: no
- Reviewer identities included: no
- Reviewer scores included: no
- Dataset included: no

## Artifacts

| Artifact | Status | Path | Purpose |
| --- | --- | --- | --- |
| Cue-validation study seed | external-required | `docs/validation/cue-validation-study-seed.json` | Source Sessions seed from real consented local reports. |
| Cue-validation completed worksheet CSV | external-required | `docs/validation/cue-validation-review-worksheet.csv` | Completed real coach reviewer IDs and 1-5 score cells; never embedded in this packet. |
| Cue-validation composition packet | ready | `docs/sdlc/cue-validation-dataset-composition-packet.json` | Share-safe composition readiness report without raw worksheet or reviewer values. |
| Cue-validation dataset JSON | external-required | `docs/validation/cue-validation-dataset.json` | Gate-compatible dataset written only from a ready completed worksheet. |
| Cue-validation dataset report | external-required | `docs/sdlc/cue-validation-dataset-report.json` | Doctor report proving the composed dataset passed validation checks. |

## Phases

| Phase | Status | Owner | Detail | Action |
| --- | --- | --- | --- | --- |
| Collect consent | waiting | product | 0/20 consented clip(s) available. | Grant cue-validation consent on real local reports. |
| Cover wall angles | waiting | product | 0/3 wall angle(s) covered; 3 missing. | Required wall-angle coverage is represented in the current seed. |
| Assign reviewers | waiting | product | 2 assignment(s), 0 worksheet row(s), 0 score cell(s). | Finish consent and coverage before reviewer-slot assignments are actionable. |
| Complete worksheet | waiting | coach | 0/0 worksheet row(s) complete; 0 score cell(s) missing. | Collect real coach reviewer IDs and 1-5 scores in the worksheet CSV. |
| Preflight worksheet | waiting | qa | Worksheet preflight status is empty. | Grant cue-validation consent on local reports, then export a fresh worksheet CSV. |
| Compose dataset | waiting | qa | Dataset composition requires 0 complete seed-matching worksheet row(s). | Wait until worksheet preflight is ready before composing dataset JSON. |

## Commands

| Command | Owner | Value | Purpose |
| --- | --- | --- | --- |
| Cue-validation starter kit | product | `npm run validation:cue:starter` | Generate share-safe seed, intake, onboarding, and blank worksheet artifacts from a real Sessions seed. |
| Cue-validation composition packet | product | `npm run validation:cue:composition` | Refresh composition readiness without writing a dataset or exposing worksheet contents. |
| Compose cue-validation dataset | qa | `npm run validation:cue:composition -- --write-dataset` | Write the dataset JSON only when the completed worksheet preflight is ready. |
| Cue-validation gate | qa | `npm run validation:cue` | Validate the composed dataset before production movement-quality claims. |
| Cue-validation dataset doctor | qa | `npm run validation:cue:doctor` | Write the share-safe dataset report used by release readiness. |
| Model evidence sync | release | `npm run model:evidence:sync` | Promote real-world model evidence only after the cue-validation dataset report is ready. |
