import Foundation

public enum ResonixCameraCommand: String, Codable, Sendable {
    case list = "camera.list"
    case snap = "camera.snap"
    case clip = "camera.clip"
}

public enum ResonixCameraFacing: String, Codable, Sendable {
    case back
    case front
}

public enum ResonixCameraImageFormat: String, Codable, Sendable {
    case jpg
    case jpeg
}

public enum ResonixCameraVideoFormat: String, Codable, Sendable {
    case mp4
}

public struct ResonixCameraSnapParams: Codable, Sendable, Equatable {
    public var facing: ResonixCameraFacing?
    public var maxWidth: Int?
    public var quality: Double?
    public var format: ResonixCameraImageFormat?
    public var deviceId: String?
    public var delayMs: Int?

    public init(
        facing: ResonixCameraFacing? = nil,
        maxWidth: Int? = nil,
        quality: Double? = nil,
        format: ResonixCameraImageFormat? = nil,
        deviceId: String? = nil,
        delayMs: Int? = nil)
    {
        self.facing = facing
        self.maxWidth = maxWidth
        self.quality = quality
        self.format = format
        self.deviceId = deviceId
        self.delayMs = delayMs
    }
}

public struct ResonixCameraClipParams: Codable, Sendable, Equatable {
    public var facing: ResonixCameraFacing?
    public var durationMs: Int?
    public var includeAudio: Bool?
    public var format: ResonixCameraVideoFormat?
    public var deviceId: String?

    public init(
        facing: ResonixCameraFacing? = nil,
        durationMs: Int? = nil,
        includeAudio: Bool? = nil,
        format: ResonixCameraVideoFormat? = nil,
        deviceId: String? = nil)
    {
        self.facing = facing
        self.durationMs = durationMs
        self.includeAudio = includeAudio
        self.format = format
        self.deviceId = deviceId
    }
}
