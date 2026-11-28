package com.directormodepro.app.link

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.net.Inet4Address
import java.net.NetworkInterface

/** Camera phone: announces itself on the local network with Android NSD (mDNS/DNS-SD). */
class NsdAdvertiser(context: Context) {
    private val nsd = context.applicationContext.getSystemService(NsdManager::class.java)
    private var listener: NsdManager.RegistrationListener? = null

    fun register(name: String, port: Int) {
        unregister()
        val info = NsdServiceInfo().apply {
            serviceName = name
            serviceType = NSD_SERVICE_TYPE
            this.port = port
        }
        val l = object : NsdManager.RegistrationListener {
            override fun onServiceRegistered(info: NsdServiceInfo) = Unit
            override fun onRegistrationFailed(info: NsdServiceInfo, errorCode: Int) = Unit
            override fun onServiceUnregistered(info: NsdServiceInfo) = Unit
            override fun onUnregistrationFailed(info: NsdServiceInfo, errorCode: Int) = Unit
        }
        listener = l
        runCatching { nsd?.registerService(info, NsdManager.PROTOCOL_DNS_SD, l) }
    }

    fun unregister() {
        listener?.let { l -> runCatching { nsd?.unregisterService(l) } }
        listener = null
    }
}

/** Director: finds camera phones on the local network. Resolves one service at a time (NSD limit). */
class NsdDiscovery(context: Context) {
    private val app = context.applicationContext
    private val nsd = app.getSystemService(NsdManager::class.java)
    private val wifi = app.getSystemService(WifiManager::class.java)
    private var multicastLock: WifiManager.MulticastLock? = null
    private val mutableNodes = MutableStateFlow<List<NodeEndpoint>>(emptyList())
    val nodes: StateFlow<List<NodeEndpoint>> = mutableNodes.asStateFlow()

    private val pending = ArrayDeque<NsdServiceInfo>()
    private var resolving = false
    private var listener: NsdManager.DiscoveryListener? = null

    fun start() {
        if (listener != null) return
        multicastLock = wifi?.createMulticastLock("dmp-discovery")?.apply { setReferenceCounted(false); acquire() }
        val l = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(serviceType: String) = Unit
            override fun onDiscoveryStopped(serviceType: String) = Unit
            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) = Unit
            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) = Unit
            override fun onServiceFound(info: NsdServiceInfo) = enqueue(info)
            override fun onServiceLost(info: NsdServiceInfo) {
                mutableNodes.update { list -> list.filterNot { it.name == info.serviceName } }
            }
        }
        listener = l
        runCatching { nsd?.discoverServices(NSD_SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, l) }
    }

    fun stop() {
        listener?.let { l -> runCatching { nsd?.stopServiceDiscovery(l) } }
        listener = null
        runCatching { multicastLock?.release() }
        multicastLock = null
        synchronized(pending) { pending.clear(); resolving = false }
        mutableNodes.value = emptyList()
    }

    private fun enqueue(info: NsdServiceInfo) {
        synchronized(pending) {
            pending.addLast(info)
            if (resolving) return
            resolving = true
        }
        resolveNext()
    }

    @Suppress("DEPRECATION") // resolveService is still functional on Android 14+; the new API needs API 34.
    private fun resolveNext() {
        val next = synchronized(pending) {
            pending.removeFirstOrNull() ?: run { resolving = false; return }
        }
        val ok = runCatching {
            nsd?.resolveService(next, object : NsdManager.ResolveListener {
                override fun onResolveFailed(info: NsdServiceInfo, errorCode: Int) = resolveNext()
                override fun onServiceResolved(info: NsdServiceInfo) {
                    val host = info.host?.hostAddress
                    if (host != null) {
                        val node = NodeEndpoint(host, info.port, info.serviceName)
                        mutableNodes.update { list -> list.filterNot { it.name == node.name } + node }
                    }
                    resolveNext()
                }
            })
        }.isSuccess
        if (!ok) resolveNext()
    }
}

/** IPv4 addresses of this device on local networks (Wi-Fi or hotspot), for manual linking. */
fun localIpv4Addresses(): List<String> = runCatching {
    NetworkInterface.getNetworkInterfaces().toList()
        .filter { it.isUp && !it.isLoopback }
        .flatMap { it.inetAddresses.toList() }
        .filterIsInstance<Inet4Address>()
        .filter { it.isSiteLocalAddress }
        .mapNotNull { it.hostAddress }
}.getOrDefault(emptyList())

/** Parses "192.168.1.20:40123" as typed by the user. */
fun parseNodeAddress(text: String): Pair<String, Int>? {
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
