"""Command line entry:  python -m vpa <command>

  check                      فحص النظام والمتطلبات
  analyze <file> [options]   المرحلة 1: تحليل وتفريغ الفيديو
  status <project_folder>    عرض حالة مشروع
  resolve-check              فحص الاتصال بـ DaVinci Resolve Studio (قراءة فقط)
"""

from __future__ import annotations

import argparse
import json
import logging
import platform
import shutil
import sys
import traceback
from pathlib import Path

from . import __version__
from .config import load_config
from .errors import VPAError
from .logging_setup import setup_logging

log = logging.getLogger("vpa")


def cmd_check(args, cfg) -> int:
    from . import transcribe
    ok = True
    log.info("VPA %s | Python %s | %s", __version__, platform.python_version(), platform.platform())
    for tool in ("ffmpeg", "ffprobe"):
        p = shutil.which(tool)
        log.info("%s %s: %s", "✓" if p else "✗", tool, p or "غير موجود")
        ok &= bool(p)
    backends = transcribe.available_backends()
    log.info("%s محركات التفريغ: %s", "✓" if backends else "✗", backends or "غير مثبتة")
    ok &= bool(backends)
    if backends:
        dev, ct = transcribe.resolve_device("auto", "auto")
        log.info("✓ الجهاز: %s (%s)%s", dev, ct,
                 "" if dev == "cuda" else " – بدون كرت شاشة سيكون التفريغ أبطأ")
    log.info("مجلد المشاريع: %s", cfg["projects_root"])
    log.info("\n%s", "النظام جاهز ✓" if ok else "توجد متطلبات ناقصة ✗ – شغّل setup_windows.bat")
    return 0 if ok else 1


def cmd_analyze(args, cfg) -> int:
    from .pipeline import analyze
    t = cfg["transcription"]
    if args.model:
        t["model"] = args.model
    if args.backend:
        t["backend"] = args.backend
    if args.device:
        t["device"] = args.device
    project = analyze(Path(args.file), cfg, name=args.name, force=args.force)
    if args.open:
        _open(project.dir("02_transcript") / "review.html")
    return 0


def _open(path: Path) -> None:
    import os
    import webbrowser
    try:
        if hasattr(os, "startfile"):
            os.startfile(str(path))  # Windows: default browser
        else:
            webbrowser.open(path.resolve().as_uri())
    except Exception as e:
        log.warning("تعذّر فتح المتصفح تلقائياً (%s). افتح الملف يدوياً: %s", e, path)


def cmd_resolve_check(args, cfg) -> int:
    from .resolve_bridge import check
    info = check()
    log.info("✓ تم الاتصال بـ DaVinci Resolve")
    log.info("  المنتج: %s | الإصدار: %s", info["product"], info["version"])
    log.info("  الصفحة الحالية: %s", info["page"])
    log.info("  المشروع المفتوح: %s (عدد الخطوط الزمنية: %s)",
             info["current_project"], info["timeline_count"])
    log.info("  Python: %s", info["python"])
    log.info("(هذا الفحص للقراءة فقط – لم يتم تعديل أي شيء في DaVinci)")
    return 0


def cmd_status(args, cfg) -> int:
    from .project import Project
    p = Project.open(Path(args.project))
    st = p.state()
    print(json.dumps(st, ensure_ascii=False, indent=2))
    t = p.dir("02_transcript") / "transcript.json"
    if t.exists():
        print(json.dumps(json.loads(t.read_text(encoding="utf-8"))["summary"],
                         ensure_ascii=False, indent=2))
    return 0


def main(argv=None) -> int:
    for stream in (sys.stdout, sys.stderr):  # Arabic in Windows consoles
        try:
            stream.reconfigure(encoding="utf-8")
        except Exception:
            pass

    ap = argparse.ArgumentParser(prog="vpa", description="Claude Video Production Assistant")
    ap.add_argument("--config", help="ملف إعدادات إضافي (JSON)")
    ap.add_argument("-v", "--verbose", action="store_true")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("check")
    a = sub.add_parser("analyze")
    a.add_argument("file")
    a.add_argument("--name", help="اسم المشروع (افتراضياً اسم الملف)")
    a.add_argument("--force", action="store_true", help="إعادة كل الخطوات")
    a.add_argument("--model", help="large-v3 / medium / small ...")
    a.add_argument("--backend", choices=["auto", "whisperx", "faster_whisper"])
    a.add_argument("--device", choices=["auto", "cpu", "cuda"])
    a.add_argument("--open", action="store_true", help="فتح صفحة المراجعة بعد الانتهاء")
    sub.add_parser("resolve-check")
    s = sub.add_parser("status")
    s.add_argument("project")
    args = ap.parse_args(argv)

    setup_logging(verbose=args.verbose)
    try:
        cfg = load_config(Path(args.config) if args.config else None)
        return {"check": cmd_check, "analyze": cmd_analyze, "status": cmd_status,
                "resolve-check": cmd_resolve_check}[args.cmd](args, cfg)
    except VPAError as e:
        log.debug("".join(traceback.format_exception(e)))
        log.error("✗ %s", e.message_ar)
        log.error("  (التفاصيل في ملف السجل logs/vpa.log – أعد التشغيل وسيكمل من حيث توقف)")
        return 2
    except KeyboardInterrupt:
        log.error("✗ تم الإيقاف. أعد التشغيل وسيكمل من حيث توقف.")
        return 130
    except Exception as e:
        log.debug("".join(traceback.format_exception(e)))
        log.error("✗ خطأ غير متوقع: %s", e)
        log.error("  التفاصيل الكاملة في logs/vpa.log")
        return 1


if __name__ == "__main__":
    sys.exit(main())
