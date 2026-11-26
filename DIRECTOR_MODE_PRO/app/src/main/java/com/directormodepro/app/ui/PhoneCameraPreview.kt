package com.directormodepro.app.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.ContentValues
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.provider.MediaStore
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
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
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.directormodepro.app.R
import com.directormodepro.app.camera.core.CameraLens
import com.directormodepro.app.ui.theme.Accent
import com.directormodepro.app.ui.theme.Bg
import com.directormodepro.app.ui.theme.Danger
import com.directormodepro.app.ui.theme.DangerBg
import com.directormodepro.app.ui.theme.Live
import com.directormodepro.app.ui.theme.Muted
import com.directormodepro.app.ui.theme.White
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private fun Context.granted(permission: String) =
    ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED

private fun requiredPermissions(): Array<String> = buildList {
    add(Manifest.permission.CAMERA)
    add(Manifest.permission.RECORD_AUDIO)
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
}.toTypedArray()

/**
 * Live preview from this phone's camera through CameraX, with video recording to the gallery
 * (Movies/DirectorModePro) and zoom. "● LIVE" is shown only while PreviewView reports STREAMING.
 */
@Composable
fun PhoneCameraPreview(lens: CameraLens, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    var hasCamera by remember { mutableStateOf(context.granted(Manifest.permission.CAMERA)) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        hasCamera = context.granted(Manifest.permission.CAMERA)
    }

    if (!hasCamera) {
        Column(
            modifier.fillMaxSize().padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(stringResource(R.string.perm_camera_needed), color = Muted, fontSize = 11.sp)
            Button(
                onClick = { launcher.launch(requiredPermissions()) },
                colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = Bg),
                modifier = Modifier.padding(top = 8.dp)
            ) { Text(stringResource(R.string.perm_allow), fontSize = 12.sp) }
        }
        return
    }
    CameraSurface(lens, modifier)
}

