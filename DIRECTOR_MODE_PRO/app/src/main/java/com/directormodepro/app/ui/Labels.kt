package com.directormodepro.app.ui

import androidx.annotation.StringRes
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import com.directormodepro.app.R
import com.directormodepro.app.camera.core.CameraBrand
import com.directormodepro.app.camera.core.CameraCapabilities
import com.directormodepro.app.camera.core.CameraConnectionStatus
import com.directormodepro.app.camera.core.CameraLens
import com.directormodepro.app.camera.core.CameraSourceValidator
import com.directormodepro.app.camera.core.CameraTransport
import com.directormodepro.app.camera.core.IntegrationLevel
import com.directormodepro.app.camera.core.IntegrationReason
import com.directormodepro.app.camera.core.StatusMessage
import com.directormodepro.app.camera.core.ValidationCode
import com.directormodepro.app.ui.theme.Accent
import com.directormodepro.app.ui.theme.AccentBg
import com.directormodepro.app.ui.theme.Danger
import com.directormodepro.app.ui.theme.DangerBg
import com.directormodepro.app.ui.theme.Muted
import com.directormodepro.app.ui.theme.Panel2
import com.directormodepro.app.ui.theme.Warning
import com.directormodepro.app.ui.theme.WarningBg

/** Manufacturer names are proper nouns and stay untranslated. */
@Composable
internal fun CameraBrand.label(): String = when (this) {
    CameraBrand.SONY -> "Sony"
    CameraBrand.DJI -> "DJI"
    CameraBrand.CANON -> "Canon"
    CameraBrand.BLACKMAGIC -> "Blackmagic Design"
    CameraBrand.PANASONIC -> "Panasonic"
    CameraBrand.GENERIC -> stringResource(R.string.brand_generic)
    CameraBrand.DEVICE -> stringResource(R.string.brand_device)
}

@Composable
internal fun CameraTransport.label(): String = stringResource(
    when (this) {
        CameraTransport.RTSP -> R.string.transport_rtsp
        CameraTransport.SRT -> R.string.transport_srt
        CameraTransport.WIFI -> R.string.transport_wifi
        CameraTransport.ETHERNET -> R.string.transport_ethernet
        CameraTransport.USB -> R.string.transport_usb
        CameraTransport.HDMI_CAPTURE -> R.string.transport_hdmi
        CameraTransport.BUILT_IN -> R.string.transport_builtin
        CameraTransport.UNKNOWN -> R.string.transport_unknown
    }
)

internal val selectableTransports = listOf(
    CameraTransport.BUILT_IN, CameraTransport.RTSP, CameraTransport.SRT, CameraTransport.WIFI,
    CameraTransport.ETHERNET, CameraTransport.USB, CameraTransport.HDMI_CAPTURE
)

internal data class Badge(@param:StringRes val text: Int, val fg: Color, val bg: Color)

internal fun IntegrationLevel.badge() = when (this) {
    IntegrationLevel.RECEIVE_ONLY -> Badge(R.string.badge_receive_only, Accent, AccentBg)
    IntegrationLevel.ON_DEVICE -> Badge(R.string.badge_on_device, Accent, AccentBg)
    IntegrationLevel.INTEGRATION_TARGET -> Badge(R.string.badge_integration_target, Warning, WarningBg)
    IntegrationLevel.UNSUPPORTED -> Badge(R.string.badge_unsupported, Muted, Panel2)
}

internal fun statusBadge(status: CameraConnectionStatus, level: IntegrationLevel) = when (status) {
    CameraConnectionStatus.DISCONNECTED -> Badge(R.string.status_offline, Warning, WarningBg)
    CameraConnectionStatus.CONNECTING -> Badge(R.string.status_testing, Accent, AccentBg)
    CameraConnectionStatus.CONNECTED -> Badge(R.string.status_reachable, Accent, AccentBg)
    CameraConnectionStatus.STREAMING -> Badge(R.string.status_live, Danger, DangerBg)
    CameraConnectionStatus.ERROR ->
        if (level.isConnectable()) Badge(R.string.status_error, Danger, DangerBg)
        else Badge(R.string.status_not_available, Muted, Panel2)
}

/** Levels whose adapters can actually connect (and therefore fail with a real error). */
internal fun IntegrationLevel.isConnectable() = this == IntegrationLevel.RECEIVE_ONLY || this == IntegrationLevel.ON_DEVICE

