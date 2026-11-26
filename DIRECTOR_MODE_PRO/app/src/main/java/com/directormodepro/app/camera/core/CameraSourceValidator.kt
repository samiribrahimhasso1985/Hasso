package com.directormodepro.app.camera.core

import java.net.URI
import java.net.URISyntaxException

enum class SourceField { NAME, MODEL, ENDPOINT }

data class ValidationError(val field: SourceField, val message: String)

/** Pure validation for user-entered camera sources. No Android dependencies, so it is unit-testable. */
object CameraSourceValidator {
    const val MAX_NAME_LENGTH = 40
    const val MAX_MODEL_LENGTH = 60
    const val MAX_ENDPOINT_LENGTH = 512

    /** Transports where the endpoint field is shown in the form. */
    fun usesEndpoint(transport: CameraTransport): Boolean = transport in setOf(
        CameraTransport.WIFI, CameraTransport.ETHERNET, CameraTransport.RTSP, CameraTransport.SRT
    )

    fun validate(draft: CameraSourceDraft): List<ValidationError> {
        val errors = mutableListOf<ValidationError>()
        val name = draft.name.trim()
        when {
            name.isEmpty() -> errors += ValidationError(SourceField.NAME, "Name is required.")
            name.length > MAX_NAME_LENGTH ->
                errors += ValidationError(SourceField.NAME, "Name must be $MAX_NAME_LENGTH characters or fewer.")
        }
        if (draft.model.trim().length > MAX_MODEL_LENGTH) {
            errors += ValidationError(SourceField.MODEL, "Model must be $MAX_MODEL_LENGTH characters or fewer.")
        }
        val endpoint = draft.endpoint.trim()
        val endpointError = when (draft.transport) {
            CameraTransport.RTSP -> validateStreamUrl(endpoint, "rtsp")
            CameraTransport.SRT -> validateStreamUrl(endpoint, "srt")
            CameraTransport.WIFI, CameraTransport.ETHERNET ->
                if (endpoint.isEmpty() || parseHostPort(endpoint) != null) null
                else "Enter a host or IP address, optionally with a port (e.g. 192.168.1.20:8080)."
            CameraTransport.UNKNOWN -> "Choose a connection method."
            else -> null
        }
        if (endpointError != null) errors += ValidationError(SourceField.ENDPOINT, endpointError)
        return errors
    }

    private fun validateStreamUrl(endpoint: String, scheme: String): String? {
        if (endpoint.isEmpty()) return "Stream URL is required, e.g. $scheme://192.168.1.50:554/stream"
        if (endpoint.length > MAX_ENDPOINT_LENGTH) return "URL is too long."
        val uri = try {
            URI(endpoint)
        } catch (e: URISyntaxException) {
            return "This is not a valid URL."
        }
        val actualScheme = uri.scheme?.lowercase()
        if (scheme == "rtsp" && actualScheme == "rtsps") return "Secure RTSP (rtsps://) is not supported yet."
        if (actualScheme != scheme) return "URL must start with $scheme://"
        if (uri.rawUserInfo != null) {
            return "Usernames/passwords in the URL are not stored by this build. " +
                "Use a stream without authentication until secure credential storage is added."
        }
        if (uri.host.isNullOrBlank()) return "URL must include a host name or IP address."
        if (uri.port != -1 && uri.port !in 1..65535) return "Port must be between 1 and 65535."
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
