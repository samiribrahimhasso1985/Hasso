package com.directormodepro.desktop

import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.toComposeImageBitmap
import androidx.compose.ui.graphics.painter.BitmapPainter
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import com.directormodepro.app.link.DirectorSession
import com.directormodepro.app.link.NodeEndpoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import org.jetbrains.skia.Image
import java.net.InetAddress
import java.util.Locale
import java.util.prefs.Preferences

/**
 * Director Mode Pro — desktop director console.
 *
 * Options (for power users and testing):
 *   --lang ar|de|en          UI language (default: last choice, else system language, else Arabic)
 *   --connect HOST:PORT      link a camera phone at start-up (needs --pin)
 *   --pin NNNNNN             code shown on that camera phone (kept in memory only)
 *   --demo N                 start N simulated DEMO cameras on this computer (testing only)
 */
fun main(args: Array<String>) {
    fun arg(name: String) = args.indexOf(name).takeIf { it >= 0 && it + 1 < args.size }?.let { args[it + 1] }
    val prefs = Preferences.userRoot().node("com/directormodepro/desktop")
    val initialLang = (arg("--lang") ?: prefs.get("lang", null) ?: Locale.getDefault().language)
        .let { tag -> Lang.entries.firstOrNull { it.tag == tag } ?: Lang.AR }
    val demoCount = arg("--demo")?.toIntOrNull()?.coerceIn(1, 8) ?: 0

    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    val hostName = runCatching { InetAddress.getLocalHost().hostName }.getOrNull()?.takeIf { it.isNotBlank() } ?: "PC"
    val session = DirectorSession("Desktop · $hostName", scope)
    val discovery = LanDiscovery(scope).also { it.start() }

    val connect = arg("--connect")?.let(::parseAddress)
    val pin = arg("--pin")
    if (connect != null && pin != null) session.connect(NodeEndpoint(connect.first, connect.second, connect.first), pin)

    val icon = object {}.javaClass.getResourceAsStream("/icon.png")?.readBytes()
        ?.let { BitmapPainter(Image.makeFromEncoded(it).toComposeImageBitmap()) }

    application {
        val windowState = rememberWindowState(size = DpSize(1280.dp, 800.dp))
        var lang by remember { mutableStateOf(initialLang) }
        LaunchedEffect(Unit) {
            if (demoCount > 0) {
                startDemoCameras(demoCount, scope).forEach { node ->
                    session.connect(NodeEndpoint("127.0.0.1", node.port, node.name), node.pin)
                }
            }
        }
        Window(
            onCloseRequest = {
                discovery.close()
                session.clients.value.forEach { session.remove(it) }
                scope.cancel()
                exitApplication()
            },
            title = "Director Mode Pro",
            state = windowState,
            icon = icon
        ) {
            DirectorConsole(
                session = session,
                discovery = discovery,
                lang = lang,
                onLang = { lang = it; prefs.put("lang", it.tag) },
                demo = demoCount > 0
            )
        }
    }
}
