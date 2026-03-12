import Foundation

// Stable identifier used for both the macOS LaunchAgent label and Nix-managed defaults suite.
// nix-resonix writes app defaults into this suite to survive app bundle identifier churn.
let launchdLabel = "ai.resonix.mac"
let gatewayLaunchdLabel = "ai.resonix.gateway"
let onboardingVersionKey = "resonix.onboardingVersion"
let onboardingSeenKey = "resonix.onboardingSeen"
let currentOnboardingVersion = 7
let pauseDefaultsKey = "resonix.pauseEnabled"
let iconAnimationsEnabledKey = "resonix.iconAnimationsEnabled"
let swabbleEnabledKey = "resonix.swabbleEnabled"
let swabbleTriggersKey = "resonix.swabbleTriggers"
let voiceWakeTriggerChimeKey = "resonix.voiceWakeTriggerChime"
let voiceWakeSendChimeKey = "resonix.voiceWakeSendChime"
let showDockIconKey = "resonix.showDockIcon"
let defaultVoiceWakeTriggers = ["resonix"]
let voiceWakeMaxWords = 32
let voiceWakeMaxWordLength = 64
let voiceWakeMicKey = "resonix.voiceWakeMicID"
let voiceWakeMicNameKey = "resonix.voiceWakeMicName"
let voiceWakeLocaleKey = "resonix.voiceWakeLocaleID"
let voiceWakeAdditionalLocalesKey = "resonix.voiceWakeAdditionalLocaleIDs"
let voicePushToTalkEnabledKey = "resonix.voicePushToTalkEnabled"
let talkEnabledKey = "resonix.talkEnabled"
let iconOverrideKey = "resonix.iconOverride"
let connectionModeKey = "resonix.connectionMode"
let remoteTargetKey = "resonix.remoteTarget"
let remoteIdentityKey = "resonix.remoteIdentity"
let remoteProjectRootKey = "resonix.remoteProjectRoot"
let remoteCliPathKey = "resonix.remoteCliPath"
let canvasEnabledKey = "resonix.canvasEnabled"
let cameraEnabledKey = "resonix.cameraEnabled"
let systemRunPolicyKey = "resonix.systemRunPolicy"
let systemRunAllowlistKey = "resonix.systemRunAllowlist"
let systemRunEnabledKey = "resonix.systemRunEnabled"
let locationModeKey = "resonix.locationMode"
let locationPreciseKey = "resonix.locationPreciseEnabled"
let peekabooBridgeEnabledKey = "resonix.peekabooBridgeEnabled"
let deepLinkKeyKey = "resonix.deepLinkKey"
let modelCatalogPathKey = "resonix.modelCatalogPath"
let modelCatalogReloadKey = "resonix.modelCatalogReload"
let cliInstallPromptedVersionKey = "resonix.cliInstallPromptedVersion"
let heartbeatsEnabledKey = "resonix.heartbeatsEnabled"
let debugPaneEnabledKey = "resonix.debugPaneEnabled"
let debugFileLogEnabledKey = "resonix.debug.fileLogEnabled"
let appLogLevelKey = "resonix.debug.appLogLevel"
let voiceWakeSupported: Bool = ProcessInfo.processInfo.operatingSystemVersion.majorVersion >= 26
