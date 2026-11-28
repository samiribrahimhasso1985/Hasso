package com.directormodepro.app.link

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.IOException
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Director <-> camera-phone protocol (both ends are this app, on the same local network).
 *
 * Transport: one TCP connection per camera phone, length-prefixed frames:
 *   [1 byte type][4 bytes big-endian length][payload]
 * type 1 = UTF-8 JSON [LinkMessage], type 2 = JPEG preview frame.
 *
 * Pairing: the camera shows a 6-digit PIN. It sends a random nonce; the director answers with
 * HMAC-SHA256(key = PIN, data = nonce). The PIN itself never travels over the network and is
 * never written to disk.
 */
const val PROTOCOL_VERSION = 1

/** Android NSD service type advertised by camera phones. */
const val NSD_SERVICE_TYPE = "_dmpcam._tcp"

@Serializable
sealed interface LinkMessage

@Serializable @SerialName("challenge")
data class Challenge(val nonce: String, val deviceName: String, val protocol: Int = PROTOCOL_VERSION) : LinkMessage

@Serializable @SerialName("auth")
data class Auth(val mac: String, val directorName: String) : LinkMessage

@Serializable @SerialName("auth_result")
data class AuthResult(val ok: Boolean, val failure: AuthFailure? = null) : LinkMessage

@Serializable
enum class AuthFailure { WRONG_PIN, TOO_MANY_ATTEMPTS, BUSY, PROTOCOL_MISMATCH }

@Serializable @SerialName("start")
data class StartRecording(val take: String) : LinkMessage

@Serializable @SerialName("stop")
data object StopRecording : LinkMessage

/** lens = "back" or "front" (same values as CameraLens.endpointValue). */
@Serializable @SerialName("lens")
data class SetLens(val lens: String) : LinkMessage

@Serializable @SerialName("zoom")
data class SetZoom(val linear: Float) : LinkMessage

@Serializable @SerialName("preview")
data class SetPreview(val enabled: Boolean) : LinkMessage

/** Everything the director shows for a camera phone. Values are measured on the camera phone. */
@Serializable @SerialName("status")
data class NodeStatus(
    val cameraReady: Boolean = false,
    val recording: Boolean = false,
    val recordedSeconds: Long = 0,
    val batteryPercent: Int? = null,
    val charging: Boolean = false,
    val freeBytes: Long? = null,
    val lens: String = "back",
    val zoom: Float = 0f,
    val previewAvailable: Boolean = false,
    val lastSavedTake: String? = null,
    val error: String? = null
) : LinkMessage

@Serializable @SerialName("bye")
data object Bye : LinkMessage

object LinkJson {
    val json = Json {
        classDiscriminator = "t"
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    fun encode(message: LinkMessage): String = json.encodeToString(LinkMessage.serializer(), message)
    fun decode(text: String): LinkMessage = json.decodeFromString(LinkMessage.serializer(), text)
}

sealed interface Frame {
    data class Message(val message: LinkMessage) : Frame
    class Jpeg(val bytes: ByteArray) : Frame
}

object FrameCodec {
    const val TYPE_MESSAGE: Int = 1
    const val TYPE_JPEG: Int = 2
    const val MAX_FRAME_BYTES = 2 * 1024 * 1024

    /** Not thread-safe: callers serialize writes (one writer per socket). */
    fun write(out: DataOutputStream, frame: Frame) {
        val (type, payload) = when (frame) {
            is Frame.Message -> TYPE_MESSAGE to LinkJson.encode(frame.message).encodeToByteArray()
            is Frame.Jpeg -> TYPE_JPEG to frame.bytes
        }
        require(payload.size <= MAX_FRAME_BYTES) { "Frame too large" }
        out.writeByte(type)
        out.writeInt(payload.size)
        out.write(payload)
        out.flush()
    }

    /** Throws EOFException when the peer closes the connection. */
    fun read(input: DataInputStream): Frame {
        val type = input.readUnsignedByte()
        val length = input.readInt()
        if (length < 0 || length > MAX_FRAME_BYTES) throw IOException("Invalid frame length $length")
        val payload = ByteArray(length)
        input.readFully(payload)
        return when (type) {
            TYPE_MESSAGE -> Frame.Message(
                try {
                    LinkJson.decode(payload.decodeToString())
                } catch (e: IllegalArgumentException) {
                    throw IOException("Malformed message", e)
                }
            )
            TYPE_JPEG -> Frame.Jpeg(payload)
            else -> throw IOException("Unknown frame type $type")
        }
    }
}

object PinAuth {
    private val random = SecureRandom()

    fun newPin(): String = (random.nextInt(900_000) + 100_000).toString()

    fun newNonce(): String = ByteArray(16).also(random::nextBytes).toHex()

    fun mac(pin: String, nonce: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(pin.encodeToByteArray(), "HmacSHA256"))
        return mac.doFinal(nonce.encodeToByteArray()).toHex()
    }

    /** Constant-time comparison so timing does not reveal how much of the MAC matched. */
    fun verify(pin: String, nonce: String, mac: String): Boolean =
        MessageDigest.isEqual(mac(pin, nonce).encodeToByteArray(), mac.encodeToByteArray())

    private fun ByteArray.toHex() = joinToString("") { "%02x".format(it) }
}
