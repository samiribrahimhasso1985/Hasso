package com.directormodepro.app.ui

import android.view.ViewGroup
import androidx.annotation.OptIn
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.directormodepro.app.R
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.rtsp.RtspMediaSource
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.directormodepro.app.ui.theme.Accent
import com.directormodepro.app.ui.theme.AccentBg
import com.directormodepro.app.ui.theme.Danger
import com.directormodepro.app.ui.theme.DangerBg
import com.directormodepro.app.ui.theme.Live
import com.directormodepro.app.ui.theme.White

private enum class PreviewState { CONNECTING, BUFFERING, LIVE, ENDED, ERROR }

/**
 * Plays a user-supplied RTSP stream with Media3. The "LIVE" badge is driven only by the player
 * actually rendering (isPlaying), never assumed. The player is released when the card leaves
 * composition and paused while the app is in the background.
 */
@OptIn(UnstableApi::class)
@Composable
fun RtspPreview(uri: String, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var state by remember(uri) { mutableStateOf(PreviewState.CONNECTING) }
    var error by remember(uri) { mutableStateOf<String?>(null) }

    val player = remember(uri) {
        ExoPlayer.Builder(context).build().apply {
            setMediaSource(RtspMediaSource.Factory().createMediaSource(MediaItem.fromUri(uri)))
            volume = 0f
            playWhenReady = true
            prepare()
        }
    }

    DisposableEffect(player, lifecycleOwner) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                state = when (playbackState) {
                    Player.STATE_BUFFERING -> PreviewState.BUFFERING
                    Player.STATE_ENDED -> PreviewState.ENDED
                    else -> if (player.isPlaying) PreviewState.LIVE else state
                }
            }

            override fun onIsPlayingChanged(isPlaying: Boolean) {
                if (isPlaying) state = PreviewState.LIVE
            }

            override fun onPlayerError(e: PlaybackException) {
                state = PreviewState.ERROR
                error = e.errorCodeName
            }
        }
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_STOP -> player.pause()
                Lifecycle.Event.ON_START -> if (state != PreviewState.ERROR) player.play()
                else -> Unit
            }
        }
        player.addListener(listener)
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            player.removeListener(listener)
            player.release()
        }
    }

    Box(modifier) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                PlayerView(ctx).apply {
                    layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
                    useController = false
                    resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                    this.player = player
                }
            }
        )
        val (labelRes, fg, bg) = when (state) {
            PreviewState.CONNECTING -> Triple(R.string.preview_connecting, Accent, AccentBg)
            PreviewState.BUFFERING -> Triple(R.string.preview_buffering, Accent, AccentBg)
            PreviewState.LIVE -> Triple(R.string.preview_live, White, Live)
            PreviewState.ENDED -> Triple(R.string.preview_ended, Danger, DangerBg)
            PreviewState.ERROR -> Triple(R.string.preview_error, Danger, DangerBg)
        }
        // Media3 error code names (e.g. ERROR_CODE_IO_NETWORK_CONNECTION_FAILED) are technical identifiers, shown as-is.
        val label = stringResource(labelRes) + if (state == PreviewState.ERROR && error != null) ": $error" else ""
        Surface(color = bg, shape = CircleShape, modifier = Modifier.align(Alignment.BottomStart).padding(8.dp)) {
            Text(label, color = fg, fontSize = 8.sp, modifier = Modifier.padding(vertical = 4.dp, horizontal = 7.dp))
        }
    }
}
