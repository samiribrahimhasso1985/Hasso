package com.directormodepro.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Film
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val Bg = Color(0xFF090D12)
private val Panel = Color(0xFF121A23)
private val Panel2 = Color(0xFF192431)
private val Accent = Color(0xFF20C6B7)
private val Muted = Color(0xFF91A0AE)
private val White = Color(0xFFF3F6F8)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { DirectorModeApp() }
    }
}

data class CameraDevice(val name: String, val brand: String, val transport: String, val status: String)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DirectorModeApp() {
    var selectedTab by remember { mutableStateOf(0) }
    var showAddDialog by remember { mutableStateOf(false) }
    var cameras by remember {
        mutableStateOf(listOf(
            CameraDevice("Camera 01", "Sony FX3", "Wi-Fi / Network", "Not connected"),
            CameraDevice("Camera 02", "DJI Osmo Action 5 Pro", "Wi-Fi", "Not connected")
        ))
    }
    var projectName by remember { mutableStateOf("Untitled Production") }

    MaterialTheme(colorScheme = darkColorScheme(
        background = Bg, surface = Panel, primary = Accent, onPrimary = Bg,
        onBackground = White, onSurface = White, secondary = Muted
    )) {
        Scaffold(
            containerColor = Bg,
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text("DIRECTOR MODE", fontSize = 17.sp, fontWeight = FontWeight.Black, letterSpacing = 1.4.sp)
                            Text("PRO  •  ANDROID STUDIO", fontSize = 10.sp, color = Muted, letterSpacing = 1.8.sp)
                        }
                    },
                    actions = {
                        Box(Modifier.padding(end = 16.dp).size(9.dp).background(Accent, CircleShape))
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Bg)
                )
            },
            bottomBar = {
                NavigationBar(containerColor = Panel, contentColor = White) {
                    val items = listOf("Studio", "Cameras", "Tools", "Settings")
                    val icons = listOf(Icons.Default.GridView, Icons.Default.CameraAlt, Icons.Default.Tune, Icons.Default.Settings)
                    items.forEachIndexed { index, label ->
                        NavigationBarItem(
                            selected = selectedTab == index,
                            onClick = { selectedTab = index },
                            icon = { Icon(icons[index], contentDescription = label) },
                            label = { Text(label, fontSize = 10.sp) },
                            colors = NavigationBarItemDefaults.colors(selectedIconColor = Accent, selectedTextColor = Accent,
                                indicatorColor = Panel2, unselectedIconColor = Muted, unselectedTextColor = Muted)
                        )
                    }
                }
            }
        ) { padding ->
            when (selectedTab) {
                0 -> StudioScreen(Modifier.padding(padding), projectName, cameras, onProjectChange = { projectName = it }, onAdd = { showAddDialog = true }, onCameras = { selectedTab = 1 })
                1 -> CamerasScreen(Modifier.padding(padding), cameras, onAdd = { showAddDialog = true })
                2 -> ToolsScreen(Modifier.padding(padding))
                else -> SettingsScreen(Modifier.padding(padding))
            }
        }

        if (showAddDialog) {
            AddCameraDialog(
                onDismiss = { showAddDialog = false },
                onAdd = { brand, transport ->
                    cameras = cameras + CameraDevice("Camera %02d".format(cameras.size + 1), brand, transport, "Not connected")
                    showAddDialog = false
                    selectedTab = 1
                }
            )
        }
    }
}

