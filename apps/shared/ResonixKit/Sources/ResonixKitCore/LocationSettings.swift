import Foundation

public enum ResonixLocationMode: String, Codable, Sendable, CaseIterable {
    case off
    case whileUsing
    case always
}
