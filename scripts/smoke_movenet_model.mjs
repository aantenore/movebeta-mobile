import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';

async function main() {
  await tf.setBackend('cpu');
  await tf.ready();

  const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
  });
  const input = tf.zeros([192, 192, 3], 'int32');

  try {
    const poses = await detector.estimatePoses(input, { maxPoses: 1 });
    const result = {
      backend: tf.getBackend(),
      input: 'synthetic-blank-192x192',
      keypoints: poses[0]?.keypoints?.length ?? 0,
      model: 'MoveNet SinglePose Lightning',
      poses: poses.length,
      status: 'executed',
    };

    if (!Array.isArray(poses)) {
      throw new Error('MoveNet smoke did not return a pose array.');
    }

    console.log(JSON.stringify(result, null, 2));
  } finally {
    input.dispose();
    detector.dispose();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
