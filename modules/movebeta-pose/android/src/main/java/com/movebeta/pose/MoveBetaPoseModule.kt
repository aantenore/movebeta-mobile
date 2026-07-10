package com.movebeta.pose

import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseDetector
import com.google.mlkit.vision.pose.PoseLandmark
import com.google.mlkit.vision.pose.accurate.AccuratePoseDetectorOptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min

class MoveBetaPoseModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MoveBetaPose")

    AsyncFunction("isAvailableAsync") { provider: String? ->
      provider == null || provider == "native-platform-pose"
    }

    AsyncFunction("estimatePosesAsync") Coroutine { input: Map<String, Any?> ->
      AndroidMlKitPoseEstimator().estimate(appContext.reactContext ?: throw IllegalStateException("Missing React context."), input)
    }

    AsyncFunction("getVideoMetadataAsync") Coroutine { input: Map<String, Any?> ->
      AndroidMlKitPoseEstimator().metadata(appContext.reactContext ?: throw IllegalStateException("Missing React context."), input)
    }
  }
}

private class AndroidMlKitPoseEstimator {
  private val requiredLandmarks = listOf(
    "nose" to PoseLandmark.NOSE,
    "leftShoulder" to PoseLandmark.LEFT_SHOULDER,
    "rightShoulder" to PoseLandmark.RIGHT_SHOULDER,
    "leftElbow" to PoseLandmark.LEFT_ELBOW,
    "rightElbow" to PoseLandmark.RIGHT_ELBOW,
    "leftWrist" to PoseLandmark.LEFT_WRIST,
    "rightWrist" to PoseLandmark.RIGHT_WRIST,
    "leftHip" to PoseLandmark.LEFT_HIP,
    "rightHip" to PoseLandmark.RIGHT_HIP,
    "leftKnee" to PoseLandmark.LEFT_KNEE,
    "rightKnee" to PoseLandmark.RIGHT_KNEE,
    "leftAnkle" to PoseLandmark.LEFT_ANKLE,
    "rightAnkle" to PoseLandmark.RIGHT_ANKLE
  )

  fun metadata(context: android.content.Context, input: Map<String, Any?>): Map<String, Any> {
    val uri = input["uri"] as? String ?: throw IllegalArgumentException("Missing video uri.")
    val retriever = MediaMetadataRetriever()

    try {
      setDataSource(retriever, context, uri)
      val width = positiveDouble(
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toDoubleOrNull(),
        positiveDouble(input["width"], 1080.0)
      )
      val height = positiveDouble(
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toDoubleOrNull(),
        positiveDouble(input["height"], 1920.0)
      )
      val rotation = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull() ?: 0
      val rotated = rotation == 90 || rotation == 270
      val durationMs = positiveDouble(
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toDoubleOrNull(),
        positiveDouble(input["durationMs"], 12_000.0)
      )

      return mapOf(
        "durationMs" to durationMs,
        "height" to if (rotated) width else height,
        "uri" to uri,
        "width" to if (rotated) height else width
      )
    } finally {
      retriever.release()
    }
  }

  fun estimate(context: android.content.Context, input: Map<String, Any?>): List<Map<String, Any>> {
    val provider = input["provider"] as? String ?: "native-platform-pose"
    if (provider != "native-platform-pose") {
      throw IllegalArgumentException("$provider is reserved for a future native adapter and is not implemented in this build.")
    }

    val uri = input["uri"] as? String ?: throw IllegalArgumentException("Missing video uri.")
    val durationMs = positiveDouble(input["durationMs"], 12_000.0)
    val frameIntervalMs = positiveDouble(input["frameIntervalMs"], 350.0)
    val minFrames = positiveInt(input["minFrames"], 10)
    val maxFrames = positiveInt(input["maxFrames"], 96)
    val maxInferenceLongSidePx = positiveInt(input["maxInferenceLongSidePx"], 960)
    val analysisStartMs = analysisStartMs(input["analysisStartMs"], durationMs)
    val analysisEndMs = analysisEndMs(input["analysisEndMs"], durationMs, analysisStartMs)
    val timestamps = frameTimestamps(analysisStartMs, analysisEndMs, frameIntervalMs, minFrames, maxFrames)
    val retriever = MediaMetadataRetriever()
    val detector = PoseDetection.getClient(
      AccuratePoseDetectorOptions.Builder()
        .setDetectorMode(AccuratePoseDetectorOptions.SINGLE_IMAGE_MODE)
        .build()
    )

    try {
      setDataSource(retriever, context, uri)
      val sourceWidth = positiveInt(
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull(),
        positiveInt(input["width"], 1080)
      )
      val sourceHeight = positiveInt(
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull(),
        positiveInt(input["height"], 1920)
      )
      val frames = timestamps.mapNotNull { timestampMs ->
        val bitmap = decodedFrame(
          retriever,
          timestampMs,
          sourceWidth,
          sourceHeight,
          maxInferenceLongSidePx
        )
        bitmap?.let {
          try {
            estimateFrame(detector, it, timestampMs)
          } finally {
            it.recycle()
          }
        }
      }

      if (frames.size < minFrames) {
        throw IllegalStateException("ML Kit did not return enough pose frames.")
      }

      return frames
    } finally {
      detector.close()
      retriever.release()
    }
  }

