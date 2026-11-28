import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../core/i18n';
import { useStore } from '../core/store';
import { Btn, Empty, ErrorBox, Glass, Toggle } from '../ui/components';
import { Journeys, Photos, VideoProjects, uid, type VideoProject } from '../engines/storage/db';
import { MapEngine } from '../engines/map/MapEngine';
import { SceneRenderer, effectiveDuration, type MediaMap } from '../engines/video/SceneRenderer';
import { chooseVideoCodec, exportVideo, mixAudio, ExportCancelled } from '../engines/video/VideoExporter';
import { defaultProject, FORMATS, type FormatKey, type Scene, type SceneType, type VideoProjectData } from '../engines/video/VideoProject';
import { download } from '../engines/gps/gpx';
import type { Journey } from '../engines/route/types';

const SCENE_TYPES: SceneType[] = ['title', 'worldZoom', 'route', 'photo', 'clip', 'end'];

export default function Studio() {
  const { t } = useI18n();
  const { activeJourney } = useStore();
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [cur, setCur] = useState<VideoProject | null>(null);
  useEffect(() => { VideoProjects.list().then(setProjects); Journeys.list().then((j) => setJourneys(j.filter((x) => x.route))); }, []);

  const create = async (j: Journey) => {
    const name = j.name;
    const p: VideoProject = { id: uid('vp'), name, updatedAt: new Date().toISOString(), data: defaultProject(j.id, name, j.request?.points.at(-1)?.name ?? '') };
    await VideoProjects.put(p); setProjects(await VideoProjects.list()); setCur(p);
  };

  if (cur) return <Editor project={cur} journeys={journeys} onClose={async () => { setCur(null); setProjects(await VideoProjects.list()); }} />;

  return (
    <div className="page">
      <h1 className="font-display text-2xl text-white mb-1">{t('studio.title')}</h1>
      <p className="text-xs text-slate-400 mb-4">Videos are rendered from real route geometry and DEM terrain in your browser (WebCodecs → MP4). Nothing is uploaded.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Glass className="p-4">
          <h2 className="font-display text-white mb-2">{t('studio.newProject')}</h2>
          {journeys.length === 0 ? <Empty>{t('journeys.empty')}</Empty> : <ul className="divide-y divide-white/5">{journeys.map((j) => (
            <li key={j.id} className="py-2 flex justify-between items-center gap-2"><span className="text-sm truncate">{j.name}</span><Btn variant={activeJourney?.id === j.id ? 'primary' : 'ghost'} onClick={() => create(j)}>＋</Btn></li>))}</ul>}
        </Glass>
        <Glass className="p-4">
          <h2 className="font-display text-white mb-2">Projects</h2>
          {projects.length === 0 ? <Empty>{t('common.empty')}</Empty> : <ul className="divide-y divide-white/5">{projects.map((p) => (
            <li key={p.id} className="py-2 flex justify-between items-center gap-2"><span className="text-sm truncate">{p.name} <span className="text-xs text-slate-500">{new Date(p.updatedAt).toLocaleString()}</span></span>
              <span className="flex gap-1"><Btn variant="chip" onClick={() => setCur(p)}>{t('common.open')}</Btn><Btn variant="chip" onClick={async () => { await VideoProjects.remove(p.id); setProjects(await VideoProjects.list()); }}>✕</Btn></span></li>))}</ul>}
        </Glass>
      </div>
    </div>
  );
}

