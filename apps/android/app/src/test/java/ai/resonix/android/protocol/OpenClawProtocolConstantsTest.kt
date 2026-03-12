package ai.resonix.android.protocol

import org.junit.Assert.assertEquals
import org.junit.Test

class ResonixProtocolConstantsTest {
  @Test
  fun canvasCommandsUseStableStrings() {
    assertEquals("canvas.present", ResonixCanvasCommand.Present.rawValue)
    assertEquals("canvas.hide", ResonixCanvasCommand.Hide.rawValue)
    assertEquals("canvas.navigate", ResonixCanvasCommand.Navigate.rawValue)
    assertEquals("canvas.eval", ResonixCanvasCommand.Eval.rawValue)
    assertEquals("canvas.snapshot", ResonixCanvasCommand.Snapshot.rawValue)
  }

  @Test
  fun a2uiCommandsUseStableStrings() {
    assertEquals("canvas.a2ui.push", ResonixCanvasA2UICommand.Push.rawValue)
    assertEquals("canvas.a2ui.pushJSONL", ResonixCanvasA2UICommand.PushJSONL.rawValue)
    assertEquals("canvas.a2ui.reset", ResonixCanvasA2UICommand.Reset.rawValue)
  }

  @Test
  fun capabilitiesUseStableStrings() {
    assertEquals("canvas", ResonixCapability.Canvas.rawValue)
    assertEquals("camera", ResonixCapability.Camera.rawValue)
    assertEquals("screen", ResonixCapability.Screen.rawValue)
    assertEquals("voiceWake", ResonixCapability.VoiceWake.rawValue)
  }

  @Test
  fun screenCommandsUseStableStrings() {
    assertEquals("screen.record", ResonixScreenCommand.Record.rawValue)
  }
}
