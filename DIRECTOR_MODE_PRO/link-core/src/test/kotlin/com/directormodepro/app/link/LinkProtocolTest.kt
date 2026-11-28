package com.directormodepro.app.link

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.IOException

class LinkProtocolTest {
    @Test fun framesRoundTrip() {
        val buffer = ByteArrayOutputStream()
        val out = DataOutputStream(buffer)
        val status = NodeStatus(cameraReady = true, recording = true, recordedSeconds = 42, batteryPercent = 77, lens = "front")
        FrameCodec.write(out, Frame.Message(StartRecording("TAKE_1")))
        FrameCodec.write(out, Frame.Message(status))
        FrameCodec.write(out, Frame.Message(StopRecording))
        FrameCodec.write(out, Frame.Jpeg(byteArrayOf(1, 2, 3)))
        val input = DataInputStream(ByteArrayInputStream(buffer.toByteArray()))
        assertEquals(StartRecording("TAKE_1"), (FrameCodec.read(input) as Frame.Message).message)
        assertEquals(status, (FrameCodec.read(input) as Frame.Message).message)
        assertEquals(StopRecording, (FrameCodec.read(input) as Frame.Message).message)
        assertArrayEquals(byteArrayOf(1, 2, 3), (FrameCodec.read(input) as Frame.Jpeg).bytes)
    }

    @Test(expected = IOException::class)
    fun rejectsOversizedFrame() {
        val buffer = ByteArrayOutputStream()
        DataOutputStream(buffer).apply { writeByte(1); writeInt(FrameCodec.MAX_FRAME_BYTES + 1) }
        FrameCodec.read(DataInputStream(ByteArrayInputStream(buffer.toByteArray())))
    }

    @Test(expected = IOException::class)
    fun rejectsGarbageJson() {
        val buffer = ByteArrayOutputStream()
        val payload = "{not json".encodeToByteArray()
        DataOutputStream(buffer).apply { writeByte(1); writeInt(payload.size); write(payload) }
        FrameCodec.read(DataInputStream(ByteArrayInputStream(buffer.toByteArray())))
    }

    @Test fun pinAuth() {
        val pin = PinAuth.newPin()
        assertEquals(6, pin.length)
        val nonce = PinAuth.newNonce()
        val mac = PinAuth.mac(pin, nonce)
        assertTrue(PinAuth.verify(pin, nonce, mac))
        assertFalse(PinAuth.verify("000000".takeIf { it != pin } ?: "111111", nonce, mac))
        assertFalse(PinAuth.verify(pin, PinAuth.newNonce(), mac)) // a replayed MAC is useless with a new nonce
        assertFalse(mac.contains(pin))
        assertNotEquals(PinAuth.newNonce(), PinAuth.newNonce())
    }
}

/** Real TCP between a camera server and director clients on localhost. */
class LinkEndToEndTest {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val controller = FakeController()
    private val server = CameraNodeServer(
        deviceName = "Pixel Test", controller = controller, scope = scope,
        controllerDispatcher = Dispatchers.IO, pinGenerator = { "123456" }, authTimeoutMillis = 5_000
    )

    @After fun tearDown() = runBlocking {
        server.stop()
        scope.cancel()
    }

    private suspend fun <T> await(flow: StateFlow<T>, predicate: (T) -> Boolean): T =
        withTimeout(10_000) { flow.first(predicate) }

    @Test fun wrongPinIsRejectedAndNothingIsControlled() = runBlocking {
        val port = server.start()
        val session = DirectorSession("Director", scope)
        val client = session.connect(NodeEndpoint("127.0.0.1", port, "cam"), "999999")
        assertEquals(LinkState.Failed(LinkFailure.WRONG_PIN), await(client.state) { it is LinkState.Failed })
        assertEquals(0, session.recordAll("T"))
        assertTrue(controller.commands.isEmpty())
    }

