package com.discoveries.aidirector.desktop

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter

@Composable
fun TabletScreen() {
    val ctx = LocalCtx.current
    val data by ctx.store.data.collectAsState()
    val port by ctx.tablet.port.collectAsState()
    val error by ctx.tablet.error.collectAsState()
    val code by ctx.pairing.code.collectAsState()
    val paired by ctx.pairing.pairedCount.collectAsState()

    ScreenColumn {
        SectionCard(s("tb_title")) {
            Text(s("tb_explain"))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Switch(data.settings.tabletServer, { on ->
                    ctx.store.settings { it.copy(tabletServer = on) }
                    if (on) ctx.tablet.start() else ctx.tablet.stop()
                })
                Text(s("tb_enable"))
                val p = port
                if (p != null) Chip(s("tb_running", p), Colors.Good) else Chip(s("tb_stopped"), Colors.Muted)
            }
            error?.let { MessageBox(s("tb_failed", it), isError = true) }
            Text(s("tb_firewall"), color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(s("tb_http_note"), color = Colors.Warning)
        }
        val p = port
        if (p != null) {
            val urls = remember(p) { TabletServer.lanAddresses().map { "http://$it:$p" } }
            SectionCard(s("tb_address")) {
                if (urls.isEmpty()) MessageBox(s("tb_no_network"), isError = true)
                Row(horizontalArrangement = Arrangement.spacedBy(24.dp), verticalAlignment = Alignment.CenterVertically) {
                    urls.firstOrNull()?.let { QrCode(it, Modifier.size(200.dp)) }
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        SelectionContainer {
                            Column {
                                urls.forEach { Text(it, fontSize = 22.sp, fontFamily = FontFamily.Monospace, color = Colors.Gold) }
                            }
                        }
                    }
                }
            }
            SectionCard(s("tb_code")) {
                Text(code.chunked(3).joinToString(" "), fontSize = 48.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = Colors.Gold)
                Text(s("tb_paired", paired))
                if (paired > 0) DangerButton(s("tb_revoke"), onClick = { ctx.pairing.revokeAll() })
            }
        }
    }
}

@Composable
private fun QrCode(text: String, modifier: Modifier) {
    val matrix = remember(text) { QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, 0, 0) }
    Canvas(modifier) {
        drawRect(Color.White)
        val cell = size.minDimension / matrix.width
        for (y in 0 until matrix.height) for (x in 0 until matrix.width) {
            if (matrix[x, y]) drawRect(Color.Black, Offset(x * cell, y * cell), Size(cell + 0.5f, cell + 0.5f))
        }
    }
}