@Composable
private fun StudioScreen(
    modifier: Modifier, projectName: String, cameras: List<CameraDevice>,
    onProjectChange: (String) -> Unit, onAdd: () -> Unit, onCameras: () -> Unit
) {
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text("DIRECTOR'S WORKSPACE", color = Accent, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                Text("Good take starts here.", color = White, fontSize = 25.sp, fontWeight = FontWeight.Bold)
                Text("Your portable multi-camera production desk", color = Muted, fontSize = 13.sp)
            }
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("CURRENT PRODUCTION", color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                        Spacer(Modifier.weight(1f))
                        Surface(color = Color(0xFF263B38), shape = CircleShape) { Text(" PRE-PRODUCTION ", color = Accent, fontSize = 9.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)) }
                    }
                    Text(projectName, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
                    OutlinedTextField(value = projectName, onValueChange = onProjectChange, label = { Text("Production name") }, singleLine = true, modifier = Modifier.fillMaxWidth(), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Accent, focusedLabelColor = Accent))
                }
            }
        }
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("CAMERA MULTIVIEW", fontWeight = FontWeight.Bold, fontSize = 12.sp, letterSpacing = 1.2.sp)
                Spacer(Modifier.weight(1f))
                Text("${cameras.size} SOURCES", color = Muted, fontSize = 10.sp)
            }
        }
        items(cameras) { camera -> CameraPreviewCard(camera) }
        item {
            OutlinedButton(onClick = onAdd, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = Accent)) {
                Icon(Icons.Default.Add, null); Spacer(Modifier.width(8.dp)); Text("ADD CAMERA SOURCE")
            }
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = Panel2), shape = RoundedCornerShape(16.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("SYSTEM STATUS", color = Accent, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                    Text("Camera adapters ready for integration", fontWeight = FontWeight.SemiBold)
                    Text("Live video and remote controls activate when a supported camera adapter is implemented and tested.", color = Muted, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun CameraPreviewCard(camera: CameraDevice) {
    Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.fillMaxWidth().height(150.dp).background(Color(0xFF070A0E), RoundedCornerShape(10.dp)).border(1.dp, Color(0xFF263442), RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.CameraAlt, null, tint = Color(0xFF536473), modifier = Modifier.size(34.dp))
                    Text("NO SIGNAL", color = Color(0xFF71808D), fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                    Text("Preview appears after connection", color = Color(0xFF536473), fontSize = 10.sp)
                }
                Text(camera.name.uppercase(), color = White, fontSize = 9.sp, modifier = Modifier.align(Alignment.TopStart).padding(10.dp))
                Surface(color = Color(0xFF3A2C22), shape = CircleShape, modifier = Modifier.align(Alignment.TopEnd).padding(8.dp)) {
                    Text(" OFFLINE ", color = Color(0xFFFFB77A), fontSize = 8.sp, modifier = Modifier.padding(vertical = 4.dp, horizontal = 5.dp))
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(camera.brand, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Text(camera.transport, color = Muted, fontSize = 11.sp)
                }
                Text("CONFIGURE", color = Accent, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun CamerasScreen(modifier: Modifier, cameras: List<CameraDevice>, onAdd: () -> Unit) {
    Column(modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("CAMERA SOURCES", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text("Manage camera connections and adapter types.", color = Muted, fontSize = 13.sp)
        cameras.forEach { camera ->
            Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(14.dp)) {
                Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CameraAlt, null, tint = Accent, modifier = Modifier.size(28.dp))
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(camera.brand, fontWeight = FontWeight.SemiBold)
                        Text("${camera.name} • ${camera.transport}", color = Muted, fontSize = 11.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    }
                    Text("OFFLINE", color = Color(0xFFFFB77A), fontSize = 9.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
        Button(onClick = onAdd, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = Bg)) { Icon(Icons.Default.Add, null); Spacer(Modifier.width(8.dp)); Text("Add camera") }
        Text("Supported connection methods depend on each camera model and manufacturer protocol.", color = Muted, fontSize = 11.sp)
    }
}

@Composable
private fun ToolsScreen(modifier: Modifier) {
    Column(modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("CINEMA TOOLS", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text("Monitoring tools planned for the production pipeline.", color = Muted, fontSize = 13.sp)
        listOf("Waveform Monitor", "False Color", "Focus Peaking", "Zebra", "Custom LUT Viewer", "Safe Frame Guides", "Audio Level Meter").forEach { tool ->
            Row(Modifier.fillMaxWidth().background(Panel, RoundedCornerShape(12.dp)).padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Tune, null, tint = Accent)
                Spacer(Modifier.width(12.dp)); Text(tool, Modifier.weight(1f), fontWeight = FontWeight.Medium)
                Text("PLANNED", color = Muted, fontSize = 9.sp)
            }
        }
    }
}

@Composable
private fun SettingsScreen(modifier: Modifier) {
    Column(modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("SETTINGS", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        SettingRow("App version", "0.1.0 • Foundation")
        SettingRow("Platform", "Android 8.0 and newer")
        SettingRow("Camera architecture", "Pluggable adapters")
        SettingRow("Privacy", "Local-first design")
        SettingRow("Language", "English / Arabic (planned)")
        Text("This foundation build does not transmit camera data. Camera discovery and streaming will be added through tested adapters.", color = Muted, fontSize = 12.sp)
    }
}

@Composable
private fun SettingRow(title: String, value: String) {
    Column(Modifier.fillMaxWidth().background(Panel, RoundedCornerShape(12.dp)).padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(title, color = Muted, fontSize = 11.sp); Text(value, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
    }
}

@Composable
private fun AddCameraDialog(onDismiss: () -> Unit, onAdd: (String, String) -> Unit) {
    var brand by remember { mutableStateOf("Generic IP Camera") }
    var transport by remember { mutableStateOf("Wi-Fi / IP stream") }
    val brands = listOf("Generic IP Camera", "Sony", "DJI", "Canon", "Panasonic", "Blackmagic Design", "USB UVC Camera", "Other")
    val transports = listOf("Wi-Fi / IP stream", "USB-C / UVC", "HDMI capture device", "Network / LAN", "Manufacturer app bridge")
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add camera source") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Camera brand or type", color = Muted, fontSize = 12.sp)
                brands.forEach { item ->
                    Row(Modifier.fillMaxWidth().clickable { brand = item }.padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(selected = brand == item, onClick = { brand = item }, colors = RadioButtonDefaults.colors(selectedColor = Accent))
                        Text(item, fontSize = 13.sp)
                    }
                }
                Divider(color = Color(0xFF33404B))
                Text("Connection method", color = Muted, fontSize = 12.sp)
                transports.forEach { item ->
                    Row(Modifier.fillMaxWidth().clickable { transport = item }.padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(selected = transport == item, onClick = { transport = item }, colors = RadioButtonDefaults.colors(selectedColor = Accent))
                        Text(item, fontSize = 13.sp)
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = { onAdd(brand, transport) }) { Text("Add", color = Accent) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel", color = Muted) } },
        containerColor = Panel,
        titleContentColor = White,
        textContentColor = White
    )
}