  private fun decodedFrame(
    retriever: MediaMetadataRetriever,
    timestampMs: Double,
    sourceWidth: Int,
    sourceHeight: Int,
    maxLongSidePx: Int
  ): Bitmap? {
    val timestampUs = (timestampMs * 1000).toLong()
    val longSide = max(sourceWidth, sourceHeight)
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O_MR1 || longSide <= maxLongSidePx) {
      return retriever.getFrameAtTime(timestampUs, MediaMetadataRetriever.OPTION_CLOSEST)
    }

    val scale = maxLongSidePx.toDouble() / longSide.toDouble()
    val targetWidth = max(1, (sourceWidth * scale).toInt())
    val targetHeight = max(1, (sourceHeight * scale).toInt())
    return retriever.getScaledFrameAtTime(
      timestampUs,
      MediaMetadataRetriever.OPTION_CLOSEST,
      targetWidth,
      targetHeight
    )
  }

  private fun estimateFrame(
    detector: PoseDetector,
    bitmap: Bitmap,
    timestampMs: Double
  ): Map<String, Any>? {
    val image = InputImage.fromBitmap(bitmap, 0)
    val pose = Tasks.await(detector.process(image))
    val landmarks = requiredLandmarks.mapNotNull { (name, type) ->
      val landmark = pose.getPoseLandmark(type) ?: return null
      val position = landmark.position
      mapOf(
        "name" to name,
        "x" to clamp(position.x.toDouble() / max(bitmap.width, 1).toDouble()),
        "y" to clamp(position.y.toDouble() / max(bitmap.height, 1).toDouble()),
        "visibility" to clamp(landmark.inFrameLikelihood.toDouble())
      )
    }

    return mapOf(
      "timestampMs" to timestampMs,
      "landmarks" to landmarks
    )
  }

  private fun setDataSource(retriever: MediaMetadataRetriever, context: android.content.Context, uri: String) {
    val parsed = Uri.parse(uri)
    if (parsed.scheme.isNullOrBlank()) {
      retriever.setDataSource(uri)
    } else {
      retriever.setDataSource(context, parsed)
    }
  }

  private fun positiveDouble(value: Any?, fallback: Double): Double {
    return when (value) {
      is Number -> if (value.toDouble() > 0) value.toDouble() else fallback
      else -> fallback
    }
  }

  private fun positiveInt(value: Any?, fallback: Int): Int {
    return when (value) {
      is Number -> if (value.toInt() > 0) value.toInt() else fallback
      else -> fallback
    }
  }

  private fun analysisStartMs(value: Any?, durationMs: Double): Double {
    val startMs = when (value) {
      is Number -> value.toDouble()
      else -> 0.0
    }
    return max(0.0, min(durationMs, startMs))
  }

  private fun analysisEndMs(value: Any?, durationMs: Double, startMs: Double): Double {
    val endMs = when (value) {
      is Number -> value.toDouble()
      else -> durationMs
    }
    return max(startMs + 1.0, min(durationMs, endMs))
  }

  private fun frameTimestamps(startMs: Double, endMs: Double, frameIntervalMs: Double, minFrames: Int, maxFrames: Int): List<Double> {
    val durationMs = max(1.0, endMs - startMs)
    val requested = ceil(durationMs / frameIntervalMs).toInt()
    val frameCount = max(minFrames, min(maxFrames, requested))
    if (frameCount <= 1) return listOf(startMs)
    return (0 until frameCount).map { index ->
      startMs + durationMs * index.toDouble() / (frameCount - 1).toDouble()
    }
  }

  private fun clamp(value: Double): Double {
    return max(0.0, min(1.0, value))
  }
}
