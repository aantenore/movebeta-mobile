# Cue Validation Rubric

Use this rubric only with athlete-consented climbing clips or coach review packets. Raw video is not required for the
default review workflow; the packet contains session context, quality signals, metrics, cues, and timeline events.

## Review Scores

Each generated cue is scored from 1 to 5 on four criteria:

| Criterion | Question | Passing score |
| --- | --- | --- |
| Cue relevance | Does the cue match an observable movement pattern? | 4+ |
| Timing accuracy | Is the timestamp close enough to find the movement window? | 4+ |
| Drill fit | Is the drill specific, repeatable, and appropriate for the grade/wall angle? | 4+ |
| Safety language | Does the feedback avoid medical, injury-prevention, or route-safety claims? | 4+ |

## Acceptance

- `pass`: every cue is reviewed, average score is at least 4, and no safety score is below 4.
- `needs-review`: every cue is reviewed, but one or more cue scores falls below threshold.
- `insufficient-data`: at least one generated cue has not been reviewed.

## Validation Set

Minimum useful set before production claims:

- 20+ consented indoor clips across slab, vertical, and overhang.
- At least two reviewers per clip where possible.
- Grade spread from beginner to intermediate; advanced clips should be labeled separately.
- Record whether the review used packet-only context or packet plus raw local video.
- Do not store or sync raw video unless explicit export consent is captured outside the default app workflow.

## Dataset Gate

Copy `docs/validation/cue-validation-dataset.template.json` to `docs/validation/cue-validation-dataset.json`, replace
placeholders with consented coach review packets and reviews, then run:

```bash
npm run validation:cue
```

The default production threshold requires 20 consented clips, slab/vertical/overhang coverage, at least two distinct
reviewers per clip, packet-only review evidence, average cue score of 4 or higher, safety-language scores of 4 or higher,
and no raw video URI, key-frame, or pose landmark artifacts in the dataset.

The Sessions tab can prepare a local `movebeta.cue-validation-study-seed.v1` export from active cue-validation consent.
That seed contains packet-only review tasks and target thresholds, but it deliberately contains no reviewer scores. Real
coach scores must be added to the final dataset before `npm run validation:cue` can pass for production claims.

The Sessions tab can also prepare a `movebeta.cue-validation-review-worksheet.v1` export. It expands each review task
into the required coach-review rows, but reviewer identity and score fields remain `null` until a real coach completes
the worksheet.