function Editor({ project, journeys, onClose }: { project: VideoProject; journeys: Journey[]; onClose: () => void }) {
  const { t } = useI18n();
  const [d, setD] = useState<VideoProjectData>(project.data as VideoProjectData);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [media, setMedia] = useState<MediaMap>({ images: new Map(), videos: new Map() });
  const [missing, setMissing] = useState<string[]>([]);
  const [codecInfo, setCodecInfo] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<{ url: string; blob: Blob; codec: string; bytes: number; frames: number } | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const [previewing, setPreviewing] = useState(false);
  const [musicBuf, setMusicBuf] = useState<ArrayBuffer | null>(null);
  const holder = useRef<HTMLDivElement>(null);
  const previewBox = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const abort = useRef<AbortController | null>(null);
  const previewRaf = useRef(0);
  const f = FORMATS[d.format];

  // Persist project on every change (debounced).
  useEffect(() => { const h = setTimeout(() => VideoProjects.put({ ...project, name: d.title, updatedAt: new Date().toISOString(), data: d }), 400); return () => clearTimeout(h); }, [d]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setJourney(journeys.find((j) => j.id === d.journeyId) ?? null); }, [journeys, d.journeyId]);

  // Load referenced media from IndexedDB; report missing references.
  useEffect(() => {
    const urls: string[] = [];
    (async () => {
      const all = [...(await Photos.forJourney(`studio:${project.id}`)), ...(d.journeyId ? await Photos.forJourney(d.journeyId) : [])];
      const images = new Map<string, HTMLImageElement>(), videos = new Map<string, HTMLVideoElement>();
      for (const r of all) {
        const u = URL.createObjectURL(r.blob); urls.push(u);
        if (r.blob.type.startsWith('video/')) { const v = document.createElement('video'); v.src = u; v.muted = true; v.preload = 'auto'; await new Promise((res) => { v.onloadeddata = res; v.onerror = res; }); videos.set(r.id, v); }
        else { const im = new Image(); im.src = u; await im.decode().catch(() => {}); images.set(r.id, im); }
      }
      setMedia({ images, videos });
      setMissing(d.scenes.filter((s) => (s.type === 'photo' && (!s.mediaId || !images.has(s.mediaId))) || (s.type === 'clip' && (!s.mediaId || !videos.has(s.mediaId)))).map((s) => s.mediaName ?? s.type));
    })();
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [project.id, d.journeyId, d.scenes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { chooseVideoCodec({ width: f.width, height: f.height, fps: d.fps, bitrate: d.bitrateMbps * 1e6 }).then((c) => setCodecInfo(c ? c.label : null)); }, [f.width, f.height, d.fps, d.bitrateMbps]);

  // Hidden render map at the exact output size (pixelRatio 1).
  const setupRenderer = async (scale: number) => {
    teardown();
    if (!journey?.route || !holder.current) throw new Error('no_route');
    const el = holder.current;
    el.style.width = `${Math.round(f.width * scale)}px`; el.style.height = `${Math.round(f.height * scale)}px`;
    const engine = new MapEngine({ container: el, center: journey.route.coords[0], zoom: 12, pitch: 55, interactive: false, preserveDrawingBuffer: true, pixelRatio: 1 });
    engineRef.current = engine;
    await engine.ready();
    engine.setRoutes([journey.route], journey.route.id);
    await document.fonts.ready;
    rendererRef.current = new SceneRenderer(engine, journey.route, d, media, scale);
    return rendererRef.current;
  };
  const teardown = () => { cancelAnimationFrame(previewRaf.current); rendererRef.current?.destroy(); rendererRef.current = null; engineRef.current?.destroy(); engineRef.current = null; };
  useEffect(() => () => { abort.current?.abort(); teardown(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = async () => {
    setErr(null);
    try {
      const r = await setupRenderer(0.4); // lower-quality real-time preview
      setPreviewing(true);
      previewBox.current?.replaceChildren(r.canvas); r.canvas.className = 'w-full rounded-xl';
      const dur = effectiveDuration(d); const t0 = performance.now();
      let busy = false;
      const loop = async () => {
        const t = (performance.now() - t0) / 1000;
        if (t > dur || !rendererRef.current) { setPreviewing(false); return; }
        if (!busy) { busy = true; await r.draw(t, false, 1 / 30); busy = false; }
        previewRaf.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) { setErr(e); }
  };

  const render = async () => {
    setErr(null); setResult(null); setProgress(0);
    abort.current = new AbortController();
    try {
      const r = await setupRenderer(1);
      const dur = effectiveDuration(d);
      const audio = await mixAudio({ durationS: dur, tracks: d.audio.map((a) => ({ ...a, buffer: a.kind === 'music' ? musicBuf ?? undefined : undefined })).filter((a) => a.kind !== 'music' || a.buffer) });
      const res = await exportVideo({
        canvas: r.canvas, profile: { width: f.width, height: f.height, fps: d.fps, bitrate: d.bitrateMbps * 1e6 }, durationS: dur, audio,
        signal: abort.current.signal, onProgress: (x) => setProgress(x),
        drawFrame: (_i, tt) => r.draw(tt, true, 1 / d.fps),
      });
      const url = URL.createObjectURL(res.blob);
      setResult({ url, blob: res.blob, codec: res.codec, bytes: res.blob.size, frames: res.frames });
      setD((x) => ({ ...x, exports: [{ at: new Date().toISOString(), format: `${f.width}x${f.height}`, fps: d.fps, bytes: res.blob.size, codec: res.codec, durationS: res.durationS }, ...x.exports].slice(0, 20) }));
    } catch (e) { if (!(e instanceof ExportCancelled)) setErr(e); }
    finally { setProgress(null); teardown(); }
  };

  const upd = (i: number, s: Partial<Scene>) => setD((x) => ({ ...x, scenes: x.scenes.map((y, k) => (k === i ? { ...y, ...s } : y)) }));
  const move = (i: number, dir: -1 | 1) => setD((x) => { const sc = [...x.scenes]; const j = i + dir; if (j < 0 || j >= sc.length) return x; [sc[i], sc[j]] = [sc[j], sc[i]]; return { ...x, scenes: sc }; });
  const addMedia = async (file: File, i: number) => {
    const id = uid('m'); await Photos.add({ id, journeyId: `studio:${project.id}`, blob: file, name: file.name });
    upd(i, { mediaId: id, mediaName: file.name, ...(file.type.startsWith('video/') ? { type: 'clip' as const } : {}) });
  };
  const allPhotoIds = [...media.images.keys()];

  return (
    <div className="page space-y-3">
      <div className="flex flex-wrap items-center gap-2"><Btn variant="chip" onClick={onClose}>←</Btn><h1 className="font-display text-xl text-white">{t('studio.title')}</h1></div>
      <div className="grid gap-3 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          <Glass className="p-3 grid gap-2 sm:grid-cols-2">
            <label className="text-xs">{t('studio.source')}<select className="field mt-1" value={d.journeyId ?? ''} onChange={(e) => setD({ ...d, journeyId: e.target.value })}>{journeys.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}</select></label>
            <label className="text-xs">{t('studio.title.text')}<input className="field mt-1" dir="auto" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></label>
            <label className="text-xs">{t('home.destination')}<input className="field mt-1" dir="auto" value={d.destination} onChange={(e) => setD({ ...d, destination: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-2"><label className="text-xs">{t('atlas.country')}<input className="field mt-1" dir="auto" value={d.country} onChange={(e) => setD({ ...d, country: e.target.value })} /></label><label className="text-xs">Date<input type="date" className="field mt-1" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} /></label></div>
          </Glass>
          <Glass className="p-3 space-y-2" as="section" aria-label={t('studio.scenes')}>
            <div className="flex justify-between items-center"><h2 className="font-display text-white">{t('studio.scenes')}</h2><span className="text-xs text-slate-400">{effectiveDuration(d).toFixed(1)} s</span></div>
            {/* Visual timeline bar proportional to scene durations */}
            <div className="flex h-6 rounded-lg overflow-hidden border border-white/10" aria-hidden>{d.scenes.map((s) => <div key={s.id} style={{ flex: s.duration }} className={`border-e border-ink-900 text-[9px] px-1 truncate ${s.type === 'route' ? 'bg-aqua-500/40' : s.type === 'photo' || s.type === 'clip' ? 'bg-amber-500/30' : 'bg-white/10'}`}>{s.type}</div>)}</div>
            <ol className="space-y-2">{d.scenes.map((s, i) => (
              <li key={s.id} className="rounded-xl border border-white/10 p-2 grid gap-2 sm:grid-cols-[auto_1fr_auto] items-start" data-testid="scene">
                <div className="flex sm:flex-col gap-1"><Btn variant="chip" aria-label="Up" onClick={() => move(i, -1)}>↑</Btn><Btn variant="chip" aria-label="Down" onClick={() => move(i, 1)}>↓</Btn></div>
                <div className="grid gap-1 sm:grid-cols-3 text-xs">
                  <select className="field" value={s.type} onChange={(e) => upd(i, { type: e.target.value as SceneType })} aria-label="Scene type">{SCENE_TYPES.map((x) => <option key={x}>{x}</option>)}</select>
                  <label className="flex items-center gap-1">s<input type="number" min={1} max={120} step={0.5} className="field" value={s.duration} onChange={(e) => upd(i, { duration: Math.max(1, +e.target.value) })} aria-label="Duration" /></label>
                  <select className="field" value={s.transition ?? 'fade'} onChange={(e) => upd(i, { transition: e.target.value as 'cut' | 'fade' })} aria-label="Transition"><option>fade</option><option>cut</option></select>
                  {s.type !== 'worldZoom' && <input className="field sm:col-span-3" dir="auto" placeholder="Text / caption" value={s.text === 'reveal' ? '' : s.text ?? ''} onChange={(e) => upd(i, { text: e.target.value })} aria-label="Text" />}
                  {s.type === 'route' && <>
                    <select className="field" value={s.camera ?? 'follow'} onChange={(e) => upd(i, { camera: e.target.value as Scene['camera'] })} aria-label="Camera"><option value="follow">Follow hiker</option><option value="aerial">Drone aerial</option></select>
                    <label className="flex items-center gap-1">from<input type="number" min={0} max={1} step={0.05} className="field" value={s.from ?? 0} onChange={(e) => upd(i, { from: +e.target.value, text: s.text === 'reveal' ? '' : s.text })} /></label>
                    <label className="flex items-center gap-1">to<input type="number" min={0} max={1} step={0.05} className="field" value={s.to ?? 1} onChange={(e) => upd(i, { to: +e.target.value, text: s.text === 'reveal' ? '' : s.text })} /></label>
                    <label className="flex items-center gap-1">height<input type="range" min={0.6} max={2} step={0.1} value={s.cameraDistance ?? 1} onChange={(e) => upd(i, { cameraDistance: +e.target.value })} /></label>
                    <label className="flex items-center gap-1">angle<input type="range" min={30} max={80} value={s.cameraPitch ?? 62} onChange={(e) => upd(i, { cameraPitch: +e.target.value })} /></label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={s.text === 'reveal'} onChange={(e) => upd(i, { text: e.target.checked ? 'reveal' : '' })} />route reveal flyover</label>
                  </>}
                  {(s.type === 'photo' || s.type === 'clip') && <div className="sm:col-span-3 flex flex-wrap gap-1 items-center">
                    {s.type === 'photo' && allPhotoIds.length > 0 && <select className="field w-auto" value={s.mediaId ?? ''} onChange={(e) => upd(i, { mediaId: e.target.value })} aria-label="Photo"><option value="">— photo —</option>{allPhotoIds.map((id) => <option key={id} value={id}>{id.slice(0, 10)}</option>)}</select>}
                    <label className="btn btn-chip cursor-pointer">{s.mediaName ?? 'Import file'}<input type="file" className="sr-only" accept={s.type === 'clip' ? 'video/mp4,video/webm' : 'image/*'} onChange={(e) => e.target.files?.[0] && addMedia(e.target.files[0], i)} /></label>
                    <span className="text-slate-500">your own media only</span></div>}
                </div>
                <Btn variant="chip" aria-label={t('common.delete')} onClick={() => setD((x) => ({ ...x, scenes: x.scenes.filter((_, k) => k !== i) }))}>✕</Btn>
              </li>))}</ol>
            <Btn onClick={() => setD((x) => ({ ...x, scenes: [...x.scenes, { id: uid('s'), type: 'route', duration: 8, camera: 'aerial', from: 0, to: 1, transition: 'fade' }] }))}>＋ {t('studio.addScene')}</Btn>
            {missing.length > 0 && <p className="text-xs text-red-300" role="alert">Missing media: {missing.join(', ')}</p>}
          </Glass>
        </div>

        <div className="space-y-3">
          <Glass className="p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <label>{t('studio.format')}<select className="field mt-1" value={d.format} onChange={(e) => setD({ ...d, format: e.target.value as FormatKey })}>{(Object.keys(FORMATS) as FormatKey[]).map((k) => <option key={k} value={k}>{FORMATS[k].label}</option>)}</select></label>
              <label>{t('studio.fps')}<select className="field mt-1" value={d.fps} onChange={(e) => setD({ ...d, fps: +e.target.value as 25 | 30 | 60 })}>{[25, 30, 60].map((x) => <option key={x}>{x}</option>)}</select></label>
              <label>{t('studio.bitrate')}<select className="field mt-1" value={d.bitrateMbps} onChange={(e) => setD({ ...d, bitrateMbps: +e.target.value })}>{[4, 8, 12, 16, 24].map((x) => <option key={x} value={x}>{x} Mbps</option>)}</select></label>
            </div>
            <p className={`text-xs ${codecInfo ? 'text-aqua-300' : 'text-red-300'}`} data-testid="codec">{typeof VideoEncoder === 'undefined' ? t('studio.noWebCodecs') : codecInfo ? `Encoder: ${codecInfo} @ ${f.width}×${f.height} ${d.fps} fps` : t('studio.unsupported')}</p>
            <Toggle checked={d.showStats} onChange={(v) => setD({ ...d, showStats: v })} label="Distance / elevation overlay" />
            <Toggle checked={d.branding.intro} onChange={(v) => setD({ ...d, branding: { ...d.branding, intro: v } })} label="SAMIR WANDERUNG intro" />
            <Toggle checked={d.branding.watermark} onChange={(v) => setD({ ...d, branding: { ...d.branding, watermark: v } })} label="Watermark" />
            <Toggle checked={d.branding.endScreen} onChange={(v) => setD({ ...d, branding: { ...d.branding, endScreen: v } })} label="End screen & credits" />
            <input className="field text-xs" dir="auto" placeholder="Creator credit (optional)" value={d.branding.creditText} onChange={(e) => setD({ ...d, branding: { ...d.branding, creditText: e.target.value } })} />
          </Glass>
          <Glass className="p-3 space-y-2 text-xs">
            <div className="field-label">Audio</div>
            {(['ambientWind', 'ambientForest', 'footsteps', 'music'] as const).map((k) => {
              const a = d.audio.find((x) => x.kind === k);
              return <div key={k} className="flex items-center gap-2"><label className="flex items-center gap-1 w-28"><input type="checkbox" checked={!!a} onChange={(e) => setD({ ...d, audio: e.target.checked ? [...d.audio, { kind: k, volume: 0.5, fadeIn: 1.5, fadeOut: 2 }] : d.audio.filter((x) => x.kind !== k) })} />{k}</label>
                {a && <><input type="range" min={0} max={1} step={0.05} value={a.volume} aria-label="Volume" onChange={(e) => setD({ ...d, audio: d.audio.map((x) => (x.kind === k ? { ...x, volume: +e.target.value } : x)) })} />
                  <label className="flex items-center gap-1">fade<input type="number" min={0} max={10} step={0.5} className="field w-14" value={a.fadeIn} onChange={(e) => setD({ ...d, audio: d.audio.map((x) => (x.kind === k ? { ...x, fadeIn: +e.target.value, fadeOut: +e.target.value } : x)) })} /></label></>}</div>;
            })}
            {d.audio.some((a) => a.kind === 'music') && <label className="btn btn-chip cursor-pointer">{t('studio.music')}<input type="file" accept="audio/*" className="sr-only" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setMusicBuf(await file.arrayBuffer()); }} /></label>}
            <p className="text-slate-500">{t('studio.musicNote')} Wind, forest and footsteps are synthesized in the browser (original audio). Music files are not saved with the project; re-select before rendering.</p>
          </Glass>
          <Glass className="p-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Btn onClick={preview} disabled={!journey?.route || progress !== null || previewing}>{t('studio.preview')}</Btn>
              <Btn variant="primary" onClick={render} disabled={!journey?.route || progress !== null || !codecInfo} data-testid="render">{t('studio.render')}</Btn>
              {progress !== null && <Btn variant="danger" onClick={() => abort.current?.abort()}>{t('common.cancel')}</Btn>}
            </div>
            {progress !== null && <div><div className="h-2 rounded bg-white/10 overflow-hidden"><div className="h-full bg-aqua-400" style={{ width: `${progress * 100}%` }} /></div><div className="text-xs text-slate-300 mt-1" data-testid="render-progress">{t('studio.rendering')} {Math.round(progress * 100)}%</div></div>}
            <div ref={previewBox} />
            {result && <div className="space-y-1" data-testid="render-done"><video src={result.url} controls className="w-full rounded-xl" /><div className="text-xs text-slate-300">{t('studio.done')}: {(result.bytes / 1e6).toFixed(1)} MB · {result.frames} frames · {result.codec}</div><Btn variant="primary" onClick={() => download(`${d.title.replace(/[^\w-]+/g, '_')}.mp4`, result.blob, 'video/mp4')}>{t('studio.download')}</Btn></div>}
            {err != null && <ErrorBox error={err} />}
            {d.exports.length > 0 && <details className="text-xs text-slate-400"><summary>Export history ({d.exports.length})</summary><ul>{d.exports.map((x) => <li key={x.at}>{new Date(x.at).toLocaleString()} · {x.format} {x.fps}fps · {(x.bytes / 1e6).toFixed(1)} MB · {x.codec}</li>)}</ul></details>}
          </Glass>
        </div>
      </div>
      {/* Off-screen render surface (exact output size) */}
      <div ref={holder} aria-hidden style={{ position: 'fixed', left: -30000, top: 0, width: 10, height: 10 }} />
    </div>
  );
}

