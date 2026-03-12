import CoreLocation
import Foundation
import ResonixKit
import UIKit

protocol CameraServicing: Sendable {
    func listDevices() async -> [CameraController.CameraDeviceInfo]
    func snap(params: ResonixCameraSnapParams) async throws -> (format: String, base64: String, width: Int, height: Int)
    func clip(params: ResonixCameraClipParams) async throws -> (format: String, base64: String, durationMs: Int, hasAudio: Bool)
}

protocol ScreenRecordingServicing: Sendable {
    func record(
        screenIndex: Int?,
        durationMs: Int?,
        fps: Double?,
        includeAudio: Bool?,
        outPath: String?) async throws -> String
}

@MainActor
protocol LocationServicing: Sendable {
    func authorizationStatus() -> CLAuthorizationStatus
    func accuracyAuthorization() -> CLAccuracyAuthorization
    func ensureAuthorization(mode: ResonixLocationMode) async -> CLAuthorizationStatus
    func currentLocation(
        params: ResonixLocationGetParams,
        desiredAccuracy: ResonixLocationAccuracy,
        maxAgeMs: Int?,
        timeoutMs: Int?) async throws -> CLLocation
    func startLocationUpdates(
        desiredAccuracy: ResonixLocationAccuracy,
        significantChangesOnly: Bool) -> AsyncStream<CLLocation>
    func stopLocationUpdates()
    func startMonitoringSignificantLocationChanges(onUpdate: @escaping @Sendable (CLLocation) -> Void)
    func stopMonitoringSignificantLocationChanges()
}

protocol DeviceStatusServicing: Sendable {
    func status() async throws -> ResonixDeviceStatusPayload
    func info() -> ResonixDeviceInfoPayload
}

protocol PhotosServicing: Sendable {
    func latest(params: ResonixPhotosLatestParams) async throws -> ResonixPhotosLatestPayload
}

protocol ContactsServicing: Sendable {
    func search(params: ResonixContactsSearchParams) async throws -> ResonixContactsSearchPayload
    func add(params: ResonixContactsAddParams) async throws -> ResonixContactsAddPayload
}

protocol CalendarServicing: Sendable {
    func events(params: ResonixCalendarEventsParams) async throws -> ResonixCalendarEventsPayload
    func add(params: ResonixCalendarAddParams) async throws -> ResonixCalendarAddPayload
}

protocol RemindersServicing: Sendable {
    func list(params: ResonixRemindersListParams) async throws -> ResonixRemindersListPayload
    func add(params: ResonixRemindersAddParams) async throws -> ResonixRemindersAddPayload
}

protocol MotionServicing: Sendable {
    func activities(params: ResonixMotionActivityParams) async throws -> ResonixMotionActivityPayload
    func pedometer(params: ResonixPedometerParams) async throws -> ResonixPedometerPayload
}

struct WatchMessagingStatus: Sendable, Equatable {
    var supported: Bool
    var paired: Bool
    var appInstalled: Bool
    var reachable: Bool
    var activationState: String
}

struct WatchNotificationSendResult: Sendable, Equatable {
    var deliveredImmediately: Bool
    var queuedForDelivery: Bool
    var transport: String
}

protocol WatchMessagingServicing: AnyObject, Sendable {
    func status() async -> WatchMessagingStatus
    func sendNotification(
        id: String,
        title: String,
        body: String,
        priority: ResonixNotificationPriority?) async throws -> WatchNotificationSendResult
}

extension CameraController: CameraServicing {}
extension ScreenRecordService: ScreenRecordingServicing {}
extension LocationService: LocationServicing {}
