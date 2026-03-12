// swift-tools-version: 6.2
// Package manifest for the Resonix macOS companion (menu bar app + IPC library).

import PackageDescription

let package = Package(
    name: "Resonix",
    platforms: [
        .macOS(.v15),
    ],
    products: [
        .library(name: "ResonixIPC", targets: ["ResonixIPC"]),
        .library(name: "ResonixDiscovery", targets: ["ResonixDiscovery"]),
        .executable(name: "Resonix", targets: ["Resonix"]),
        .executable(name: "resonix-mac", targets: ["ResonixMacCLI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/orchetect/MenuBarExtraAccess", exact: "1.2.2"),
        .package(url: "https://github.com/swiftlang/swift-subprocess.git", from: "0.1.0"),
        .package(url: "https://github.com/apple/swift-log.git", from: "1.8.0"),
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.8.1"),
        .package(url: "https://github.com/steipete/Peekaboo.git", branch: "main"),
        .package(path: "../shared/ResonixKit"),
        .package(path: "../../Swabble"),
    ],
    targets: [
        .target(
            name: "ResonixIPC",
            dependencies: [],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "ResonixDiscovery",
            dependencies: [
                .product(name: "ResonixKit", package: "ResonixKit"),
            ],
            path: "Sources/ResonixDiscovery",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "Resonix",
            dependencies: [
                "ResonixIPC",
                "ResonixDiscovery",
                .product(name: "ResonixKit", package: "ResonixKit"),
                .product(name: "ResonixChatUI", package: "ResonixKit"),
                .product(name: "ResonixProtocol", package: "ResonixKit"),
                .product(name: "SwabbleKit", package: "swabble"),
                .product(name: "MenuBarExtraAccess", package: "MenuBarExtraAccess"),
                .product(name: "Subprocess", package: "swift-subprocess"),
                .product(name: "Logging", package: "swift-log"),
                .product(name: "Sparkle", package: "Sparkle"),
                .product(name: "PeekabooBridge", package: "Peekaboo"),
                .product(name: "PeekabooAutomationKit", package: "Peekaboo"),
            ],
            exclude: [
                "Resources/Info.plist",
            ],
            resources: [
                .copy("Resources/Resonix.icns"),
                .copy("Resources/DeviceModels"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "ResonixMacCLI",
            dependencies: [
                "ResonixDiscovery",
                .product(name: "ResonixKit", package: "ResonixKit"),
                .product(name: "ResonixProtocol", package: "ResonixKit"),
            ],
            path: "Sources/ResonixMacCLI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "ResonixIPCTests",
            dependencies: [
                "ResonixIPC",
                "Resonix",
                "ResonixDiscovery",
                .product(name: "ResonixProtocol", package: "ResonixKit"),
                .product(name: "SwabbleKit", package: "swabble"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