@SuppressLint("MissingPermission") // RECORD_AUDIO is checked right before withAudioEnabled().
@Composable
private fun CameraSurface(lens: CameraLens, modifier: Modifier) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val previewView = remember {
        PreviewView(context).apply {
            scaleType = PreviewView.ScaleType.FIT_CENTER
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
        }
    }
    val recorder = remember {
        Recorder.Builder()
            .setQualitySelector(QualitySelector.from(Quality.FHD, FallbackStrategy.lowerQualityOrHigherThan(Quality.SD)))
            .build()
    }
    val videoCapture = remember { VideoCapture.withOutput(recorder) }

    var camera by remember { mutableStateOf<Camera?>(null) }
    var streaming by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var recording by remember { mutableStateOf<Recording?>(null) }
    var recordedSeconds by remember { mutableLongStateOf(0L) }
    var notice by remember { mutableStateOf<String?>(null) }
    var zoom by remember { mutableFloatStateOf(0f) }

    val savedText = stringResource(R.string.rec_saved)
    val noAudioText = stringResource(R.string.rec_no_audio)
    val failedTemplate = stringResource(R.string.rec_failed)

    DisposableEffect(lens, lifecycleOwner) {
        val preview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }
        val selector = if (lens == CameraLens.FRONT) CameraSelector.DEFAULT_FRONT_CAMERA else CameraSelector.DEFAULT_BACK_CAMERA
        val future = ProcessCameraProvider.getInstance(context)
        var provider: ProcessCameraProvider? = null
        val streamObserver = androidx.lifecycle.Observer<PreviewView.StreamState> {
            streaming = it == PreviewView.StreamState.STREAMING
        }
        previewView.previewStreamState.observe(lifecycleOwner, streamObserver)
        future.addListener({
            try {
                provider = future.get()
                camera = provider?.bindToLifecycle(lifecycleOwner, selector, preview, videoCapture)
                error = null
            } catch (e: Exception) {
                // e.g. the camera is already used by another preview or another app.
                error = e.message ?: e.javaClass.simpleName
            }
        }, ContextCompat.getMainExecutor(context))
        onDispose {
            recording?.stop()
            recording = null
            previewView.previewStreamState.removeObserver(streamObserver)
            provider?.unbind(preview, videoCapture)
            camera = null
        }
    }

    LaunchedEffect(notice) {
        if (notice != null) {
            delay(4_000)
            notice = null
        }
    }

    fun startRecording() {
        val name = "DMP_" + SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, name)
            put(MediaStore.MediaColumns.MIME_TYPE, "video/mp4")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) put(MediaStore.Video.Media.RELATIVE_PATH, "Movies/DirectorModePro")
        }
        val output = MediaStoreOutputOptions.Builder(context.contentResolver, MediaStore.Video.Media.EXTERNAL_CONTENT_URI)
            .setContentValues(values)
            .build()
        var pending = recorder.prepareRecording(context, output)
        if (context.granted(Manifest.permission.RECORD_AUDIO)) pending = pending.withAudioEnabled() else notice = noAudioText
        recordedSeconds = 0
        recording = pending.start(ContextCompat.getMainExecutor(context)) { event ->
            when (event) {
                is VideoRecordEvent.Status -> recordedSeconds = event.recordingStats.recordedDurationNanos / 1_000_000_000
                is VideoRecordEvent.Finalize -> {
                    recording = null
                    notice = if (event.hasError()) failedTemplate.format(event.error) else savedText
                }
                else -> Unit
            }
        }
    }

    Box(modifier) {
        AndroidView(factory = { previewView }, modifier = Modifier.fillMaxSize())

        val live = streaming && error == null
        Row(
            Modifier.align(Alignment.BottomStart).padding(8.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(color = if (live) Live else DangerBg, shape = CircleShape) {
                Text(
                    if (live) stringResource(R.string.preview_live) else stringResource(R.string.preview_connecting),
                    color = if (live) White else Danger, fontSize = 8.sp,
                    modifier = Modifier.padding(vertical = 4.dp, horizontal = 7.dp)
                )
            }
            if (recording != null) {
                Surface(color = Color.Black.copy(alpha = 0.6f), shape = CircleShape) {
                    Text(
                        "● REC %02d:%02d".format(recordedSeconds / 60, recordedSeconds % 60),
                        color = Live, fontSize = 9.sp, fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(vertical = 4.dp, horizontal = 7.dp)
                    )
                }
            }
        }

        // Record button: red dot = start, red square = stop.
        if (camera != null && error == null) {
            Box(
                Modifier.align(Alignment.CenterEnd).padding(10.dp).size(40.dp)
                    .border(2.dp, White, CircleShape).padding(5.dp)
                    .clickable { if (recording == null) startRecording() else recording?.stop() },
                contentAlignment = Alignment.Center
            ) {
                if (recording == null) {
                    Box(Modifier.fillMaxSize().background(Live, CircleShape))
                } else {
                    Box(Modifier.size(14.dp).background(Live, RoundedCornerShape(3.dp)))
                }
            }
        }

        if (camera != null) {
            Row(
                Modifier.align(Alignment.TopCenter).fillMaxWidth().padding(horizontal = 44.dp, vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(stringResource(R.string.cap_zoom), color = White, fontSize = 9.sp)
                Slider(
                    value = zoom,
                    onValueChange = {
                        zoom = it
                        camera?.cameraControl?.setLinearZoom(it)
                    },
                    modifier = Modifier.width(140.dp).padding(start = 6.dp),
                    colors = SliderDefaults.colors(thumbColor = Accent, activeTrackColor = Accent)
                )
            }
        }

        val message = error?.let { stringResource(R.string.camera_error, it) } ?: notice
        if (message != null) {
            Surface(
                color = Color.Black.copy(alpha = 0.7f), shape = RoundedCornerShape(8.dp),
                modifier = Modifier.align(Alignment.Center).padding(12.dp)
            ) {
                Text(message, color = if (error != null) Danger else White, fontSize = 11.sp, modifier = Modifier.padding(8.dp))
            }
        }
    }
}
