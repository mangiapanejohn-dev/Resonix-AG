package ai.resonix.android.node

import android.os.Build
import ai.resonix.android.BuildConfig
import ai.resonix.android.SecurePrefs
import ai.resonix.android.gateway.GatewayClientInfo
import ai.resonix.android.gateway.GatewayConnectOptions
import ai.resonix.android.gateway.GatewayEndpoint
import ai.resonix.android.gateway.GatewayTlsParams
import ai.resonix.android.protocol.ResonixCanvasA2UICommand
import ai.resonix.android.protocol.ResonixCanvasCommand
import ai.resonix.android.protocol.ResonixCameraCommand
import ai.resonix.android.protocol.ResonixLocationCommand
import ai.resonix.android.protocol.ResonixScreenCommand
import ai.resonix.android.protocol.ResonixSmsCommand
import ai.resonix.android.protocol.ResonixCapability
import ai.resonix.android.LocationMode
import ai.resonix.android.VoiceWakeMode

class ConnectionManager(
  private val prefs: SecurePrefs,
  private val cameraEnabled: () -> Boolean,
  private val locationMode: () -> LocationMode,
  private val voiceWakeMode: () -> VoiceWakeMode,
  private val smsAvailable: () -> Boolean,
  private val hasRecordAudioPermission: () -> Boolean,
  private val manualTls: () -> Boolean,
) {
  companion object {
    internal fun resolveTlsParamsForEndpoint(
      endpoint: GatewayEndpoint,
      storedFingerprint: String?,
      manualTlsEnabled: Boolean,
    ): GatewayTlsParams? {
      val stableId = endpoint.stableId
      val stored = storedFingerprint?.trim().takeIf { !it.isNullOrEmpty() }
      val isManual = stableId.startsWith("manual|")

      if (isManual) {
        if (!manualTlsEnabled) return null
        if (!stored.isNullOrBlank()) {
          return GatewayTlsParams(
            required = true,
            expectedFingerprint = stored,
            allowTOFU = false,
            stableId = stableId,
          )
        }
        return GatewayTlsParams(
          required = true,
          expectedFingerprint = null,
          allowTOFU = false,
          stableId = stableId,
        )
      }

      // Prefer stored pins. Never let discovery-provided TXT override a stored fingerprint.
      if (!stored.isNullOrBlank()) {
        return GatewayTlsParams(
          required = true,
          expectedFingerprint = stored,
          allowTOFU = false,
          stableId = stableId,
        )
      }

      val hinted = endpoint.tlsEnabled || !endpoint.tlsFingerprintSha256.isNullOrBlank()
      if (hinted) {
        // TXT is unauthenticated. Do not treat the advertised fingerprint as authoritative.
        return GatewayTlsParams(
          required = true,
          expectedFingerprint = null,
          allowTOFU = false,
          stableId = stableId,
        )
      }

      return null
    }
  }

  fun buildInvokeCommands(): List<String> =
    buildList {
      add(ResonixCanvasCommand.Present.rawValue)
      add(ResonixCanvasCommand.Hide.rawValue)
      add(ResonixCanvasCommand.Navigate.rawValue)
      add(ResonixCanvasCommand.Eval.rawValue)
      add(ResonixCanvasCommand.Snapshot.rawValue)
      add(ResonixCanvasA2UICommand.Push.rawValue)
      add(ResonixCanvasA2UICommand.PushJSONL.rawValue)
      add(ResonixCanvasA2UICommand.Reset.rawValue)
      add(ResonixScreenCommand.Record.rawValue)
      if (cameraEnabled()) {
        add(ResonixCameraCommand.Snap.rawValue)
        add(ResonixCameraCommand.Clip.rawValue)
      }
      if (locationMode() != LocationMode.Off) {
        add(ResonixLocationCommand.Get.rawValue)
      }
      if (smsAvailable()) {
        add(ResonixSmsCommand.Send.rawValue)
      }
      if (BuildConfig.DEBUG) {
        add("debug.logs")
        add("debug.ed25519")
      }
      add("app.update")
    }

  fun buildCapabilities(): List<String> =
    buildList {
      add(ResonixCapability.Canvas.rawValue)
      add(ResonixCapability.Screen.rawValue)
      if (cameraEnabled()) add(ResonixCapability.Camera.rawValue)
      if (smsAvailable()) add(ResonixCapability.Sms.rawValue)
      if (voiceWakeMode() != VoiceWakeMode.Off && hasRecordAudioPermission()) {
        add(ResonixCapability.VoiceWake.rawValue)
      }
      if (locationMode() != LocationMode.Off) {
        add(ResonixCapability.Location.rawValue)
      }
    }

  fun resolvedVersionName(): String {
    val versionName = BuildConfig.VERSION_NAME.trim().ifEmpty { "dev" }
    return if (BuildConfig.DEBUG && !versionName.contains("dev", ignoreCase = true)) {
      "$versionName-dev"
    } else {
      versionName
    }
  }

  fun resolveModelIdentifier(): String? {
    return listOfNotNull(Build.MANUFACTURER, Build.MODEL)
      .joinToString(" ")
      .trim()
      .ifEmpty { null }
  }

  fun buildUserAgent(): String {
    val version = resolvedVersionName()
    val release = Build.VERSION.RELEASE?.trim().orEmpty()
    val releaseLabel = if (release.isEmpty()) "unknown" else release
    return "ResonixAndroid/$version (Android $releaseLabel; SDK ${Build.VERSION.SDK_INT})"
  }

  fun buildClientInfo(clientId: String, clientMode: String): GatewayClientInfo {
    return GatewayClientInfo(
      id = clientId,
      displayName = prefs.displayName.value,
      version = resolvedVersionName(),
      platform = "android",
      mode = clientMode,
      instanceId = prefs.instanceId.value,
      deviceFamily = "Android",
      modelIdentifier = resolveModelIdentifier(),
    )
  }

  fun buildNodeConnectOptions(): GatewayConnectOptions {
    return GatewayConnectOptions(
      role = "node",
      scopes = emptyList(),
      caps = buildCapabilities(),
      commands = buildInvokeCommands(),
      permissions = emptyMap(),
      client = buildClientInfo(clientId = "resonix-android", clientMode = "node"),
      userAgent = buildUserAgent(),
    )
  }

  fun buildOperatorConnectOptions(): GatewayConnectOptions {
    return GatewayConnectOptions(
      role = "operator",
      scopes = listOf("operator.read", "operator.write", "operator.talk.secrets"),
      caps = emptyList(),
      commands = emptyList(),
      permissions = emptyMap(),
      client = buildClientInfo(clientId = "resonix-control-ui", clientMode = "ui"),
      userAgent = buildUserAgent(),
    )
  }

  fun resolveTlsParams(endpoint: GatewayEndpoint): GatewayTlsParams? {
    val stored = prefs.loadGatewayTlsFingerprint(endpoint.stableId)
    return resolveTlsParamsForEndpoint(endpoint, storedFingerprint = stored, manualTlsEnabled = manualTls())
  }
}
