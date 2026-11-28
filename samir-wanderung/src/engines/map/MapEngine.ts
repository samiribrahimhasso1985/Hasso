/**
 * MapEngine wraps MapLibre GL: real vector basemap (OpenFreeMap / OSM), real DEM terrain
 * (AWS Terrain Tiles, Terrarium encoding), hillshade, DEM-derived contour lines,
 * optional Esri satellite imagery and route/marker layers.
 */
import maplibregl, { type Map as MLMap, type StyleSpecification, type GeoJSONSource, type LngLatLike } from 'maplibre-gl';
import mlcontour from 'maplibre-contour';
import { MAP_STYLE_URL, PROVIDERS, SATELLITE_TILES, TERRAIN_TILES } from '../../config/providers';
import type { LngLat } from '../route/geo';
import type { Route } from '../route/types';

export type MapMode = 'terrain' | 'satellite' | 'flat';

export interface MapEngineOptions {
  container: HTMLElement;
  center?: LngLat;
  zoom?: number;
  pitch?: number;
  bearing?: number;
  interactive?: boolean;
  /** Needed when the canvas is captured for video export. */
  preserveDrawingBuffer?: boolean;
  lowPower?: boolean;
}

export function webglSupported(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

let demSource: InstanceType<typeof mlcontour.DemSource> | null = null;
function getDemSource() {
  if (!demSource) {
    demSource = new mlcontour.DemSource({ url: TERRAIN_TILES, encoding: 'terrarium', maxzoom: 13, worker: true });
    demSource.setupMaplibre(maplibregl);
  }
  return demSource;
}

type Listener = (e: { lngLat: LngLat }) => void;

export class MapEngine {
  readonly map: MLMap;
  private mode: MapMode = 'terrain';
  private exaggeration = 1.3;
  private terrainFailed = false;
  private readyPromise: Promise<void>;
  private clickListeners = new Set<Listener>();
  private onTerrainError?: () => void;
  private markers: maplibregl.Marker[] = [];

  constructor(opts: MapEngineOptions) {
    this.map = new maplibregl.Map({
      container: opts.container,
      style: MAP_STYLE_URL,
      center: opts.center ?? [10.99, 47.42],
      zoom: opts.zoom ?? 11,
      pitch: opts.pitch ?? 55,
      bearing: opts.bearing ?? -20,
      maxPitch: 85,
      interactive: opts.interactive ?? true,
      attributionControl: { compact: true },
      canvasContextAttributes: undefined,
      preserveDrawingBuffer: opts.preserveDrawingBuffer ?? false,
      fadeDuration: opts.lowPower ? 0 : 300,
    } as maplibregl.MapOptions);
    if (opts.lowPower) this.exaggeration = 1.0;

    this.readyPromise = new Promise((resolve) => {
      this.map.once('load', () => { this.installSources(); resolve(); });
    });
    this.map.on('click', (e) => this.clickListeners.forEach((l) => l({ lngLat: [e.lngLat.lng, e.lngLat.lat] })));
    this.map.on('error', (e) => {
      const src = (e as unknown as { sourceId?: string }).sourceId;
      if (src === 'dem' || src === 'dem-hillshade') {
        if (!this.terrainFailed) { this.terrainFailed = true; this.onTerrainError?.(); }
      }
    });
  }

  ready(): Promise<void> { return this.readyPromise; }
  get terrainAvailable(): boolean { return !this.terrainFailed; }
  setTerrainErrorHandler(fn: () => void) { this.onTerrainError = fn; if (this.terrainFailed) fn(); }

  private installSources() {
    const m = this.map;
    const dem = getDemSource();
    m.addSource('dem', { type: 'raster-dem', tiles: [TERRAIN_TILES], encoding: 'terrarium', tileSize: 256, maxzoom: 15, attribution: PROVIDERS.terrarium.attribution });
    m.addSource('dem-hillshade', { type: 'raster-dem', tiles: [TERRAIN_TILES], encoding: 'terrarium', tileSize: 256, maxzoom: 15 });
    m.addSource('satellite', { type: 'raster', tiles: [SATELLITE_TILES], tileSize: 256, maxzoom: 19, attribution: PROVIDERS.esriImagery.attribution });
    m.addSource('contours', {
      type: 'vector',
      tiles: [dem.contourProtocolUrl({ multiplier: 1, thresholds: { 11: [200, 1000], 12: [100, 500], 13: [50, 250], 14: [20, 100] }, elevationKey: 'ele', levelKey: 'level', contourLayer: 'contours' })],
      maxzoom: 15,
    });

    const firstSymbol = m.getStyle().layers.find((l) => l.type === 'symbol')?.id;
    m.addLayer({ id: 'satellite', type: 'raster', source: 'satellite', layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 200 } }, firstSymbol);
    m.addLayer({ id: 'hillshade', type: 'hillshade', source: 'dem-hillshade', paint: { 'hillshade-exaggeration': 0.45, 'hillshade-shadow-color': '#0b1418', 'hillshade-highlight-color': '#ffffff', 'hillshade-accent-color': '#20343c' } }, firstSymbol);
    m.addLayer({ id: 'contour-lines', type: 'line', source: 'contours', 'source-layer': 'contours', minzoom: 11,
      paint: { 'line-color': 'rgba(20,211,200,0.35)', 'line-width': ['match', ['get', 'level'], 1, 1.1, 0.5] } }, firstSymbol);
    m.addLayer({ id: 'contour-labels', type: 'symbol', source: 'contours', 'source-layer': 'contours', minzoom: 13, filter: ['>', ['get', 'level'], 0],
      layout: { 'symbol-placement': 'line', 'text-field': ['concat', ['number-format', ['get', 'ele'], {}], ' m'], 'text-size': 10, 'text-font': ['Noto Sans Regular'] },
      paint: { 'text-color': '#7ff3ea', 'text-halo-color': '#0b0f12', 'text-halo-width': 1 } });

    // Route layers (filled later).
    m.addSource('routes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    m.addSource('progress', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, lineMetrics: true });
    m.addSource('track', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    m.addLayer({ id: 'route-alt', type: 'line', source: 'routes', filter: ['==', ['get', 'role'], 'alt'], layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#8aa4ad', 'line-width': 4, 'line-opacity': 0.75, 'line-dasharray': [1.5, 1.5] } });
    m.addLayer({ id: 'route-glow', type: 'line', source: 'routes', filter: ['==', ['get', 'role'], 'main'], layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#14d3c8', 'line-width': 14, 'line-blur': 10, 'line-opacity': 0.55 } });
    m.addLayer({ id: 'route-main', type: 'line', source: 'routes', filter: ['==', ['get', 'role'], 'main'], layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#7ff3ea', 'line-width': 4 } });
    m.addLayer({ id: 'progress-glow', type: 'line', source: 'progress', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#38d9ff', 'line-width': 18, 'line-blur': 12, 'line-opacity': 0.7 } });
    m.addLayer({ id: 'progress-line', type: 'line', source: 'progress', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-width': 5, 'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, '#14d3c8', 1, '#e9fffd'] } });
    m.addLayer({ id: 'track-line', type: 'line', source: 'track', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffb347', 'line-width': 4 } });

    this.applyMode();
    this.applySky();
  }

  private applySky() {
    const m = this.map as MLMap & { setSky?: (s: unknown) => void };
    try {
      m.setSky?.({ 'sky-color': '#0d1b22', 'horizon-color': '#1d3a44', 'fog-color': '#0b0f12', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.4, 'atmosphere-blend': 0.8 });
    } catch { /* sky unsupported */ }
  }

  setMode(mode: MapMode) { this.mode = mode; if (this.map.isStyleLoaded()) this.applyMode(); }
  getMode() { return this.mode; }

  private applyMode() {
    const m = this.map;
    if (!m.getLayer('satellite')) return;
    m.setLayoutProperty('satellite', 'visibility', this.mode === 'satellite' ? 'visible' : 'none');
    const terrainOn = this.mode !== 'flat' && !this.terrainFailed;
    m.setTerrain(terrainOn ? { source: 'dem', exaggeration: this.exaggeration } : null);
    m.setLayoutProperty('hillshade', 'visibility', this.mode === 'satellite' ? 'none' : 'visible');
  }

  setExaggeration(x: number) { this.exaggeration = x; this.applyMode(); }

  /** Terrain elevation (m) at a point if the DEM tile is loaded, else null. */
  elevationAt(c: LngLat): number | null {
    const v = this.map.queryTerrainElevation(c as LngLatLike);
    return v == null ? null : v / (this.map.getTerrain()?.exaggeration ?? 1);
  }

  onClick(fn: Listener): () => void { this.clickListeners.add(fn); return () => this.clickListeners.delete(fn); }

  setRoutes(routes: Route[], selectedId?: string) {
    const src = this.map.getSource('routes') as GeoJSONSource | undefined;
    if (!src) return;
    src.setData({
      type: 'FeatureCollection',
      features: routes.map((r) => ({ type: 'Feature', properties: { role: (selectedId ? r.id === selectedId : r.label === 'main') ? 'main' : 'alt', id: r.id }, geometry: { type: 'LineString', coordinates: r.coords } })),
    });
  }

  setProgressLine(coords: LngLat[]) {
    const src = this.map.getSource('progress') as GeoJSONSource | undefined;
    src?.setData(coords.length >= 2
      ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }
      : { type: 'FeatureCollection', features: [] });
  }

  setTrack(coords: LngLat[]) {
    const src = this.map.getSource('track') as GeoJSONSource | undefined;
    src?.setData(coords.length >= 2 ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } } : { type: 'FeatureCollection', features: [] });
  }

  setRouteVisibility(visible: boolean) {
    for (const id of ['route-alt', 'route-glow', 'route-main']) if (this.map.getLayer(id)) this.map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  }

  clearMarkers() { this.markers.forEach((m) => m.remove()); this.markers = []; }

  addMarker(c: LngLat, kind: 'start' | 'end' | 'stop' | 'poi' | 'me', label?: string): maplibregl.Marker {
    const el = document.createElement('div');
    el.className = `sw-marker sw-marker-${kind}`;
    if (label) { el.textContent = label; el.title = label; }
    el.setAttribute('aria-label', label ?? kind);
    const mk = new maplibregl.Marker({ element: el, anchor: kind === 'poi' ? 'bottom' : 'center' }).setLngLat(c).addTo(this.map);
    this.markers.push(mk);
    return mk;
  }

  fitLine(coords: LngLat[], opts: { padding?: number; duration?: number; pitch?: number } = {}) {
    if (!coords.length) return;
    const b = new maplibregl.LngLatBounds(coords[0], coords[0]);
    for (const c of coords) b.extend(c);
    this.map.fitBounds(b, { padding: opts.padding ?? 80, duration: opts.duration ?? 1500, pitch: opts.pitch ?? 50, maxZoom: 15 });
  }

  flyTo(c: LngLat, zoom = 13, opts: { pitch?: number; bearing?: number; duration?: number } = {}) {
    this.map.flyTo({ center: c, zoom, pitch: opts.pitch ?? 60, bearing: opts.bearing ?? this.map.getBearing(), duration: opts.duration ?? 2500, essential: false, curve: 1.6 });
  }

  bounds(): [number, number, number, number] {
    const b = this.map.getBounds();
    return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
  }

  destroy() { this.clearMarkers(); this.clickListeners.clear(); this.map.remove(); }
}
