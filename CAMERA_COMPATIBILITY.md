# Sony FX3 compatibility

**Current state: not implemented.** The app shows the camera section as locked.

## Plan

| Path | Role | State |
| --- | --- | --- |
| FX3 → Windows over **USB** with the official Sony Camera Remote SDK | Primary path: live view, status, supported settings, recording control if the SDK supports it for FX3 | To be tested in phase 0 |
| FX3 → Windows over Wi-Fi / LAN | Only if supported by FX3 firmware and the SDK | Unknown |
| Tablet ↔ Windows | Local network by default; USB as an alternative if it works on the user's devices | Planned |
| Bluetooth | Small control messages / accessories only; never video | Planned |

The Sony SDK must be downloaded by the user under Sony's licence; it is not redistributed in this repository.

Each connection method will report: ACTIVE, INACTIVE, NOT_SUPPORTED, PERMISSION_REQUIRED, CONNECTION_ERROR or UNKNOWN, with the reason, a suggested fix and a re-check button.
