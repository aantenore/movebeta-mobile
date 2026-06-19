import { runMoveNetReadinessProbe } from './movenet_readiness_report.mjs';

runMoveNetReadinessProbe({ runs: 1 })
  .then((report) => {
    console.log(
      JSON.stringify(
        {
          averageInferenceMs: report.averageInferenceMs,
          backend: report.backend,
          input: report.input.kind,
          keypoints: report.output.maxKeypoints,
          model: report.model,
          poses: report.output.maxPoses,
          status: report.output.poseArrayReturned ? 'executed' : 'failed',
        },
        null,
        2,
      ),
    );
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
