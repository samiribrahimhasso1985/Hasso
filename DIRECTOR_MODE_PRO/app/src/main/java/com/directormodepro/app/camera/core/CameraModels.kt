package com.directormodepro.app.camera.core

/** Stable identifier used by the app for a registered camera source. */
@JvmInline
value class CameraId(val value: String)

enum class CameraBrand { SONY, DJI, CANON, BLACKMAGIC, PANASONIC, GENERIC }
enum class CameraTransport { WIFI, USB, ETHERNET, RTSP, SRT, HDMI_CAPTURE, UNKNOWN }
enum class CameraConnectionStatus { DISCONNECTED, CONNECTING, CONNECTED, STREAMING, ERROR }
enum class CameraControl { POWER, START_RECORDING, STOP_RECORDING, ISO, SHUTTER, APERTURE, WHITE_BALANCE, FOCUS, ZOOM }

data class CameraDescriptor(
    val id: CameraId,
    val displayName: String,
    val brand: CameraBrand,
    val model: String,
    val supportedTransports: Set<CameraTransport>,
    val description: String = ""
)

data class CameraCapabilities(
    val livePreview: Boolean = false,
    val remoteRecording: Boolean = false,
    val iso: Boolean = false,
    val shutter: Boolean = false,
    val aperture: Boolean = false,
    val whiteBalance: Boolean = false,
    val focus: Boolean = false,
    val zoom: Boolean = false,
    val batteryLevel: Boolean = false,
    val mediaStorage: Boolean = false
)

/** Language-neutral status messages; the UI turns them into localized text. */
sealed interface StatusMessage {
    data object NotConnected : StatusMessage
    data class Contacting(val host: String, val port: Int) : StatusMessage
    data class StreamReachable(val videoCodecs: List<String>) : StatusMessage
    data object NoVideoTrack : StatusMessage
    data object AuthenticationRequired : StatusMessage
    data object StreamNotFound : StatusMessage
    data class ServerRefused(val statusCode: Int, val reason: String) : StatusMessage
    data class NetworkError(val detail: String) : StatusMessage
    data class TimedOut(val seconds: Long) : StatusMessage
    data object RtspUrlRequired : StatusMessage
    data object RtspUrlInvalid : StatusMessage
    data class NotAvailable(val reason: IntegrationReason) : StatusMessage
}

data class CameraStatus(
    val connection: CameraConnectionStatus = CameraConnectionStatus.DISCONNECTED,
    val message: StatusMessage = StatusMessage.NotConnected,
    val batteryPercent: Int? = null,
    val recording: Boolean = false
)

sealed interface CameraConnectionConfig {
    data class Network(val host: String, val port: Int? = null) : CameraConnectionConfig
    data class Usb(val deviceId: Int? = null) : CameraConnectionConfig
    data class Rtsp(val uri: String) : CameraConnectionConfig
    data class Srt(val uri: String) : CameraConnectionConfig
    /** The user has not configured an endpoint for this transport. */
    data object None : CameraConnectionConfig
}

sealed interface CameraCommand {
    data object StartRecording : CameraCommand
    data object StopRecording : CameraCommand
    data class SetIso(val value: Int) : CameraCommand
    data class SetShutter(val value: String) : CameraCommand
    data class SetWhiteBalance(val kelvin: Int) : CameraCommand
    data class SetFocus(val value: Float) : CameraCommand
    data class SetZoom(val value: Float) : CameraCommand
}

sealed interface CameraResult {
    data object Success : CameraResult
    data class Unsupported(val reason: String) : CameraResult
    data class Failure(val reason: String, val cause: Throwable? = null) : CameraResult
}

/** A camera source the user created and that is persisted on the device. */
data class CameraSource(
    val id: CameraId,
    val name: String,
    val brand: CameraBrand,
    val model: String,
    val transport: CameraTransport,
    /** RTSP/SRT URL, or `host[:port]` for Wi-Fi/Ethernet. Empty when the transport has no endpoint. */
    val endpoint: String,
    val createdAtMillis: Long
)

/** User input from the add/edit form, before validation. */
data class CameraSourceDraft(
    val name: String = "",
    val brand: CameraBrand = CameraBrand.GENERIC,
    val model: String = "",
    val transport: CameraTransport = CameraTransport.RTSP,
    val endpoint: String = ""
)

fun CameraSource.toDraft() = CameraSourceDraft(name, brand, model, transport, endpoint)

fun CameraSource.toDescriptor() = CameraDescriptor(
    id = id,
    displayName = name,
    brand = brand,
    model = model,
    supportedTransports = setOf(transport)
)

fun CameraSource.toConnectionConfig(): CameraConnectionConfig = when (transport) {
    CameraTransport.RTSP -> if (endpoint.isBlank()) CameraConnectionConfig.None else CameraConnectionConfig.Rtsp(endpoint)
    CameraTransport.SRT -> if (endpoint.isBlank()) CameraConnectionConfig.None else CameraConnectionConfig.Srt(endpoint)
    CameraTransport.WIFI, CameraTransport.ETHERNET ->
        CameraSourceValidator.parseHostPort(endpoint)
            ?.let { (host, port) -> CameraConnectionConfig.Network(host, port) }
            ?: CameraConnectionConfig.None
    CameraTransport.USB, CameraTransport.HDMI_CAPTURE -> CameraConnectionConfig.Usb()
    CameraTransport.UNKNOWN -> CameraConnectionConfig.None
}

/** How far an integration has actually been validated. Never upgrade without hardware proof. */
enum class IntegrationLevel {
    /** A working, protocol-validated receiver (video in, no camera control). */
    RECEIVE_ONLY,
    /** A planned manufacturer integration that is not connectable yet. */
    INTEGRATION_TARGET,
    /** No adapter exists for this combination. */
    UNSUPPORTED
}

/** Why an integration has its level; mapped to localized text in the UI. */
enum class IntegrationReason { GENERIC_RTSP, SONY_TARGET, DJI_TARGET, SRT_PLANNED, USB_PLANNED, NO_ADAPTER }

data class IntegrationInfo(val level: IntegrationLevel, val reason: IntegrationReason)
