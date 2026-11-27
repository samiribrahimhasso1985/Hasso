package com.directormodepro.app.link

import android.Manifest
import android.annotation.SuppressLint
import android.content.ContentValues
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Matrix
import android.os.BatteryManager
import android.os.Build
import android.os.StatFs
import android.provider.MediaStore
import android.util.Size
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.FallbackStrategy
import androidx.camera.video.MediaStoreOutputOptions
import androidx.camera.video.Quality
import androidx.camera.video.QualitySelector
import androidx.camera.video.Recorder
import androidx.camera.video.Recording
import androidx.camera.video.VideoCapture
import androidx.camera.video.VideoRecordEvent
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.io.ByteArrayOutputStream
import java.util.concurrent.Executors
import kotlin.math.min

/**
 * The camera phone's CameraX pipeline, driven locally or by a linked director.
 * Full-quality video is recorded on this phone (Movies/DirectorModePro); the director only
 * receives small JPEG preview frames (~480 px, ~6 fps) while it asks for them.
 * All public methods must be called on the main thread.
 */
class CameraXNodeController(context: Context, private val deviceLabel: String) : CameraNodeController {
    private val context = context.applicationContext
    private val mainExecutor = ContextCompat.getMainExecutor(this.context)
    private val analysisExecutor = Executors.newSingleThreadExecutor()

    private val mutableStatus = MutableStateFlow(NodeStatus())
    override val status: StateFlow<NodeStatus> = mutableStatus.asStateFlow()
    private val frames = MutableSharedFlow<ByteArray>(extraBufferCapacity = 1, onBufferOverflow = BufferOverflow.DROP_OLDEST)
    override val previewFrames: Flow<ByteArray> = frames

    /** Short local messages for the camera operator (saved, failed...). */
    private val mutableNotice = MutableStateFlow<String?>(null)
    val notice: StateFlow<String?> = mutableNotice.asStateFlow()

    @Volatile private var previewEnabled = false
    @Volatile private var lastFrameAt = 0L
    private var provider: ProcessCameraProvider? = null
    private var owner: LifecycleOwner? = null
    private var camera: Camera? = null
    private var recording: Recording? = null
    private var lensFront = false

    private val preview = Preview.Builder().build()
    private val recorder = Recorder.Builder()
        .setQualitySelector(QualitySelector.from(Quality.FHD, FallbackStrategy.lowerQualityOrHigherThan(Quality.SD)))
        .build()
    private val videoCapture = VideoCapture.withOutput(recorder)
    private val analysis = ImageAnalysis.Builder()
        .setResolutionSelector(
            ResolutionSelector.Builder().setResolutionStrategy(
                ResolutionStrategy(Size(640, 480), ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER)
            ).build()
        )
        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
        .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
        .build()
        .also { it.setAnalyzer(analysisExecutor, ::analyze) }

    fun attach(lifecycleOwner: LifecycleOwner, view: PreviewView) {
        owner = lifecycleOwner
        preview.setSurfaceProvider(view.surfaceProvider)
        val future = ProcessCameraProvider.getInstance(context)
        future.addListener({
            provider = runCatching { future.get() }.getOrNull()
            bind()
        }, mainExecutor)
    }

    fun detach() {
        recording?.stop()
        provider?.unbind(preview, videoCapture, analysis)
        camera = null
        owner = null
        mutableStatus.update { it.copy(cameraReady = false, previewAvailable = false) }
    }

    fun release() {
        detach()
        analysisExecutor.shutdown()
    }

    private fun bind() {
        val p = provider ?: return
        val o = owner ?: return
        p.unbind(preview, videoCapture, analysis)
        val selector = if (lensFront) CameraSelector.DEFAULT_FRONT_CAMERA else CameraSelector.DEFAULT_BACK_CAMERA
        var previewOk = true
        camera = try {
            p.bindToLifecycle(o, selector, preview, videoCapture, analysis)
        } catch (e: Exception) {
            // Some (LEGACY) cameras cannot run 3 use cases: keep recording, drop the director preview.
            previewOk = false
            try {
                p.bindToLifecycle(o, selector, preview, videoCapture)
            } catch (e2: Exception) {
                mutableStatus.update { it.copy(cameraReady = false, error = e2.message ?: e2.javaClass.simpleName) }
                return
            }
        }
        mutableStatus.update {
            it.copy(cameraReady = true, previewAvailable = previewOk, lens = if (lensFront) "front" else "back", zoom = 0f, error = null)
        }
    }

