package com.directormodepro.app.camera.adapters

import android.content.Context
import android.hardware.camera2.CameraAccessException
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import com.directormodepro.app.camera.core.CameraAdapter
import com.directormodepro.app.camera.core.CameraCapabilities
import com.directormodepro.app.camera.core.CameraCommand
import com.directormodepro.app.camera.core.CameraConnectionConfig
import com.directormodepro.app.camera.core.CameraConnectionStatus
import com.directormodepro.app.camera.core.CameraDescriptor
import com.directormodepro.app.camera.core.CameraLens
import com.directormodepro.app.camera.core.CameraResult
import com.directormodepro.app.camera.core.CameraStatus
import com.directormodepro.app.camera.core.StatusMessage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Reports whether this device has a camera facing the given way. */
fun interface PhoneCameraAvailability {
    fun hasLens(lens: CameraLens): Boolean
}

/** Uses the Camera2 system service; listing cameras needs no runtime permission. */
class Camera2Availability(context: Context) : PhoneCameraAvailability {
    private val manager = context.applicationContext.getSystemService(CameraManager::class.java)

    override fun hasLens(lens: CameraLens): Boolean {
        val facing = when (lens) {
            CameraLens.BACK -> CameraCharacteristics.LENS_FACING_BACK
            CameraLens.FRONT -> CameraCharacteristics.LENS_FACING_FRONT
        }
        return try {
            manager?.cameraIdList.orEmpty().any {
                manager?.getCameraCharacteristics(it)?.get(CameraCharacteristics.LENS_FACING) == facing
            }
        } catch (e: CameraAccessException) {
            false
        } catch (e: IllegalArgumentException) {
            false
        }
    }
}

/**
 * Built-in phone/tablet camera. "Connected" means the lens exists on this device; the preview,
 * recording and zoom themselves run in the UI through CameraX, which binds to the screen lifecycle.
 */
class PhoneCameraAdapter(
    override val descriptor: CameraDescriptor,
    private val availability: PhoneCameraAvailability
) : CameraAdapter {
    private val mutableStatus = MutableStateFlow(CameraStatus())
    override val status: StateFlow<CameraStatus> = mutableStatus.asStateFlow()
    private var lens: CameraLens? = null

    override suspend fun connect(config: CameraConnectionConfig): CameraResult {
        val requested = (config as? CameraConnectionConfig.BuiltIn)?.lens
            ?: return fail(StatusMessage.WrongConfiguration)
        if (!availability.hasLens(requested)) return fail(StatusMessage.PhoneCameraMissing(requested))
        lens = requested
        mutableStatus.value = CameraStatus(CameraConnectionStatus.CONNECTED, StatusMessage.PhoneCameraReady(requested))
        return CameraResult.Success
    }

    override suspend fun disconnect() {
        lens = null
        mutableStatus.value = CameraStatus()
    }

    /** CameraX guarantees preview, video capture and zoom control on every camera it exposes. */
    override suspend fun getCapabilities(): CameraCapabilities =
        if (lens != null) CameraCapabilities(livePreview = true, remoteRecording = true, zoom = true) else CameraCapabilities()

    /** Recording and zoom are driven by the on-screen preview controls, not by remote commands. */
    override suspend fun execute(command: CameraCommand): CameraResult =
        CameraResult.Unsupported("Use the controls on the phone-camera preview.")

    override suspend fun getPreviewUri(): String? = lens?.let { "builtin:${it.endpointValue}" }

    private fun fail(message: StatusMessage): CameraResult {
        lens = null
        mutableStatus.value = CameraStatus(CameraConnectionStatus.ERROR, message)
        return CameraResult.Failure(message.toString())
    }
}
