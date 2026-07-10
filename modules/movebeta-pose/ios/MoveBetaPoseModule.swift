import AVFoundation
import ExpoModulesCore
import Photos
import Vision

public class MoveBetaPoseModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MoveBetaPose")

    AsyncFunction("isAvailableAsync") { (_ provider: String?) -> Bool in
      return provider == nil || provider == "native-platform-pose"
    }

    AsyncFunction("estimatePosesAsync") { (input: [String: Any]) throws -> [[String: Any]] in
      return try AppleVisionPoseEstimator().estimate(input: input)
    }

    AsyncFunction("getVideoMetadataAsync") { (input: [String: Any]) throws -> [String: Any] in
      return try AppleVisionPoseEstimator().metadata(input: input)
    }
  }
}

private final class AppleVisionPoseEstimator {
  private let requiredJoints: [(String, VNHumanBodyPoseObservation.JointName)] = [
    ("nose", .nose),
    ("leftShoulder", .leftShoulder),
    ("rightShoulder", .rightShoulder),
    ("leftElbow", .leftElbow),
    ("rightElbow", .rightElbow),
    ("leftWrist", .leftWrist),
    ("rightWrist", .rightWrist),
    ("leftHip", .leftHip),
    ("rightHip", .rightHip),
    ("leftKnee", .leftKnee),
    ("rightKnee", .rightKnee),
    ("leftAnkle", .leftAnkle),
    ("rightAnkle", .rightAnkle)
  ]

  func metadata(input: [String: Any]) throws -> [String: Any] {
    guard let uri = input["uri"] as? String else {
      throw NSError(domain: "MoveBetaPose", code: 1, userInfo: [NSLocalizedDescriptionKey: "Missing video uri."])
    }

    let asset = try videoAsset(from: uri)
    let track = asset.tracks(withMediaType: .video).first
    let naturalSize = track?.naturalSize.applying(track?.preferredTransform ?? .identity) ?? .zero
    let inputWidth = positiveDouble(input["width"], fallback: 1080)
    let inputHeight = positiveDouble(input["height"], fallback: 1920)
    let width = abs(Double(naturalSize.width)) > 0 ? abs(Double(naturalSize.width)) : inputWidth
    let height = abs(Double(naturalSize.height)) > 0 ? abs(Double(naturalSize.height)) : inputHeight
    let assetDurationMs = asset.duration.seconds.isFinite && asset.duration.seconds > 0 ? asset.duration.seconds * 1000 : nil

    return [
      "durationMs": assetDurationMs ?? positiveDouble(input["durationMs"], fallback: 12000),
      "height": height,
      "uri": uri,
      "width": width
    ]
  }

  func estimate(input: [String: Any]) throws -> [[String: Any]] {
    let provider = input["provider"] as? String ?? "native-platform-pose"
    guard provider == "native-platform-pose" else {
      throw NSError(domain: "MoveBetaPose", code: 4, userInfo: [NSLocalizedDescriptionKey: "\(provider) is reserved for a future native adapter and is not implemented in this build."])
    }

    guard let uri = input["uri"] as? String else {
      throw NSError(domain: "MoveBetaPose", code: 1, userInfo: [NSLocalizedDescriptionKey: "Missing video uri."])
    }

    let asset = try videoAsset(from: uri)
    let durationMs = positiveDouble(input["durationMs"], fallback: max(asset.duration.seconds * 1000, 1500))
    let frameIntervalMs = positiveDouble(input["frameIntervalMs"], fallback: 350)
    let minFrames = positiveInt(input["minFrames"], fallback: 10)
    let maxFrames = positiveInt(input["maxFrames"], fallback: 96)
    let maxInferenceLongSidePx = positiveDouble(input["maxInferenceLongSidePx"], fallback: 960)
    let analysisStartMs = analysisStartMs(input["analysisStartMs"], durationMs: durationMs)
    let analysisEndMs = analysisEndMs(input["analysisEndMs"], durationMs: durationMs, startMs: analysisStartMs)
    let timestamps = frameTimestamps(startMs: analysisStartMs, endMs: analysisEndMs, frameIntervalMs: frameIntervalMs, minFrames: minFrames, maxFrames: maxFrames)
    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    generator.maximumSize = CGSize(width: maxInferenceLongSidePx, height: maxInferenceLongSidePx)
    generator.requestedTimeToleranceBefore = CMTime(seconds: 0.05, preferredTimescale: 600)
    generator.requestedTimeToleranceAfter = CMTime(seconds: 0.05, preferredTimescale: 600)

    var frames: [[String: Any]] = []
    for timestampMs in timestamps {
      let time = CMTime(seconds: timestampMs / 1000, preferredTimescale: 600)
      var actualTime = CMTime.invalid
      let image = try generator.copyCGImage(at: time, actualTime: &actualTime)
      let decodedTimestampMs = actualTime.isValid && actualTime.seconds.isFinite ? actualTime.seconds * 1000 : timestampMs
      if let previous = frames.last?["timestampMs"] as? Double, decodedTimestampMs <= previous {
        continue
      }
      if let frame = estimateFrame(image: image, timestampMs: decodedTimestampMs) {
        frames.append(frame)
      }
    }

    if frames.count < minFrames {
      throw NSError(domain: "MoveBetaPose", code: 2, userInfo: [NSLocalizedDescriptionKey: "Apple Vision did not return enough pose frames."])
    }

    return frames
  }