    @SuppressLint("MissingPermission") // RECORD_AUDIO checked right before withAudioEnabled().
    override fun startRecording(take: String) {
        if (recording != null || camera == null) return
        val safeLabel = deviceLabel.replace(Regex("[^A-Za-z0-9_-]"), "_").take(20)
        val name = "${take}_$safeLabel"
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, name)
            put(MediaStore.MediaColumns.MIME_TYPE, "video/mp4")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) put(MediaStore.Video.Media.RELATIVE_PATH, "Movies/DirectorModePro")
        }
        val output = MediaStoreOutputOptions.Builder(context.contentResolver, MediaStore.Video.Media.EXTERNAL_CONTENT_URI)
            .setContentValues(values).build()
        var pending = recorder.prepareRecording(context, output)
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            pending = pending.withAudioEnabled()
        }
        recording = try {
            pending.start(mainExecutor) { event ->
                when (event) {
                    is VideoRecordEvent.Start -> mutableStatus.update { it.copy(recording = true, recordedSeconds = 0, error = null) }
                    is VideoRecordEvent.Status -> mutableStatus.update {
                        it.copy(recordedSeconds = event.recordingStats.recordedDurationNanos / 1_000_000_000)
                    }
                    is VideoRecordEvent.Finalize -> {
                        recording = null
                        if (event.hasError()) {
                            mutableStatus.update { it.copy(recording = false, error = "Recording failed (${event.error})") }
                            mutableNotice.value = "ERROR:${event.error}"
                        } else {
                            mutableStatus.update { it.copy(recording = false, lastSavedTake = name) }
                            mutableNotice.value = "SAVED:$name"
                        }
                    }
                    else -> Unit
                }
            }
        } catch (e: RuntimeException) {
            mutableStatus.update { it.copy(error = e.message ?: e.javaClass.simpleName) }
            null
        }
    }

    override fun stopRecording() {
        recording?.stop()
    }

    /** Lens changes are refused while recording so a take is never cut. */
    override fun setLens(lens: String) {
        if (recording != null) return
        val front = lens == "front"
        if (front == lensFront && camera != null) return
        lensFront = front
        bind()
    }

    override fun setZoom(linear: Float) {
        camera?.cameraControl?.setLinearZoom(linear)
        mutableStatus.update { it.copy(zoom = linear) }
    }

    override fun setPreviewEnabled(enabled: Boolean) {
        previewEnabled = enabled
    }

    fun clearNotice() { mutableNotice.value = null }

    /** Battery and free space, measured on this phone. Call about once per second. */
    fun refreshDeviceStats() {
        val battery = context.getSystemService(BatteryManager::class.java)
        val percent = battery?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)?.takeIf { it in 0..100 }
        val charging = battery?.isCharging ?: false
        val dir = context.getExternalFilesDir(null) ?: context.filesDir
        val free = runCatching { StatFs(dir.path).availableBytes }.getOrNull()
        mutableStatus.update { it.copy(batteryPercent = percent, charging = charging, freeBytes = free) }
    }

    private fun analyze(image: ImageProxy) {
        try {
            if (!previewEnabled) return
            val now = System.currentTimeMillis()
            if (now - lastFrameAt < FRAME_INTERVAL_MS) return
            lastFrameAt = now
            val source = image.toBitmap()
            val rotation = image.imageInfo.rotationDegrees
            val scale = min(1f, MAX_PREVIEW_EDGE / maxOf(source.width, source.height).toFloat())
            val matrix = Matrix().apply { postScale(scale, scale); postRotate(rotation.toFloat()) }
            val bitmap = Bitmap.createBitmap(source, 0, 0, source.width, source.height, matrix, true)
            val bytes = ByteArrayOutputStream().use { out ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, out)
                out.toByteArray()
            }
            if (bitmap !== source) bitmap.recycle()
            source.recycle()
            frames.tryEmit(bytes)
        } catch (e: Exception) {
            // A dropped preview frame is harmless; recording is unaffected.
        } finally {
            image.close()
        }
    }

    private companion object {
        const val FRAME_INTERVAL_MS = 160L
        const val MAX_PREVIEW_EDGE = 480f
        const val JPEG_QUALITY = 55
    }
}
