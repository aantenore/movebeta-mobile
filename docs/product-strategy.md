# MoveBeta Product Strategy

## Product Decision

MoveBeta is a private, on-device repeat coach for intermediate indoor boulderers. It is not a route guide, social
network, generic training planner, or replacement for a human coach.

The product promise is:

> Film one attempt, review one observable signal, film the repeat, and check whether that measured signal changed.

The pose model is an implementation detail. The product value is the short experiment between two explicitly linked
attempts.

## Market Position

The category already exists. MoveBeta must not position on "AI video analysis" or "on-device privacy" alone.

| Product | Established strength | Implication for MoveBeta |
| --- | --- | --- |
| [BetterClimber](https://www.betterclimber.app/) | Offline pose analysis, skeleton overlay, replay, history, and Pro imports | Privacy and local inference are category features, not a unique wedge. |
| [Cima](https://getcima.app/) | Portrait-first video reports, scores, coaching notes, and progress tracking | A report must remain legible and actionable in a short gym review. |
| [KAYA](https://kayaclimb.com/features-home) | Large beta-video library, guidebooks, gyms, logging, and community | MoveBeta should not build a beta library or social network for the MVP. |
| [Climbah](https://climbah.com/) | Broad AI plans, chat, and multi-discipline coaching claims | MoveBeta should stay narrow and evidence-based instead of claiming a universal coach. |

The defensible path is a coach-reviewed climbing cue dataset plus longitudinal evidence from focused repeats. The base
pose estimator is replaceable and is not a moat.

## Target User

Primary user: an intermediate indoor boulderer who already records short project attempts and can immediately repeat the
same problem from the same camera position.

Job to be done:

> When I am projecting a boulder, show me one movement worth changing, take me to the exact moment, and tell me whether
> the next attempt improved without uploading my video.

Not MVP users:

- absolute beginners who need supervision and foundational safety instruction;
- outdoor, lead, trad, speed, or mixed-climbing users;
- elite athletes expecting biomechanical or 3D wall-distance analysis;
- coaches or gyms needing a multi-athlete workspace.

## Core Journey

1. Record a short attempt on native or import a video on any supported surface.
2. Confirm climb metadata and analyze locally.
3. If capture evidence is insufficient, request a retake and show no coaching claim.
4. Seek the video to the primary cue and overlay the measured pose.
5. Show one correction, one explanation, and one drill.
6. Collect `useful`, `unclear`, or `not accurate` feedback locally.
7. Start a focused repeat that preserves project, baseline report, and target cue identifiers.
8. Compare only explicitly linked or sufficiently confident attempts.
9. Keep derived history local and let the user export or delete it.

## Product Surfaces

The default `consumer` experience contains four destinations:

- **Coach:** capture/import, local analysis, one primary correction, focused repeat, and direct comparison.
- **Attempts:** all local reports with concise review, repeat, export, and deletion actions.
- **Progress:** latest trustworthy repeat comparison and measured movement trends.
- **Settings:** privacy boundary, local export, and history deletion.

The `diagnostic` experience keeps model, release, validation, coach-library, and packet tooling available for internal
builds. It must not appear in the consumer navigation.

## Freemium Model

The closed beta exposes the complete local product without billing or hidden reports. The commercial hypothesis after
cue validation is:

- **Free:** complete coaching loop, one active project at a time, and recent compatible comparisons.
- **Pro:** unlimited projects, long-horizon history, longitudinal comparisons, and encrypted backup.
- **Coach:** deferred until video-grounded review, athlete separation, consent, and billing are real product workflows.

Recommended commercial hypothesis: annual Pro subscription with a full trial. Per-analysis credits are a poor fit because
local inference has no meaningful marginal server cost. Billing and entitlements require a real store provider before
commercial launch; configuration-only plan switching is not a checkout implementation.

## Claim Boundary

The current engine uses 2D pose proxies. It can identify observable patterns such as low-movement intervals, ankle
velocity, elbow-flexion time, and lateral torso offset. It cannot prove intent, wall distance, grip quality, foot
contact, fatigue, injury risk, or a single correct beta.

Production coaching claims stay blocked until a consented dataset includes positive, negative, and no-cue examples
reviewed against the original video by at least two qualified coaches.

Initial validation target:

- at least 30 balanced clips across slab, vertical, and overhang;
- cue precision at or above 75%;
- median timestamp error at or below 0.75 seconds;
- inter-rater agreement at or above 0.60;
- no coaching output when capture readiness is `retake`.

## Release Decision

- **Go:** installable PWA and native development builds for a closed validation beta.
- **No-go:** paid public launch or claims that MoveBeta corrects climbing technique accurately.
- **Unblock:** coach-reviewed original-video dataset, same-input repeatability bounds, and physical-device evidence on
  supported iOS and Android hardware.

## Product Metrics

North-star metric: percentage of analyses followed by an explicitly linked repeat where the correction is marked useful.

Supporting metrics:

- time from video selection to first correction;
- focused-repeat start rate;
- repeat completion rate;
- useful, unclear, and not-accurate cue rate;
- retake rate caused by capture quality;
- percentage of comparisons backed by explicit baseline identifiers;
- week-four retention among users who completed a first repeat.
