package com.directormodepro.desktop

import com.directormodepro.app.link.CameraNodeController
import com.directormodepro.app.link.CameraNodeServer
import com.directormodepro.app.link.NodeStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.awt.BasicStroke
import java.awt.Color
import java.awt.Font
import java.awt.GradientPaint
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import javax.imageio.ImageIO
import kotlin.math.cos
import kotlin.math.sin

/**
 * DEMO ONLY (started with `--demo N`): simulated camera phones running the real CameraNodeServer
 * protocol on localhost, so the console can be tested without phones. Every frame is stamped
 * "DEMO" and nothing is recorded to disk.
 */
class DemoCameraController(private val label: String, private val hue: Float, scope: CoroutineScope) : CameraNodeController {
    override val status = MutableStateFlow(
        NodeStatus(cameraReady = true, batteryPercent = (40..95).random(), freeBytes = 12_000_000_000L, previewAvailable = true)
    )
    private val frames = MutableSharedFlow<ByteArray>(extraBufferCapacity = 1)
    override val previewFrames: Flow<ByteArray> = frames
    @Volatile private var preview = false
    @Volatile private var recordingSince: Long? = null

    init {
        scope.launch(Dispatchers.Default) {
            var t = 0.0
            while (isActive) {
                recordingSince?.let { since -> status.update { it.copy(recordedSeconds = (System.currentTimeMillis() - since) / 1000) } }
                if (preview) frames.tryEmit(render(t))
                t += 0.16
                delay(160)
            }
        }
    }

    override fun startRecording(take: String) {
        recordingSince = System.currentTimeMillis()
        status.update { it.copy(recording = true, recordedSeconds = 0, lastSavedTake = null) }
    }

    override fun stopRecording() {
        recordingSince = null
        status.update { it.copy(recording = false, lastSavedTake = "DEMO (not saved)") }
    }

    override fun setLens(lens: String) = status.update { it.copy(lens = lens) }
    override fun setZoom(linear: Float) = status.update { it.copy(zoom = linear) }
    override fun setPreviewEnabled(enabled: Boolean) { preview = enabled }

    private fun render(t: Double): ByteArray {
        val w = 480; val h = 270
        val img = BufferedImage(w, h, BufferedImage.TYPE_INT_RGB)
        val g = img.createGraphics()
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        val top = Color.getHSBColor(hue, 0.55f, 0.35f)
        val bottom = Color.getHSBColor((hue + 0.08f) % 1f, 0.7f, 0.12f)
        g.paint = GradientPaint(0f, 0f, top, 0f, h.toFloat(), bottom)
        g.fillRect(0, 0, w, h)
        // Soft moving "bokeh" lights so motion is visible in the preview.
        for (i in 0 until 6) {
            val x = (w / 2 + cos(t * 0.6 + i) * w * 0.35).toInt()
            val y = (h / 2 + sin(t * 0.8 + i * 1.7) * h * 0.3).toInt()
            g.color = Color(255, 210, 150, 70)
            g.fillOval(x - 18, y - 18, 36, 36)
        }
        g.color = Color(255, 255, 255, 60)
        g.stroke = BasicStroke(1f)
        g.drawLine(w / 3, 0, w / 3, h); g.drawLine(2 * w / 3, 0, 2 * w / 3, h)
        g.drawLine(0, h / 3, w, h / 3); g.drawLine(0, 2 * h / 3, w, 2 * h / 3)
        // Centered watermark so it never hides under the console's own name/status chips.
        g.color = Color(255, 181, 71, 150)
        g.font = Font(Font.SANS_SERIF, Font.BOLD, 44)
        val fm = g.fontMetrics
        g.drawString("DEMO", (w - fm.stringWidth("DEMO")) / 2, h / 2 + 6)
        g.color = Color(255, 255, 255, 170)
        g.font = Font(Font.MONOSPACED, Font.BOLD, 13)
        val clock = "%.1fs".format(t)
        g.drawString(clock, (w - g.fontMetrics.stringWidth(clock)) / 2, h / 2 + 30)
        g.dispose()
        return ByteArrayOutputStream().use { ImageIO.write(img, "jpg", it); it.toByteArray() }
    }
}

data class DemoNode(val name: String, val port: Int, val pin: String)

/** Starts [count] demo camera servers on localhost and returns how to reach them. */
suspend fun startDemoCameras(count: Int, scope: CoroutineScope): List<DemoNode> =
    (0 until count).map { i ->
        val name = "DEMO CAM ${'A' + i}"
        val controller = DemoCameraController(name, i * 0.17f, scope)
        val server = CameraNodeServer(name, controller, scope, controllerDispatcher = Dispatchers.Default)
        DemoNode(name, server.start(), server.currentPin)
    }