  private func estimateFrame(image: CGImage, timestampMs: Double) -> [String: Any]? {
    let request = VNDetectHumanBodyPoseRequest()
    let handler = VNImageRequestHandler(cgImage: image, orientation: .up, options: [:])
    do {
      try handler.perform([request])
    } catch {
      return nil
    }

    guard let observation = request.results?.first else {
      return nil
    }

    guard let points = try? observation.recognizedPoints(.all) else {
      return nil
    }
    var landmarks: [[String: Any]] = []

    for (name, joint) in requiredJoints {
      guard let point = points[joint], point.confidence > 0 else {
        continue
      }

      let normalizedX = Double(point.location.x)
      let normalizedY = 1 - Double(point.location.y)
      landmarks.append([
        "inFrame": normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1,
        "name": name,
        "x": clamp(normalizedX),
        "y": clamp(normalizedY),
        "visibility": clamp(Double(point.confidence))
      ])
    }

    guard !landmarks.isEmpty else {
      return nil
    }

    return [
      "timestampMs": timestampMs,
      "landmarks": landmarks
    ]
  }

  private func videoAsset(from uri: String) throws -> AVAsset {
    if uri.hasPrefix("ph://") || uri.hasPrefix("assets-library://") {
      return try photoLibraryAsset(from: uri)
    }

    if let url = URL(string: uri), url.scheme != nil {
      return AVURLAsset(url: url)
    }
    return AVURLAsset(url: URL(fileURLWithPath: uri))
  }

  private func photoLibraryAsset(from uri: String) throws -> AVAsset {
    let asset: PHAsset?

    if uri.hasPrefix("assets-library://"), let url = URL(string: uri) {
      asset = PHAsset.fetchAssets(withALAssetURLs: [url], options: nil).firstObject
    } else {
      let identifier = String(uri.dropFirst("ph://".count)).removingPercentEncoding ?? String(uri.dropFirst("ph://".count))
      asset = PHAsset.fetchAssets(withLocalIdentifiers: [identifier], options: nil).firstObject
    }

    guard let asset else {
      throw NSError(domain: "MoveBetaPose", code: 5, userInfo: [NSLocalizedDescriptionKey: "Could not resolve the selected Photos video asset."])
    }

    let options = PHVideoRequestOptions()
    options.isNetworkAccessAllowed = false

    let semaphore = DispatchSemaphore(value: 0)
    var resolvedAsset: AVAsset?
    var resolvedInfo: [AnyHashable: Any]?

    PHImageManager.default().requestAVAsset(forVideo: asset, options: options) { avAsset, _, info in
      resolvedAsset = avAsset
      resolvedInfo = info
      semaphore.signal()
    }

    _ = semaphore.wait(timeout: .now() + 12)

    if let error = resolvedInfo?[PHImageErrorKey] as? NSError {
      throw error
    }

    guard let resolvedAsset else {
      throw NSError(domain: "MoveBetaPose", code: 6, userInfo: [NSLocalizedDescriptionKey: "The selected Photos video is not available locally on this device."])
    }

    return resolvedAsset
  }

  private func positiveDouble(_ value: Any?, fallback: Double) -> Double {
    if let number = value as? NSNumber, number.doubleValue > 0 {
      return number.doubleValue
    }
    if let value = value as? Double, value > 0 {
      return value
    }
    return fallback
  }

  private func positiveInt(_ value: Any?, fallback: Int) -> Int {
    if let number = value as? NSNumber, number.intValue > 0 {
      return number.intValue
    }
    if let value = value as? Int, value > 0 {
      return value
    }
    return fallback
  }

  private func analysisStartMs(_ value: Any?, durationMs: Double) -> Double {
    if let number = value as? NSNumber {
      return max(0, min(durationMs, number.doubleValue))
    }
    if let value = value as? Double {
      return max(0, min(durationMs, value))
    }
    return 0
  }

  private func analysisEndMs(_ value: Any?, durationMs: Double, startMs: Double) -> Double {
    if let number = value as? NSNumber {
      return max(startMs + 1, min(durationMs, number.doubleValue))
    }
    if let value = value as? Double {
      return max(startMs + 1, min(durationMs, value))
    }
    return durationMs
  }

  private func frameTimestamps(startMs: Double, endMs: Double, frameIntervalMs: Double, minFrames: Int, maxFrames: Int) -> [Double] {
    let durationMs = max(1, endMs - startMs)
    let requested = Int(ceil(durationMs / frameIntervalMs))
    let frameCount = max(minFrames, min(maxFrames, requested))
    if frameCount <= 1 {
      return [startMs]
    }
    return (0..<frameCount).map { index in
      startMs + durationMs * Double(index) / Double(frameCount - 1)
    }
  }

  private func clamp(_ value: Double) -> Double {
    return max(0, min(1, value))
  }
}
