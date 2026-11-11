"""Fail if any UI string key used in XAML/C# is missing from tools/strings.py."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from strings import S  # noqa: E402

used: set[str] = set()
for f in (ROOT / "src").rglob("*.xaml"):
    if "Localization" in f.parts:
        continue
    used |= set(re.findall(r"DynamicResource\s+([A-Za-z]+\.[A-Za-z]+)", f.read_text(encoding="utf-8")))
for f in (ROOT / "src").rglob("*.cs"):
    text = f.read_text(encoding="utf-8")
    used |= set(re.findall(r'_?loc(?:\.Format)?[\[(]\s*"([A-Za-z]+\.[A-Za-z]+)"', text))
    used |= set(re.findall(r'"(Status\.[A-Za-z]+)"', text))

sections = re.findall(r'new\("([a-z]+)", \d+', (ROOT / "src/Discoveries.Desktop/ViewModels/Sections.cs").read_text(encoding="utf-8"))
used |= {f"Nav.{s}" for s in sections}
used |= {f"EpStatus.{s}" for s in ["Draft", "Active", "InReview", "Completed", "Archived"]}
used |= {f"Section.{s}" for s in ["Intro", "Scene", "Ending"]}
used |= {f"Req.{s}" for s in ["None", "ApiKey", "SonySdk", "Resolve", "Engine", "PlatformApi"]}

missing = sorted(k for k in used if k not in S)
bad = [k for k, v in S.items() if len(v) != 3 or any(not x.strip() for x in v)]
print(f"{len(used)} keys used, {len(S)} defined, {len(sections)} sections")
if missing or bad:
    print("MISSING:", missing)
    print("INCOMPLETE:", bad)
    sys.exit(1)
