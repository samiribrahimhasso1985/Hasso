package com.directormodepro.app.camera.adapters.rtsp

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.withContext
import java.io.IOException
import java.net.InetSocketAddress
import java.net.Socket
import java.net.SocketTimeoutException
import kotlin.coroutines.coroutineContext

sealed interface RtspProbeResult {
    data class Reachable(val sdp: SdpSummary) : RtspProbeResult
    data class Rejected(val statusCode: Int, val reason: String) : RtspProbeResult
    data class NetworkError(val message: String) : RtspProbeResult
    data object TimedOut : RtspProbeResult
}

/** Checks whether an RTSP server answers and describes a stream. */
fun interface RtspProbe {
    suspend fun describe(uri: RtspUri): RtspProbeResult
}

/**
 * Sends a single RTSP DESCRIBE over TCP and parses the SDP answer.
 * This is a real protocol exchange with the user's server; nothing is simulated.
 */
class SocketRtspProbe(
    private val connectTimeoutMillis: Int = 5_000,
    private val readTimeoutMillis: Int = 5_000,
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO
) : RtspProbe {

    override suspend fun describe(uri: RtspUri): RtspProbeResult = withContext(dispatcher) {
        val socket = Socket()
        // Closing the socket unblocks I/O if the coroutine is cancelled (e.g. a timeout).
        val cancelHandle = coroutineContext[Job]?.invokeOnCompletion { runCatching { socket.close() } }
        try {
            socket.connect(InetSocketAddress(uri.host, uri.port), connectTimeoutMillis)
            socket.soTimeout = readTimeoutMillis
            val request = buildString {
                append("DESCRIBE ").append(uri.raw).append(" RTSP/1.0\r\n")
                append("CSeq: 1\r\n")
                append("Accept: application/sdp\r\n")
                append("User-Agent: DirectorModePro\r\n")
                append("\r\n")
            }
            socket.getOutputStream().apply {
                write(request.toByteArray(Charsets.US_ASCII))
                flush()
            }
            val response = RtspResponseParser.read(socket.getInputStream())
            if (response.statusCode == 200) {
                RtspProbeResult.Reachable(SdpParser.summarize(response.body))
            } else {
                RtspProbeResult.Rejected(response.statusCode, response.reason)
            }
        } catch (e: SocketTimeoutException) {
            RtspProbeResult.TimedOut
        } catch (e: IOException) {
            RtspProbeResult.NetworkError(e.message?.takeIf { it.isNotBlank() } ?: e.javaClass.simpleName)
        } finally {
            cancelHandle?.dispose()
            runCatching { socket.close() }
        }
    }
}
