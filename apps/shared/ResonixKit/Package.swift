// swift-tools-version: 6.2

import PackageDescription

let package = Package(
    name: "ResonixKit",
    platforms: [
        .iOS(.v18),
        .macOS(.v15),
    ],
    products: [
        .library(name: "ResonixProtocol", targets: ["ResonixProtocol"]),
        .library(name: "ResonixKit", targets: ["ResonixKit"]),
        .library(name: "ResonixChatUI", targets: ["ResonixChatUI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/steipete/ElevenLabsKit", exact: "0.1.0"),
        .package(url: "https://github.com/gonzalezreal/textual", exact: "0.3.1"),
    ],
    targets: [
        .target(
            name: "ResonixProtocol",
            path: "Sources/ResonixProtocol",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "ResonixKit",
            dependencies: [
                "ResonixProtocol",
                .product(name: "ElevenLabsKit", package: "ElevenLabsKit"),
            ],
            path: "Sources/ResonixKit",
            resources: [
                .process("Resources"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "ResonixChatUI",
            dependencies: [
                "ResonixKit",
                .product(
                    name: "Textual",
                    package: "textual",
                    condition: .when(platforms: [.macOS, .iOS])),
            ],
            path: "Sources/ResonixChatUI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "ResonixKitTests",
            dependencies: ["ResonixKit", "ResonixChatUI"],
            path: "Tests/ResonixKitTests",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
