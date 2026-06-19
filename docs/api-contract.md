# MoveBeta Contracts

The default product loop does not need a remote API. The important contract is the local movement boundary between video
input, pose landmarks, and analysis reports.

`native-platform-pose` is the implemented native provider in this build: Apple Vision on iOS and ML Kit Pose Detection
on Android. The `native-mediapipe`, `native-coreml`, and `native-tflite` keys are reserved extension points and are
rejected at runtime until a real adapter is installed.

## Pose Estimator

```ts
type PoseEstimator = {
  provider:
    | 'local-fixture'
    | 'local-video-fallback'
    | 'web-tfjs-movenet'
    | 'native-platform-pose'
    | 'native-mediapipe'
    | 'native-coreml'
    | 'native-tflite';
  estimate(video: VideoAsset): Promise<PoseFrame[]>;
  isAvailable(): Promise<boolean>;
};
```

## Video Asset

```ts
type VideoAsset = {
  id: string;
  uri: string;
  source: 'camera' | 'import' | 'fixture';
  durationMs: number;
  width: number;
  height: number;
  capturedAt: string;
};
```

## Native Video Metadata

```ts
type NativeVideoMetadataInput = {
  uri: string;
  durationMs?: number;
  width?: number;
  height?: number;
};

type NativeVideoMetadata = {
  uri: string;
  durationMs: number;
  width: number;
  height: number;
};
```

`movebeta-pose.getVideoMetadataAsync` reads local video duration and dimensions on custom native builds. The app can
fall back to picker metadata, recorder timer values, browser metadata, or configured defaults when the native bridge is
not available.

## Local Report

Reports contain:

- Session metadata.
- Engine metadata.
- Movement metrics.
- Coaching cues.
- Timeline events.
- One key frame of landmarks.
- Analysis quality score, frame coverage, landmark coverage, visibility, and warnings.
- Analysis performance evidence: elapsed analysis time, budget status, and processed frame rate.
- Privacy metadata confirming whether video left the device.

## Coach Consent

```ts
type CoachReviewConsentRecord = {
  reportId: string;
  grantedAt: string;
  revokedAt?: string;
  policyVersion: string;
  scope: Array<'coach-review' | 'cue-validation'>;
  rawVideoIncluded: false;
  videoLeavesDevice: false;
};
```

Coach packets can be prepared only from active consent records. Revoked records are kept as local audit evidence and do
not authorize export.

## Cue Validation Dataset Builder

The default cue-validation workflow is local:

```ts
type CompletedWorksheetCsv = string;

type CueValidationDatasetBuilder = {
  build(seed: CueValidationStudySeed, csv: CompletedWorksheetCsv): CueValidationCompletedDataset;
};
```

The builder emits `schemaVersion: "movebeta.cue-validation-dataset.v1"` and accepts only completed worksheet rows that
match the current study seed. Reviewer IDs must be present, all scores must be integers from 1 to 5, duplicate or
unknown rows are rejected, and the resulting JSON is compatible with the `npm run validation:cue` production gate.
The app can also run a local gate preview over the completed dataset and return ready status, aggregate counts, average
score, wall-angle coverage, and failed checks without calling a remote API.

## Optional Future Sync API

Any server-side API should accept reports and user-approved exports only. Raw video upload should be a separate explicit
action, never part of the default local analysis call.
