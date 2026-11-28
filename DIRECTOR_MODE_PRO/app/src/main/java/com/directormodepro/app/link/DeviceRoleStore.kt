package com.directormodepro.app.link

import android.content.Context
import android.os.Build
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class DeviceRole { DIRECTOR, CAMERA }

/** Non-secret device preferences (role and display name). */
class DeviceRoleStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences("device_role", Context.MODE_PRIVATE)
    private val mutableRole = MutableStateFlow(prefs.getString(KEY_ROLE, null)?.let { r -> DeviceRole.entries.firstOrNull { it.name == r } })
    val role: StateFlow<DeviceRole?> = mutableRole.asStateFlow()

    var deviceLabel: String
        get() = prefs.getString(KEY_LABEL, null)?.takeIf { it.isNotBlank() } ?: Build.MODEL.orEmpty().ifBlank { "Android" }
        set(value) { prefs.edit().putString(KEY_LABEL, value.trim().take(30)).apply() }

    fun setRole(role: DeviceRole?) {
        prefs.edit().putString(KEY_ROLE, role?.name).apply()
        mutableRole.value = role
    }

    private companion object {
        const val KEY_ROLE = "role"
        const val KEY_LABEL = "label"
    }
}
