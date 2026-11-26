package com.directormodepro.app.camera.adapters.rtsp

import java.io.ByteArrayOutputStream
import java.io.IOException
import java.io.InputStream
import java.net.URI
import java.net.URISyntaxException

/** A validated rtsp:// URL without credentials. */
data class RtspUri(val raw: String, val host: String, val port: Int) {
    companion object {
        const val DEFAULT_PORT = 554

        fun parse(raw: String): RtspUri? {
            val uri = try { URI(raw.trim()) } catch (e: URISyntaxException) { return null }
            if (uri.scheme?.lowercase() != "rtsp") return null
            if (uri.rawUserInfo != null) return null
            val host = uri.host?.takeIf { it.isNotBlank() } ?: return null
            val port = if (uri.port == -1) DEFAULT_PORT else uri.port
            if (port !in 1..65535) return null
            return RtspUri(raw.trim(), host.removePrefix("[").removeSuffix("]"), port)
        }
    }
}

data class RtspResponse(
    val statusCode: Int,
    val reason: String,
    val headers: Map<String, String>,
    val body: String
)

/** Minimal RTSP/1.0 response reader (RFC 2326 §7) for DESCRIBE probes. */
object RtspResponseParser {
    private const val MAX_LINE_BYTES = 8 * 1024
    private const val MAX_HEADERS = 100
    const val MAX_BODY_BYTES = 64 * 1024

    fun read(input: InputStream): RtspResponse {
        val statusLine = readLine(input) ?: throw IOException("Connection closed before the server responded.")
        val parts = statusLine.split(' ', limit = 3)
        if (parts.size < 2 || !parts[0].startsWith("RTSP/")) throw IOException("The server did not answer with RTSP.")
        val code = parts[1].toIntOrNull() ?: throw IOException("Malformed RTSP status line.")
        val reason = parts.getOrElse(2) { "" }.trim()

        val headers = LinkedHashMap<String, String>()
        while (true) {
            val line = readLine(input) ?: break
            if (line.isEmpty()) break
            if (headers.size >= MAX_HEADERS) throw IOException("Too many RTSP headers.")
            val colon = line.indexOf(':')
            if (colon > 0) headers[line.substring(0, colon).trim().lowercase()] = line.substring(colon + 1).trim()
        }

        val length = headers["content-length"]?.toIntOrNull() ?: 0
        if (length < 0 || length > MAX_BODY_BYTES) throw IOException("RTSP body is too large.")
        val body = ByteArray(length)
        var offset = 0
        while (offset < length) {
            val n = input.read(body, offset, length - offset)
            if (n < 0) throw IOException("Connection closed while reading the stream description.")
            offset += n
        }
        return RtspResponse(code, reason, headers, body.decodeToString())
    }

    private fun readLine(input: InputStream): String? {
        val buffer = ByteArrayOutputStream()
        while (true) {
            val b = input.read()
            if (b < 0) return if (buffer.size() == 0) null else buffer.toString(Charsets.UTF_8.name())
            if (b == '\n'.code) break
            if (buffer.size() >= MAX_LINE_BYTES) throw IOException("RTSP header line is too long.")
            buffer.write(b)
        }
        return buffer.toString(Charsets.UTF_8.name()).removeSuffix("\r")
    }
}

data class SdpSummary(val hasVideo: Boolean, val hasAudio: Boolean, val videoCodecs: List<String>)

/** Extracts media types and video codec names from an SDP body (RFC 4566). */
object SdpParser {
    fun summarize(sdp: String): SdpSummary {
        var media: String? = null
        var hasVideo = false
        var hasAudio = false
        val codecs = LinkedHashSet<String>()
        for (raw in sdp.lineSequence()) {
            val line = raw.trim()
            when {
                line.startsWith("m=") -> {
                    media = line.removePrefix("m=").substringBefore(' ')
                    if (media == "video") hasVideo = true
                    if (media == "audio") hasAudio = true
                }
                line.startsWith("a=rtpmap:") && media == "video" -> {
                    // a=rtpmap:96 H264/90000
                    line.substringAfter(' ', "").substringBefore('/').takeIf { it.isNotBlank() }
                        ?.let { codecs += it.uppercase() }
                }
            }
        }
        return SdpSummary(hasVideo, hasAudio, codecs.toList())
    }
}
