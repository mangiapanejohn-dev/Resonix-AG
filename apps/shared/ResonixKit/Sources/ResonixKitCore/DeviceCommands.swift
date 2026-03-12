import Foundation

public enum ResonixDeviceCommand: String, Codable, Sendable {
    case status = "device.status"
    case info = "device.info"
}

public enum ResonixBatteryState: String, Codable, Sendable {
    case unknown
    case unplugged
    case charging
    case full
}

public enum ResonixThermalState: String, Codable, Sendable {
    case nominal
    case fair
    case serious
    case critical
}

public enum ResonixNetworkPathStatus: String, Codable, Sendable {
    case satisfied
    case unsatisfied
    case requiresConnection
}

public enum ResonixNetworkInterfaceType: String, Codable, Sendable {
    case wifi
    case cellular
    case wired
    case other
}

public struct ResonixBatteryStatusPayload: Codable, Sendable, Equatable {
    public var level: Double?
    public var state: ResonixBatteryState
    public var lowPowerModeEnabled: Bool

    public init(level: Double?, state: ResonixBatteryState, lowPowerModeEnabled: Bool) {
        self.level = level
        self.state = state
        self.lowPowerModeEnabled = lowPowerModeEnabled
    }
}

public struct ResonixThermalStatusPayload: Codable, Sendable, Equatable {
    public var state: ResonixThermalState

    public init(state: ResonixThermalState) {
        self.state = state
    }
}

public struct ResonixStorageStatusPayload: Codable, Sendable, Equatable {
    public var totalBytes: Int64
    public var freeBytes: Int64
    public var usedBytes: Int64

    public init(totalBytes: Int64, freeBytes: Int64, usedBytes: Int64) {
        self.totalBytes = totalBytes
        self.freeBytes = freeBytes
        self.usedBytes = usedBytes
    }
}

public struct ResonixNetworkStatusPayload: Codable, Sendable, Equatable {
    public var status: ResonixNetworkPathStatus
    public var isExpensive: Bool
    public var isConstrained: Bool
    public var interfaces: [ResonixNetworkInterfaceType]

    public init(
        status: ResonixNetworkPathStatus,
        isExpensive: Bool,
        isConstrained: Bool,
        interfaces: [ResonixNetworkInterfaceType])
    {
        self.status = status
        self.isExpensive = isExpensive
        self.isConstrained = isConstrained
        self.interfaces = interfaces
    }
}

public struct ResonixDeviceStatusPayload: Codable, Sendable, Equatable {
    public var battery: ResonixBatteryStatusPayload
    public var thermal: ResonixThermalStatusPayload
    public var storage: ResonixStorageStatusPayload
    public var network: ResonixNetworkStatusPayload
    public var uptimeSeconds: Double

    public init(
        battery: ResonixBatteryStatusPayload,
        thermal: ResonixThermalStatusPayload,
        storage: ResonixStorageStatusPayload,
        network: ResonixNetworkStatusPayload,
        uptimeSeconds: Double)
    {
        self.battery = battery
        self.thermal = thermal
        self.storage = storage
        self.network = network
        self.uptimeSeconds = uptimeSeconds
    }
}

public struct ResonixDeviceInfoPayload: Codable, Sendable, Equatable {
    public var deviceName: String
    public var modelIdentifier: String
    public var systemName: String
    public var systemVersion: String
    public var appVersion: String
    public var appBuild: String
    public var locale: String

    public init(
        deviceName: String,
        modelIdentifier: String,
        systemName: String,
        systemVersion: String,
        appVersion: String,
        appBuild: String,
        locale: String)
    {
        self.deviceName = deviceName
        self.modelIdentifier = modelIdentifier
        self.systemName = systemName
        self.systemVersion = systemVersion
        self.appVersion = appVersion
        self.appBuild = appBuild
        self.locale = locale
    }
}
