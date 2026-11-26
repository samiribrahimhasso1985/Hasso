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

data class CameraStatus(
    val connection: CameraConnectionStatus = CameraConnectionStatus.DISCONNECTED,
    val message: String = "Not connected",
    val batteryPercent: Int? = null,
    val recording: Boolean = false
)

sealed interface CameraConnectionConfig {
    data class Network(val host: String, val port: Int? = null) : CameraConnectionConfig
    data class Usb(val deviceId: Int? = null) : CameraConnectionConfig
    data class Rtsp(val uri: String) : CameraConnectionConfig
    data class Srt(val uri: String) : CameraConnectionConfig
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
