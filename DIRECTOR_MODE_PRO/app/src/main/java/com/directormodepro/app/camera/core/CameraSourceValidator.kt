package com.directormodepro.app.camera.core

import java.net.URI
import java.net.URISyntaxException

enum class SourceField { NAME, MODEL, ENDPOINT }

enum class ValidationCode {
    NAME_REQUIRED, NAME_TOO_LONG, MODEL_TOO_LONG,
    URL_REQUIRED, URL_TOO_LONG, URL_INVALID, URL_WRONG_SCHEME, RTSPS_UNSUPPORTED,
    URL_HAS_CREDENTIALS, URL_NO_HOST, PORT_INVALID, HOST_INVALID, TRANSPORT_REQUIRED, SOURCE_NOT_FOUND, LENS_INVALID
}

/** Language-neutral validation result; the UI shows a localized message for [code]. */
data class ValidationError(val field: SourceField, val code: ValidationCode)

/** Pure validation for user-entered camera sources. No Android dependencies, so it is unit-testable. */
object CameraSourceValidator {
    const val MAX_NAME_LENGTH = 40
    const val MAX_MODEL_LENGTH = 60
    const val MAX_ENDPOINT_LENGTH = 512

    /** Transports where the endpoint field is shown in the form. */
    fun usesEndpoint(transport: CameraTransport): Boolean = transport in setOf(
        CameraTransport.WIFI, CameraTransport.ETHERNET, CameraTransport.RTSP, CameraTransport.SRT
    )

    /** Transports that persist an endpoint value (URL, host, or the built-in lens). */
    fun storesEndpoint(transport: CameraTransport): Boolean = usesEndpoint(transport) || transport == CameraTransport.BUILT_IN

    fun validate(draft: CameraSourceDraft): List<ValidationError> {
        val errors = mutableListOf<ValidationError>()
        val name = draft.name.trim()
        when {
            name.isEmpty() -> errors += ValidationError(SourceField.NAME, ValidationCode.NAME_REQUIRED)
            name.length > MAX_NAME_LENGTH -> errors += ValidationError(SourceField.NAME, ValidationCode.NAME_TOO_LONG)
        }
        if (draft.model.trim().length > MAX_MODEL_LENGTH) {
            errors += ValidationError(SourceField.MODEL, ValidationCode.MODEL_TOO_LONG)
        }
        val endpoint = draft.endpoint.trim()
        val endpointError = when (draft.transport) {
            CameraTransport.RTSP -> validateStreamUrl(endpoint, "rtsp")
            CameraTransport.SRT -> validateStreamUrl(endpoint, "srt")
            CameraTransport.WIFI, CameraTransport.ETHERNET ->
                if (endpoint.isEmpty() || parseHostPort(endpoint) != null) null else ValidationCode.HOST_INVALID
            CameraTransport.BUILT_IN ->
                if (endpoint.isEmpty() || CameraLens.fromEndpoint(endpoint) != null) null else ValidationCode.LENS_INVALID
            CameraTransport.UNKNOWN -> ValidationCode.TRANSPORT_REQUIRED
            else -> null
        }
        if (endpointError != null) errors += ValidationError(SourceField.ENDPOINT, endpointError)
        return errors
    }

    private fun validateStreamUrl(endpoint: String, scheme: String): ValidationCode? {
        if (endpoint.isEmpty()) return ValidationCode.URL_REQUIRED
        if (endpoint.length > MAX_ENDPOINT_LENGTH) return ValidationCode.URL_TOO_LONG
        val uri = try {
            URI(endpoint)
        } catch (e: URISyntaxException) {
            return ValidationCode.URL_INVALID
        }
        val actualScheme = uri.scheme?.lowercase()
        if (scheme == "rtsp" && actualScheme == "rtsps") return ValidationCode.RTSPS_UNSUPPORTED
        if (actualScheme != scheme) return ValidationCode.URL_WRONG_SCHEME
        // Credentials are rejected so no secret is ever persisted in plain text.
        if (uri.rawUserInfo != null) return ValidationCode.URL_HAS_CREDENTIALS
        if (uri.host.isNullOrBlank()) return ValidationCode.URL_NO_HOST
        if (uri.port != -1 && uri.port !in 1..65535) return ValidationCode.PORT_INVALID
        return null
    }

    /** Parses `host`, `host:port` or `[ipv6]:port`. Returns null when the input is not a plain host. */
    fun parseHostPort(input: String): Pair<String, Int?>? {
        val trimmed = input.trim()
        if (trimmed.isEmpty() || trimmed.contains("/") || trimmed.contains("@")) return null
        val uri = try {
            URI("tcp://$trimmed")
        } catch (e: URISyntaxException) {
            return null
        }
        val host = uri.host?.takeIf { it.isNotBlank() } ?: return null
        val port = uri.port.takeIf { it != -1 }
        if (port != null && port !in 1..65535) return null
        return host to port
    }
}
