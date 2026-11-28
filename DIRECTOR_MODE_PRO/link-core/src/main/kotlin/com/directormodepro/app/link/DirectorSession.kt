package com.directormodepro.app.link

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.IOException
import java.net.InetSocketAddress
import java.net.Socket
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Where a camera phone can be reached (from discovery or typed in by the user). */
data class NodeEndpoint(val host: String, val port: Int, val name: String) {
    val key: String get() = "$host:$port"
}

sealed interface LinkState {
    data object Connecting : LinkState
    data class Linked(val deviceName: String) : LinkState
    /** Lost the connection; retrying automatically with the PIN kept in memory. */
    data object Reconnecting : LinkState
    data class Failed(val reason: LinkFailure) : LinkState
}

enum class LinkFailure { WRONG_PIN, TOO_MANY_ATTEMPTS, BUSY, PROTOCOL_MISMATCH, UNREACHABLE }

/** One camera phone as seen by the director. */
class DirectorLinkClient(
    val endpoint: NodeEndpoint,
    private val directorName: String,
    private val scope: CoroutineScope,
    private val io: CoroutineDispatcher = Dispatchers.IO,
    private val connectTimeoutMillis: Int = 5_000,
    private val reconnectDelayMillis: Long = 3_000
) {
    private val mutableState = MutableStateFlow<LinkState>(LinkState.Connecting)
    val state: StateFlow<LinkState> = mutableState.asStateFlow()
    private val mutableStatus = MutableStateFlow<NodeStatus?>(null)
    val status: StateFlow<NodeStatus?> = mutableStatus.asStateFlow()
    private val mutableFrame = MutableStateFlow<ByteArray?>(null)
    val latestFrame: StateFlow<ByteArray?> = mutableFrame.asStateFlow()

    /** Held only in memory for automatic reconnects; never persisted. */
    @Volatile private var pin: String = ""
    @Volatile private var socket: Socket? = null
    @Volatile private var output: DataOutputStream? = null
    @Volatile private var wantPreview = true
    private val writeLock = Mutex()
    private var job: Job? = null

    fun connect(pin: String) {
        this.pin = pin
        job?.cancel()
        job = scope.launch(io) {
            var everLinked = false
            while (true) {
                mutableState.value = if (everLinked) LinkState.Reconnecting else LinkState.Connecting
                val failure = runOnce()
                if (failure == null) {
                    everLinked = true // connection ended after a successful link: retry
                } else if (failure != LinkFailure.UNREACHABLE || !everLinked) {
                    mutableState.value = LinkState.Failed(failure)
                    return@launch
                }
                mutableStatus.value = null
                mutableFrame.value = null
                delay(reconnectDelayMillis)
            }
        }
    }

    /** Returns null if the link was established and later closed, or the reason it failed. */
    private suspend fun runOnce(): LinkFailure? {
        val s = Socket()
        try {
            s.connect(InetSocketAddress(endpoint.host, endpoint.port), connectTimeoutMillis)
            s.tcpNoDelay = true
            socket = s
            val input = DataInputStream(BufferedInputStream(s.getInputStream()))
            val out = DataOutputStream(BufferedOutputStream(s.getOutputStream()))
            s.soTimeout = 10_000
            val first = (FrameCodec.read(input) as? Frame.Message)?.message
            if (first is AuthResult) return first.failure?.toLinkFailure() ?: LinkFailure.PROTOCOL_MISMATCH
            val challenge = first as? Challenge ?: return LinkFailure.PROTOCOL_MISMATCH
            if (challenge.protocol != PROTOCOL_VERSION) return LinkFailure.PROTOCOL_MISMATCH
            FrameCodec.write(out, Frame.Message(Auth(PinAuth.mac(pin, challenge.nonce), directorName)))
            val result = (FrameCodec.read(input) as? Frame.Message)?.message as? AuthResult
                ?: return LinkFailure.PROTOCOL_MISMATCH
            if (!result.ok) return result.failure?.toLinkFailure() ?: LinkFailure.WRONG_PIN

            s.soTimeout = 0
            output = out
            mutableState.value = LinkState.Linked(challenge.deviceName)
            send(SetPreview(wantPreview))
            while (true) {
                when (val frame = FrameCodec.read(input)) {
                    is Frame.Jpeg -> mutableFrame.value = frame.bytes
                    is Frame.Message -> (frame.message as? NodeStatus)?.let { mutableStatus.value = it }
                }
            }
        } catch (e: IOException) {
            return if (state.value is LinkState.Linked) null else LinkFailure.UNREACHABLE
        } finally {
            output = null
            socket = null
            runCatching { s.close() }
        }
    }

    /** Sends a command if linked; returns false when the camera is not reachable right now. */
    suspend fun send(message: LinkMessage): Boolean = writeLock.withLock {
        val out = output ?: return@withLock false
        withContext(io) {
            try {
                FrameCodec.write(out, Frame.Message(message))
                true
            } catch (e: IOException) {
                false
            }
        }
    }

    suspend fun setPreview(enabled: Boolean) {
        wantPreview = enabled
        if (!enabled) mutableFrame.value = null
        send(SetPreview(enabled))
    }

    fun close() {
        job?.cancel()
        scope.launch(io) {
            send(Bye)
            runCatching { socket?.close() }
        }
    }

    private fun AuthFailure.toLinkFailure() = when (this) {
        AuthFailure.WRONG_PIN -> LinkFailure.WRONG_PIN
        AuthFailure.TOO_MANY_ATTEMPTS -> LinkFailure.TOO_MANY_ATTEMPTS
        AuthFailure.BUSY -> LinkFailure.BUSY
        AuthFailure.PROTOCOL_MISMATCH -> LinkFailure.PROTOCOL_MISMATCH
    }
}

/** All camera phones linked to this director. Lives for the whole app process. */
class DirectorSession(
    private val directorName: String,
    private val scope: CoroutineScope,
    private val io: CoroutineDispatcher = Dispatchers.IO,
    private val clock: () -> Long = System::currentTimeMillis
) {
    private val mutableClients = MutableStateFlow<List<DirectorLinkClient>>(emptyList())
    val clients: StateFlow<List<DirectorLinkClient>> = mutableClients.asStateFlow()

    fun connect(endpoint: NodeEndpoint, pin: String): DirectorLinkClient {
        mutableClients.value.firstOrNull { it.endpoint.key == endpoint.key }?.let {
            it.connect(pin)
            return it
        }
        val client = DirectorLinkClient(endpoint, directorName, scope, io)
        mutableClients.update { it + client }
        client.connect(pin)
        return client
    }

    fun remove(client: DirectorLinkClient) {
        client.close()
        mutableClients.update { it - client }
    }

    /** One shared take name so the files from every phone can be matched in the edit. */
    fun newTakeName(): String = "TAKE_" + SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date(clock()))

    /** Returns how many linked phones accepted the command. */
    suspend fun recordAll(take: String = newTakeName()): Int =
        linked().count { it.send(StartRecording(take)) }

    suspend fun stopAll(): Int = linked().count { it.send(StopRecording) }

    private fun linked() = mutableClients.value.filter { it.state.value is LinkState.Linked }
}
