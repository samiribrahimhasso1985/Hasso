package com.directormodepro.app.link

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.conflate
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.IOException
import java.net.ServerSocket
import java.net.Socket

/** What the camera phone exposes to a linked director. Implemented by the CameraX layer. */
interface CameraNodeController {
    val status: StateFlow<NodeStatus>
    /** JPEG preview frames; only produced while preview is enabled. */
    val previewFrames: Flow<ByteArray>
    fun startRecording(take: String)
    fun stopRecording()
    fun setLens(lens: String)
    fun setZoom(linear: Float)
    fun setPreviewEnabled(enabled: Boolean)
}

sealed interface NodeServerState {
    data object Stopped : NodeServerState
    data class Waiting(val pin: String, val port: Int) : NodeServerState
    data class Linked(val pin: String, val port: Int, val directorName: String) : NodeServerState
}

/**
 * Runs on the camera phone. Accepts one director at a time; a second director is refused (BUSY).
 * Recording keeps going if the director disconnects, so a Wi-Fi drop never loses a take.
 */
class CameraNodeServer(
    private val deviceName: String,
    private val controller: CameraNodeController,
    private val scope: CoroutineScope,
    private val io: CoroutineDispatcher = Dispatchers.IO,
    /** CameraX must be driven from the main thread on Android. */
    private val controllerDispatcher: CoroutineDispatcher = Dispatchers.Main,
    private val pinGenerator: () -> String = PinAuth::newPin,
    private val authTimeoutMillis: Int = 30_000
) {
    private val mutableState = MutableStateFlow<NodeServerState>(NodeServerState.Stopped)
    val state: StateFlow<NodeServerState> = mutableState.asStateFlow()

    private var serverSocket: ServerSocket? = null
    private var acceptJob: Job? = null
    @Volatile private var activeSocket: Socket? = null
    @Volatile private var pin: String = pinGenerator()
    private var failedAttempts = 0

    val currentPin: String get() = pin

    /** Opens a listening port (chosen by the OS) and returns it. */
    suspend fun start(): Int = withContext(io) {
        serverSocket?.let { return@withContext it.localPort }
        val server = ServerSocket(0)
        serverSocket = server
        mutableState.value = NodeServerState.Waiting(pin, server.localPort)
        acceptJob = scope.launch(io) {
            while (isActive) {
                val socket = try {
                    server.accept()
                } catch (e: IOException) {
                    break // server closed
                }
                launch { handle(socket) }
            }
        }
        server.localPort
    }

    suspend fun stop() {
        withContext(io) {
            runCatching { serverSocket?.close() }
            runCatching { activeSocket?.close() }
        }
        acceptJob?.cancelAndJoin()
        serverSocket = null
        activeSocket = null
        mutableState.value = NodeServerState.Stopped
    }

    /** New code on request (e.g. the user suspects someone saw it). Disconnects nobody. */
    fun regeneratePin() {
        pin = pinGenerator()
        failedAttempts = 0
        val s = mutableState.value
        if (s is NodeServerState.Waiting) mutableState.value = s.copy(pin = pin)
        if (s is NodeServerState.Linked) mutableState.value = s.copy(pin = pin)
    }

    private suspend fun handle(socket: Socket) {
        socket.tcpNoDelay = true
        val input = DataInputStream(BufferedInputStream(socket.getInputStream()))
        val output = DataOutputStream(BufferedOutputStream(socket.getOutputStream()))
        val writeLock = Mutex()
        suspend fun send(frame: Frame) = writeLock.withLock { withContext(io) { FrameCodec.write(output, frame) } }

        try {
            if (activeSocket != null) {
                send(Frame.Message(AuthResult(false, AuthFailure.BUSY)))
                return
            }
            val nonce = PinAuth.newNonce()
            send(Frame.Message(Challenge(nonce, deviceName)))
            socket.soTimeout = authTimeoutMillis
            val auth = (withContext(io) { FrameCodec.read(input) } as? Frame.Message)?.message as? Auth ?: return
            if (!PinAuth.verify(pin, nonce, auth.mac)) {
                failedAttempts++
                val failure = if (failedAttempts >= MAX_ATTEMPTS) {
                    regeneratePin() // brute-force protection: the old code stops working
                    AuthFailure.TOO_MANY_ATTEMPTS
                } else {
                    AuthFailure.WRONG_PIN
                }
                send(Frame.Message(AuthResult(false, failure)))
                return
            }
            if (activeSocket != null) { // another director won the race
                send(Frame.Message(AuthResult(false, AuthFailure.BUSY)))
                return
            }
            failedAttempts = 0
            activeSocket = socket
            socket.soTimeout = 0
            send(Frame.Message(AuthResult(true)))
            mutableState.value = NodeServerState.Linked(pin, serverSocket?.localPort ?: socket.localPort, auth.directorName)
            runLinked(input, ::send)
        } catch (e: IOException) {
            // Director left or network dropped; handled in finally.
        } finally {
            if (activeSocket === socket) {
                activeSocket = null
                withContext(controllerDispatcher) { controller.setPreviewEnabled(false) }
                serverSocket?.let { mutableState.value = NodeServerState.Waiting(pin, it.localPort) }
            }
            runCatching { socket.close() }
        }
    }

    private suspend fun runLinked(input: DataInputStream, send: suspend (Frame) -> Unit) {
        val senders = scope.launch(io) {
            launch { controller.status.collect { send(Frame.Message(it)) } }
            launch { controller.previewFrames.conflate().collect { send(Frame.Jpeg(it)) } }
        }
        try {
            while (true) {
                val frame = withContext(io) { FrameCodec.read(input) }
                val message = (frame as? Frame.Message)?.message ?: continue
                withContext(controllerDispatcher) {
                    when (message) {
                        is StartRecording -> controller.startRecording(message.take)
                        StopRecording -> controller.stopRecording()
                        is SetLens -> controller.setLens(message.lens)
                        is SetZoom -> controller.setZoom(message.linear.coerceIn(0f, 1f))
                        is SetPreview -> controller.setPreviewEnabled(message.enabled)
                        else -> Unit
                    }
                }
                if (message == Bye) break
            }
        } finally {
            senders.cancel()
        }
    }

    companion object {
        const val MAX_ATTEMPTS = 5
    }
}
