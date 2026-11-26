package com.directormodepro.app.ui

import androidx.compose.ui.graphics.Color
import com.directormodepro.app.camera.core.CameraBrand
import com.directormodepro.app.camera.core.CameraCapabilities
import com.directormodepro.app.camera.core.CameraConnectionStatus
import com.directormodepro.app.camera.core.CameraTransport
import com.directormodepro.app.camera.core.IntegrationLevel
import com.directormodepro.app.ui.theme.Accent
import com.directormodepro.app.ui.theme.AccentBg
import com.directormodepro.app.ui.theme.Danger
import com.directormodepro.app.ui.theme.DangerBg
import com.directormodepro.app.ui.theme.Muted
import com.directormodepro.app.ui.theme.Panel2
import com.directormodepro.app.ui.theme.Warning
import com.directormodepro.app.ui.theme.WarningBg

internal fun CameraBrand.label() = when (this) {
    CameraBrand.SONY -> "Sony"
    CameraBrand.DJI -> "DJI"
    CameraBrand.CANON -> "Canon"
    CameraBrand.BLACKMAGIC -> "Blackmagic Design"
    CameraBrand.PANASONIC -> "Panasonic"
    CameraBrand.GENERIC -> "Generic / Other"
}

internal fun CameraTransport.label() = when (this) {
    CameraTransport.RTSP -> "RTSP stream"
    CameraTransport.SRT -> "SRT stream"
    CameraTransport.WIFI -> "Wi-Fi"
    CameraTransport.ETHERNET -> "Ethernet / LAN"
    CameraTransport.USB -> "USB-C / UVC"
    CameraTransport.HDMI_CAPTURE -> "HDMI capture"
    CameraTransport.UNKNOWN -> "Unknown"
}

internal val selectableTransports = listOf(
    CameraTransport.RTSP, CameraTransport.SRT, CameraTransport.WIFI,
    CameraTransport.ETHERNET, CameraTransport.USB, CameraTransport.HDMI_CAPTURE
)

internal data class Badge(val text: String, val fg: Color, val bg: Color)

internal fun IntegrationLevel.badge() = when (this) {
    IntegrationLevel.RECEIVE_ONLY -> Badge("RECEIVE-ONLY", Accent, AccentBg)
    IntegrationLevel.INTEGRATION_TARGET -> Badge("INTEGRATION TARGET", Warning, WarningBg)
    IntegrationLevel.UNSUPPORTED -> Badge("UNSUPPORTED", Muted, Panel2)
}

internal fun statusBadge(status: CameraConnectionStatus, level: IntegrationLevel) = when (status) {
    CameraConnectionStatus.DISCONNECTED -> Badge("OFFLINE", Warning, WarningBg)
    CameraConnectionStatus.CONNECTING -> Badge("TESTING…", Accent, AccentBg)
    CameraConnectionStatus.CONNECTED -> Badge("REACHABLE", Accent, AccentBg)
    CameraConnectionStatus.STREAMING -> Badge("LIVE", Danger, DangerBg)
    CameraConnectionStatus.ERROR ->
        if (level == IntegrationLevel.RECEIVE_ONLY) Badge("ERROR", Danger, DangerBg)
        else Badge("NOT AVAILABLE", Muted, Panel2)
}

internal fun CameraCapabilities.asLabeledList() = listOf(
    "Preview" to livePreview,
    "Record" to remoteRecording,
    "ISO" to iso,
    "Shutter" to shutter,
    "Iris" to aperture,
    "WB" to whiteBalance,
    "Focus" to focus,
    "Zoom" to zoom,
    "Battery" to batteryLevel,
    "Media" to mediaStorage
)
