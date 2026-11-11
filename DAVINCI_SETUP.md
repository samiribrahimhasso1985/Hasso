# DaVinci Resolve 21

**Current state: not implemented.** Planned for slice 3, through a Windows Companion Agent.

## Plan

1. Phase 0: confirm whether the installed edition is the free version or **Studio**. External scripting is restricted in the free edition, so the first route is an **FCPXML timeline file** imported manually; scripting is added only if it works on the installed version.
2. The tablet sends the episode plan, approvals and `manifest.json` (with SHA-256 per file) to the Windows agent. 4K camera files stay on the computer and are never copied to the tablet.
3. The agent builds a 1080 × 1920 timeline at the episode frame rate (25 fps default), scenes in order, markers and editing notes.
4. Only approved assets are included. Nothing is rendered or published without the user's approval.
