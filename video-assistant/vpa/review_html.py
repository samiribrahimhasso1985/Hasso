"""Static, offline review page (RTL Arabic). Opens in any browser by double-click.

Click a word to hear exactly that word; flagged words are colored; regions with
sound but no transcribed words are listed so they can be checked by ear.
"""

from __future__ import annotations

import html
import json
from pathlib import Path

from .uncertainty import FLAG_LABELS_AR

TEMPLATE = """<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>مراجعة التفريغ – __TITLE__</title>
<style>
  :root { --bg:#f7f7f5; --fg:#1d1d1f; --muted:#6b6b70; --card:#fff; --line:#e3e3e0;
          --warn:#fff1c2; --warnb:#d9a400; --bad:#ffd9d6; --badb:#d33; --cur:#cfe6ff; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#151517; --fg:#ececee; --muted:#9a9aa2; --card:#1f1f23; --line:#33333a;
            --warn:#4a3d10; --warnb:#e0b52a; --bad:#4d1f1c; --badb:#ff6b5e; --cur:#18395c; } }
  body { margin:0; font-family: "Cairo", "Segoe UI", Tahoma, sans-serif; background:var(--bg); color:var(--fg); }
  header { position:sticky; top:0; background:var(--card); border-bottom:1px solid var(--line); padding:12px 16px; z-index:2; }
  h1 { font-size:18px; margin:0 0 6px; }
  .stats { color:var(--muted); font-size:13px; display:flex; flex-wrap:wrap; gap:4px 16px; }
  .player { max-width:100%; max-height:38vh; display:block; margin-top:8px; background:#000; }
  main { padding:16px; max-width:1000px; margin:auto; }
  .legend span { display:inline-block; padding:1px 8px; border-radius:4px; margin-left:6px; font-size:13px; }
  .seg { background:var(--card); border:1px solid var(--line); border-radius:8px; padding:10px 12px; margin:10px 0; }
  .seg .meta { font-size:12px; color:var(--muted); margin-bottom:4px; }
  .seg .meta .sf { color:var(--badb); }
  .w { display:inline-block; padding:2px 4px; margin:2px 1px; border-radius:4px; cursor:pointer; font-size:22px; line-height:1.6; border-bottom:2px solid transparent; }
  .w:hover { outline:1px solid var(--line); }
  .w.flag { background:var(--warn); border-bottom-color:var(--warnb); }
  .w.bad { background:var(--bad); border-bottom-color:var(--badb); }
  .w.cur { background:var(--cur) !important; }
  .gap { background:var(--bad); border:1px dashed var(--badb); border-radius:8px; padding:8px 12px; margin:10px 0; }
  button { font:inherit; cursor:pointer; padding:2px 10px; border-radius:6px; border:1px solid var(--line); background:var(--card); color:var(--fg); }
  #tip { position:fixed; bottom:12px; left:12px; right:12px; background:var(--card); border:1px solid var(--line); border-radius:8px; padding:8px 12px; font-size:14px; display:none; }
</style>
</head>
<body>
<header>
  <h1>مراجعة التفريغ الصوتي – __TITLE__</h1>
  <div class="stats" id="stats"></div>
  __PLAYER__
</header>
<main>
  <p class="legend">
    <span style="background:var(--warn)">تحتاج مراجعة</span>
    <span style="background:var(--bad)">مشكوك فيها بشدة</span>
    <span style="background:var(--cur)">الكلمة الحالية</span>
    — انقر على أي كلمة لسماعها وحدها. اضغط Shift+نقر لتشغيل المقطع من تلك الكلمة.
  </p>
  <div id="content"></div>
</main>
<div id="tip"></div>
<script id="data" type="application/json">__DATA__</script>
<script>
const D = JSON.parse(document.getElementById('data').textContent);
const LABELS = D.labels;
const player = document.getElementById('player');
const fmt = t => t == null ? '—' : (Math.floor(t/60) + ':' + (t%60).toFixed(2).padStart(5,'0'));
const S = D.summary;
document.getElementById('stats').innerHTML =
  `<span>المحرك: ${D.engine.backend} / ${D.engine.model}</span>` +
  `<span>اللغة: ${D.engine.language}${D.engine.detected_language && D.engine.detected_language!==D.engine.language ? ' (المكتشفة: '+D.engine.detected_language+')' : ''}</span>` +
  `<span>الكلمات: ${S.word_count}</span>` +
  `<span>تحتاج مراجعة: ${S.flagged_count} (${Math.round(S.flagged_ratio*100)}%)</span>` +
  (S.mean_align_score!=null ? `<span>متوسط دقة المحاذاة: ${S.mean_align_score}</span>` : '') +
  `<span>مناطق صوت بلا نص: ${S.uncovered_regions} (${S.uncovered_seconds} ث)</span>`;

const byId = Object.fromEntries(D.words.map(w => [w.id, w]));
const BAD = new Set(['timing_missing','repetition','segment_maybe_hallucination','low_probability']);
const root = document.getElementById('content');
const items = [...D.segments.map(s => ({t:s.start ?? 0, seg:s})),
               ...D.uncovered_regions.map(g => ({t:g.start, gap:g}))].sort((a,b)=>a.t-b.t);
const els = [];
for (const it of items) {
  if (it.gap) {
    const g = it.gap, div = document.createElement('div');
    div.className = 'gap';
    div.innerHTML = `⚠️ صوت بدون كلمات مفرّغة ${fmt(g.start)} – ${fmt(g.end)} (${g.duration} ث). استمع وتأكد هل فيه كلام فاته النظام. <button>▶ استماع</button>`;
    div.querySelector('button').onclick = () => playRange(g.start, g.end);
    root.appendChild(div); continue;
  }
  const s = it.seg, div = document.createElement('div');
  div.className = 'seg';
  const sf = s.flags.map(f => LABELS[f] || f).join('، ');
  div.innerHTML = `<div class="meta"><span dir="ltr">${s.id} · ${fmt(s.start)} → ${fmt(s.end)}</span> ${sf ? '<span class="sf"> · '+sf+'</span>' : ''}</div>`;
  for (const id of s.word_ids) {
    const w = byId[id], sp = document.createElement('span');
    sp.className = 'w' + (w.needs_review ? (w.flags.some(f=>BAD.has(f)) ? ' bad' : ' flag') : '');
    sp.textContent = w.text;
    sp.title = `${fmt(w.start)} → ${fmt(w.end)}` +
      (w.align_score!=null ? ` | محاذاة ${w.align_score}` : '') +
      (w.probability!=null ? ` | ثقة ${w.probability}` : '') +
      (w.flags.length ? ' | ' + w.flags.map(f=>LABELS[f]||f).join('، ') : '');
    sp.onclick = e => {
      showTip(w);
      if (w.start == null) return;
      e.shiftKey ? playRange(w.start, s.end) : playRange(w.start, w.end);
    };
    els.push([w, sp]);
    div.appendChild(sp);
    div.appendChild(document.createTextNode(' '));
  }
  root.appendChild(div);
}
let stopAt = null;
function playRange(a, b) {
  if (!player) return;
  player.currentTime = Math.max(0, a - 0.05);
  stopAt = b + 0.08;
  player.play();
}
if (player) player.addEventListener('timeupdate', () => {
  const t = player.currentTime;
  if (stopAt != null && t >= stopAt) { player.pause(); stopAt = null; }
  for (const [w, sp] of els) sp.classList.toggle('cur', w.start!=null && t >= w.start && t < w.end);
});
function showTip(w) {
  const tip = document.getElementById('tip');
  tip.style.display = 'block';
  tip.textContent = `${w.id} «${w.text}» ${fmt(w.start)} → ${fmt(w.end)}` +
    (w.flags.length ? ' — ' + w.flags.map(f=>LABELS[f]||f).join('، ') : ' — لا ملاحظات');
}
</script>
</body>
</html>
"""


def write_review_html(doc: dict, out: Path, media_rel: str | None, is_video: bool, title: str) -> Path:
    data = {
        "engine": doc["engine"],
        "segments": doc["segments"],
        "words": doc["words"],
        "uncovered_regions": doc.get("uncovered_regions", []),
        "summary": doc["summary"],
        "labels": FLAG_LABELS_AR,
    }
    if media_rel:
        tag = "video" if is_video else "audio"
        player = (f'<{tag} id="player" class="player" controls preload="auto" '
                  f'src="{html.escape(media_rel)}"></{tag}>')
    else:
        player = "<p>لا يوجد ملف وسائط للتشغيل.</p>"
    payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    page = (TEMPLATE.replace("__TITLE__", html.escape(title))
            .replace("__PLAYER__", player)
            .replace("__DATA__", payload))
    out.write_text(page, encoding="utf-8")
    return out