    @Test fun linkRecordStopStatusAndPreview() = runBlocking {
        val port = server.start()
        val session = DirectorSession("Director", scope)
        val client = session.connect(NodeEndpoint("127.0.0.1", port, "cam"), "123456")
        assertEquals(LinkState.Linked("Pixel Test"), await(client.state) { it is LinkState.Linked })
        await(server.state) { it is NodeServerState.Linked && it.directorName == "Director" }

        assertEquals(1, session.recordAll("TAKE_A"))
        withTimeout(5_000) { while ("start:TAKE_A" !in controller.commands) kotlinx.coroutines.delay(20) }

        controller.status.update { it.copy(recording = true, recordedSeconds = 3, batteryPercent = 64) }
        val seen = await(client.status) { it?.recording == true }
        assertEquals(64, seen?.batteryPercent)

        // The director asked for preview on link; frames flow through as JPEG frames.
        withTimeout(5_000) { while (!controller.previewOn) kotlinx.coroutines.delay(20) }
        controller.frames.emit(byteArrayOf(9, 8, 7))
        assertArrayEquals(byteArrayOf(9, 8, 7), await(client.latestFrame) { it != null })

        client.send(SetLens("front"))
        client.send(SetZoom(5f)) // clamped on the camera side
        assertEquals(1, session.stopAll())
        withTimeout(5_000) { while ("stop" !in controller.commands) kotlinx.coroutines.delay(20) }
        assertTrue("lens:front" in controller.commands)
        assertTrue("zoom:1.0" in controller.commands)
    }

    @Test fun secondDirectorIsRefusedAsBusy() = runBlocking {
        val port = server.start()
        val first = DirectorSession("A", scope).connect(NodeEndpoint("127.0.0.1", port, "cam"), "123456")
        await(first.state) { it is LinkState.Linked }
        val second = DirectorSession("B", scope).connect(NodeEndpoint("127.0.0.1", port, "cam"), "123456")
        assertEquals(LinkState.Failed(LinkFailure.BUSY), await(second.state) { it is LinkState.Failed })
    }

    @Test fun tooManyWrongPinsChangesTheCode() = runBlocking {
        var next = 0
        val pins = listOf("111111", "222222")
        val guarded = CameraNodeServer("Cam", controller, scope, controllerDispatcher = Dispatchers.IO, pinGenerator = { pins[minOf(next++, 1)] })
        val port = guarded.start()
        repeat(CameraNodeServer.MAX_ATTEMPTS) {
            val c = DirectorLinkClient(NodeEndpoint("127.0.0.1", port, "cam"), "D", scope)
            c.connect("000000")
            await(c.state) { it is LinkState.Failed }
        }
        assertEquals("222222", guarded.currentPin)
        // The old code no longer works.
        val c = DirectorLinkClient(NodeEndpoint("127.0.0.1", port, "cam"), "D", scope).also { it.connect("111111") }
        assertEquals(LinkState.Failed(LinkFailure.WRONG_PIN), await(c.state) { it is LinkState.Failed })
        guarded.stop()
    }

    @Test fun unreachableCameraFails() = runBlocking {
        val port = java.net.ServerSocket(0).use { it.localPort }
        val c = DirectorLinkClient(NodeEndpoint("127.0.0.1", port, "cam"), "D", scope, connectTimeoutMillis = 2_000)
        c.connect("123456")
        assertEquals(LinkState.Failed(LinkFailure.UNREACHABLE), await(c.state) { it is LinkState.Failed })
    }

    @Test fun takeNamesAreSharedAndSortable() {
        val session = DirectorSession("D", scope, clock = { 0L })
        assertTrue(session.newTakeName().startsWith("TAKE_1970"))
    }
}

class FakeController : CameraNodeController {
    override val status = MutableStateFlow(NodeStatus(cameraReady = true))
    val frames = MutableSharedFlow<ByteArray>(extraBufferCapacity = 4)
    override val previewFrames: Flow<ByteArray> = frames
    val commands = java.util.Collections.synchronizedList(mutableListOf<String>())
    @Volatile var previewOn = false

    override fun startRecording(take: String) { commands += "start:$take" }
    override fun stopRecording() { commands += "stop" }
    override fun setLens(lens: String) { commands += "lens:$lens" }
    override fun setZoom(linear: Float) { commands += "zoom:$linear" }
    override fun setPreviewEnabled(enabled: Boolean) { previewOn = enabled }
}
