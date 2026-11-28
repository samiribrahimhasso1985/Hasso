package com.directormodepro.desktop

import com.directormodepro.app.link.NodeEndpoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.net.Inet4Address
import java.net.NetworkInterface
import javax.jmdns.JmDNS
import javax.jmdns.ServiceEvent
import javax.jmdns.ServiceListener

/**
 * Finds camera phones that announce `_dmpcam._tcp` with Android NSD, using mDNS (JmDNS) on every
 * local IPv4 interface. Works on Windows, macOS and Linux; the user may need to allow the app in
 * the system firewall the first time.
 */
class LanDiscovery(private val scope: CoroutineScope) {
    private val mutableNodes = MutableStateFlow<List<NodeEndpoint>>(emptyList())
    val nodes: StateFlow<List<NodeEndpoint>> = mutableNodes.asStateFlow()
    private val instances = mutableListOf<JmDNS>()

    private val listener = object : ServiceListener {
        override fun serviceAdded(event: ServiceEvent) {
            event.dns.requestServiceInfo(event.type, event.name, 3_000)
        }

        override fun serviceRemoved(event: ServiceEvent) {
            mutableNodes.update { list -> list.filterNot { it.name == event.name } }
        }

        override fun serviceResolved(event: ServiceEvent) {
            val info = event.info ?: return
            val host = info.inet4Addresses.firstOrNull()?.hostAddress ?: return
            val node = NodeEndpoint(host, info.port, info.name)
            mutableNodes.update { list -> list.filterNot { it.name == node.name } + node }
        }
    }

    fun start() {
        scope.launch(Dispatchers.IO) {
            for (address in localIpv4()) {
                runCatching {
                    val dns = JmDNS.create(address)
                    dns.addServiceListener(SERVICE_TYPE, listener)
                    synchronized(instances) { instances += dns }
                }
            }
        }
    }

    fun close() {
        val all = synchronized(instances) { instances.toList().also { instances.clear() } }
        // JmDNS.close() announces goodbye packets and can take a moment: never on the UI thread.
        Thread { all.forEach { runCatching { it.close() } } }.apply { isDaemon = true }.start()
    }

    companion object {
        const val SERVICE_TYPE = "_dmpcam._tcp.local."

        fun localIpv4(): List<Inet4Address> = runCatching {
            NetworkInterface.getNetworkInterfaces().toList()
                .filter { it.isUp && !it.isLoopback && !it.isVirtual }
                .flatMap { it.inetAddresses.toList() }
                .filterIsInstance<Inet4Address>()
                .filter { it.isSiteLocalAddress }
        }.getOrDefault(emptyList())
    }
}

/** Parses "192.168.1.20:40123" as typed by the user. */
fun parseAddress(text: String): Pair<String, Int>? {
    val trimmed = text.trim()
    val colon = trimmed.lastIndexOf(':')
    if (colon <= 0) return null
    val host = trimmed.substring(0, colon)
    val port = trimmed.substring(colon + 1).toIntOrNull() ?: return null
    if (port !in 1..65535) return null
    val parts = host.split('.')
    if (parts.size != 4 || parts.any { p -> p.toIntOrNull()?.let { it in 0..255 } != true }) return null
    return host to port
}
