# Hardware & device test checklist

Automated tests (`./gradlew :app:testDebugUnitTest`) run on the JVM and cover domain logic, the repository,
the registry, connection-state transitions and a real TCP RTSP `DESCRIBE` against a local responder.
They **do not** prove behaviour on a phone, with a real camera, or with real video decoding.
Record every manual run below (date, device, Android version, result).

## A. Emulator / any device (no camera needed)
| # | Step | Expected | Result |
|---|---|---|---|
| A1 | Install `app-debug.apk`, open app | Studio tab, dark theme, 0 SOURCES | not yet run |
| A2 | Add source → preset *Sony FX3* → Save | Card shows INTEGRATION TARGET, OFFLINE | not yet run |
| A3 | CHECK SUPPORT on Sony card | NOT AVAILABLE + explanation; no capability ticked | not yet run |
| A4 | Add RTSP source with `rtsp://user:pw@host/x` | Save blocked: credentials message | not yet run |
| A5 | Force-stop and reopen app | Sources still listed (Room) | not yet run |
| A6 | Edit name, then delete with confirmation | Changes persist; deleted card disappears | not yet run |
| A7 | Rotate / tablet width | Grid shows 2+ columns, no clipped dialogs | not yet run |
| A8 | `./gradlew :app:connectedDebugAndroidTest` | CameraSourceDaoTest passes | not yet run |

## B. Real RTSP stream (same Wi-Fi network)
| # | Step | Expected | Result |
|---|---|---|---|
| B1 | TEST CONNECTION on a valid H.264 RTSP URL | REACHABLE • video: H264, ✓ Preview | not yet run |
| B2 | Studio → START PREVIEW | Video appears; badge changes CONNECTING → BUFFERING → ● LIVE | not yet run |
| B3 | Home button, return | Preview pauses in background and resumes | not yet run |
| B4 | Stop the stream server while previewing | PLAYBACK ERROR or STREAM ENDED, never a frozen LIVE | not yet run |
| B5 | Wrong path / server off / password-protected stream | 404 / network error / authentication message | not yet run |
| B6 | Two RTSP sources previewing at once | Both play or the device reports a decoder error | not yet run |

## C. Sony FX3 / DJI Osmo Action 5 Pro
No adapter exists yet. Before writing one, document here: firmware version, the exact official protocol or SDK,
licence terms, and a capture of the supported outputs. Video can already be tested **via an HDMI→RTSP encoder**
(category B) — that validates the encoder path, not a Sony/DJI integration.