@Composable
internal fun CameraLens.label(): String = stringResource(if (this == CameraLens.FRONT) R.string.lens_front else R.string.lens_back)

@Composable
internal fun IntegrationReason.text(): String = stringResource(
    when (this) {
        IntegrationReason.PHONE_CAMERA -> R.string.reason_phone
        IntegrationReason.GENERIC_RTSP -> R.string.reason_generic_rtsp
        IntegrationReason.SONY_TARGET -> R.string.reason_sony
        IntegrationReason.DJI_TARGET -> R.string.reason_dji
        IntegrationReason.SRT_PLANNED -> R.string.reason_srt
        IntegrationReason.USB_PLANNED -> R.string.reason_usb
        IntegrationReason.NO_ADAPTER -> R.string.reason_none
    }
)

@Composable
internal fun StatusMessage.text(): String = when (this) {
    StatusMessage.NotConnected -> stringResource(R.string.msg_not_connected)
    is StatusMessage.Contacting -> stringResource(R.string.msg_contacting, host, port)
    is StatusMessage.StreamReachable -> stringResource(
        R.string.msg_reachable,
        videoCodecs.joinToString().ifEmpty { stringResource(R.string.msg_unknown_codec) }
    )
    StatusMessage.NoVideoTrack -> stringResource(R.string.msg_no_video)
    StatusMessage.AuthenticationRequired -> stringResource(R.string.msg_auth)
    StatusMessage.StreamNotFound -> stringResource(R.string.msg_not_found)
    is StatusMessage.ServerRefused -> stringResource(R.string.msg_refused, statusCode, reason).trim()
    is StatusMessage.NetworkError -> stringResource(R.string.msg_network, detail)
    is StatusMessage.TimedOut -> stringResource(R.string.msg_timeout, seconds.toInt())
    StatusMessage.RtspUrlRequired -> stringResource(R.string.msg_rtsp_required)
    StatusMessage.RtspUrlInvalid -> stringResource(R.string.msg_rtsp_invalid)
    is StatusMessage.NotAvailable -> reason.text()
    is StatusMessage.PhoneCameraReady -> stringResource(R.string.msg_phone_ready, lens.label())
    is StatusMessage.PhoneCameraMissing -> stringResource(R.string.msg_phone_missing, lens.label())
    StatusMessage.WrongConfiguration -> stringResource(R.string.msg_wrong_config)
}

@Composable
internal fun ValidationCode.text(): String = when (this) {
    ValidationCode.NAME_REQUIRED -> stringResource(R.string.err_name_required)
    ValidationCode.NAME_TOO_LONG -> stringResource(R.string.err_name_too_long, CameraSourceValidator.MAX_NAME_LENGTH)
    ValidationCode.MODEL_TOO_LONG -> stringResource(R.string.err_model_too_long, CameraSourceValidator.MAX_MODEL_LENGTH)
    ValidationCode.URL_REQUIRED -> stringResource(R.string.err_url_required)
    ValidationCode.URL_TOO_LONG -> stringResource(R.string.err_url_too_long)
    ValidationCode.URL_INVALID -> stringResource(R.string.err_url_invalid)
    ValidationCode.URL_WRONG_SCHEME -> stringResource(R.string.err_url_scheme)
    ValidationCode.RTSPS_UNSUPPORTED -> stringResource(R.string.err_rtsps)
    ValidationCode.URL_HAS_CREDENTIALS -> stringResource(R.string.err_credentials)
    ValidationCode.URL_NO_HOST -> stringResource(R.string.err_no_host)
    ValidationCode.PORT_INVALID -> stringResource(R.string.err_port)
    ValidationCode.HOST_INVALID -> stringResource(R.string.err_host)
    ValidationCode.TRANSPORT_REQUIRED -> stringResource(R.string.err_transport)
    ValidationCode.SOURCE_NOT_FOUND -> stringResource(R.string.err_not_found)
    ValidationCode.LENS_INVALID -> stringResource(R.string.err_lens)
}

internal fun CameraCapabilities.asLabeledList(): List<Pair<Int, Boolean>> = listOf(
    R.string.cap_preview to livePreview,
    R.string.cap_record to remoteRecording,
    R.string.cap_iso to iso,
    R.string.cap_shutter to shutter,
    R.string.cap_iris to aperture,
    R.string.cap_wb to whiteBalance,
    R.string.cap_focus to focus,
    R.string.cap_zoom to zoom,
    R.string.cap_battery to batteryLevel,
    R.string.cap_media to mediaStorage
)
