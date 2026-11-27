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

## A2. Phone camera (any real phone)
| # | Step | Expected | Result |
|---|---|---|---|
| P1 | Add source → preset *Phone camera* → back lens | Card shows ON-DEVICE | not yet run |
| P2 | Studio → START PREVIEW | Permission dialog; after allowing: live image, ● LIVE | not yet run |
| P3 | Deny camera permission | "Allow camera" button, no crash | not yet run |
| P4 | Red button → record 10 s → stop | Timer counts; "Video saved"; file in Gallery › Movies/DirectorModePro with sound | not yet run |
| P5 | Zoom slider | Image zooms smoothly | not yet run |
| P6 | Front lens source | Selfie camera preview | not yet run |
| P7 | Home button while recording | Recording stops and is saved | not yet run |

## M. Multi-phone link (needs 2+ real phones on the same Wi-Fi or hotspot)
| # | Step | Expected | Result |
|---|---|---|---|
| M1 | Phone 1: role Camera | Full-screen camera, 6-digit code, IP:port shown, "Waiting for director" | not yet run |
| M2 | Phone 2: role Director → Devices tab | Phone 1 appears under Nearby within ~10 s | not yet run |
| M3 | Link with a wrong code | "Wrong code"; phone 1 still waiting | not yet run |
| M4 | Link with the right code | "Linked"; phone 1 shows "Linked to …"; Studio shows its preview | not yet run |
| M5 | Studio → Record all → 20 s → Stop all | Both timers run; video in phone 1 Gallery › Movies/DirectorModePro named TAKE_…_<device> | not yet run |
| M6 | Turn Wi-Fi off/on on the director while recording | Phone 1 keeps recording; director shows "reconnecting", then linked again | not yet run |
| M7 | Third phone links to phone 1 at the same time | "Already linked to another director" | not yet run |
| M8 | Add by address (no discovery) | Linking works with IP:port typed manually | not yet run |
| M9 | Battery ≤ 20 % on a camera phone | Battery shown in amber on the director | not yet run |

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
