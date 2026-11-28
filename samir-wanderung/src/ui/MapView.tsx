import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MapEngine, webglSupported, type MapMode } from '../engines/map/MapEngine';
import { useI18n } from '../core/i18n';
import { useStore } from '../core/store';
import type { LngLat } from '../engines/route/geo';

/**
 * React wrapper around MapEngine. Creates one map per mount and destroys it on unmount
 * (removes WebGL context, listeners and markers).
 */
export function MapView({ onReady, className = '', center, zoom, pitch, mode = 'terrain', preserveDrawingBuffer, children, showControls = true }: {
  onReady?: (e: MapEngine) => void | (() => void); className?: string; center?: LngLat; zoom?: number; pitch?: number; mode?: MapMode;
  preserveDrawingBuffer?: boolean; children?: ReactNode; showControls?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
  const { t } = useI18n();
  const { settings } = useStore();
  const [terrainErr, setTerrainErr] = useState(false);
  const [noGl] = useState(() => !webglSupported());
  const [m, setM] = useState<MapMode>(mode);

  useEffect(() => {
    if (noGl || !ref.current) return;
    const engine = new MapEngine({ container: ref.current, center, zoom, pitch, preserveDrawingBuffer, lowPower: settings.lowPower });
    engineRef.current = engine;
    engine.setTerrainErrorHandler(() => setTerrainErr(true));
    let cleanup: void | (() => void);
    let alive = true;
    engine.ready().then(() => { if (!alive) return; engine.setMode(settings.lowPower ? 'flat' : mode); cleanup = onReady?.(engine); });
    return () => { alive = false; if (typeof cleanup === 'function') cleanup(); engine.destroy(); engineRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noGl]);

  const setMode = (x: MapMode) => { setM(x); engineRef.current?.setMode(x); };

  if (noGl) return <div className={`map-fallback relative ${className}`}><p>{t('map.webglMissing')}</p>{children}</div>;
  return (
    <div className={`${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative '}${className}`}>
      <div ref={ref} className="absolute inset-0" data-testid="map" />
      {showControls && (
        <div className="absolute top-3 end-3 z-10 flex flex-col gap-1.5">
          <div className="glass p-1 flex flex-col gap-1" role="group" aria-label="Map mode">
            {(['terrain', 'satellite', 'flat'] as MapMode[]).map((x) => (
              <button key={x} className={`btn btn-chip text-xs ${m === x ? 'is-active' : ''}`} aria-pressed={m === x} onClick={() => setMode(x)}>
                {x === 'terrain' ? t('map.mode.terrain') : x === 'satellite' ? t('map.mode.satellite') : '2D'}
              </button>
            ))}
          </div>
          <div className="glass p-1 flex flex-col gap-1">
            <button className="btn btn-chip" aria-label={t('map.zoomIn')} onClick={() => engineRef.current?.map.zoomIn()}>＋</button>
            <button className="btn btn-chip" aria-label={t('map.zoomOut')} onClick={() => engineRef.current?.map.zoomOut()}>－</button>
            <button className="btn btn-chip" aria-label={t('map.fullscreen')} onClick={() => ref.current?.parentElement?.requestFullscreen?.()}>⛶</button>
          </div>
        </div>
      )}
      {terrainErr && <div className="absolute bottom-10 start-3 z-10 glass px-3 py-2 text-xs text-amber-200">{t('map.terrainMissing')}</div>}
      {children}
    </div>
  );
}
