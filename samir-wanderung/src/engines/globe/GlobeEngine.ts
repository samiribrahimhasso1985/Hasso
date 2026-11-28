/**
 * GlobeEngine — CesiumJS digital Earth.
 * Imagery: Esri World Imagery + Esri boundaries/places reference layer (no key needed, attribution shown).
 * Terrain: Cesium World Terrain when VITE_CESIUM_ION_TOKEN is configured; otherwise a smooth
 * ellipsoid is used on the globe and detailed real terrain is shown after the hand-off to MapLibre.
 */
import type * as CesiumNS from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { CESIUM_ION_TOKEN, PROVIDERS, SATELLITE_TILES } from '../../config/providers';
import type { LngLat } from '../route/geo';

type Cesium = typeof CesiumNS;
let cesiumPromise: Promise<Cesium> | null = null;
export function loadCesium(): Promise<Cesium> {
  cesiumPromise ??= import('cesium');
  return cesiumPromise;
}

export interface GlobePick { coord: LngLat; height: number | null }

export class GlobeEngine {
  private C!: Cesium;
  viewer!: CesiumNS.Viewer;
  private rotateHandler?: () => void;
  private clickHandler?: CesiumNS.ScreenSpaceEventHandler;
  private marker?: CesiumNS.Entity;
  terrainReal = false;

  static async create(container: HTMLElement, opts: { lowPower?: boolean } = {}): Promise<GlobeEngine> {
    const g = new GlobeEngine();
    await g.init(container, opts);
    return g;
  }

  private async init(container: HTMLElement, opts: { lowPower?: boolean }) {
    const C = (this.C = await loadCesium());
    if (CESIUM_ION_TOKEN) C.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
    const imagery = new C.UrlTemplateImageryProvider({ url: SATELLITE_TILES, maximumLevel: 19, credit: new C.Credit(PROVIDERS.esriImagery.attribution) });
    this.viewer = new C.Viewer(container, {
      baseLayer: new C.ImageryLayer(imagery),
      animation: false, timeline: false, geocoder: false, homeButton: false, sceneModePicker: false, baseLayerPicker: false,
      navigationHelpButton: false, fullscreenButton: false, infoBox: false, selectionIndicator: false,
      requestRenderMode: true, maximumRenderTimeChange: Infinity,
      msaaSamples: opts.lowPower ? 1 : 4,
    });
    const v = this.viewer;
    v.imageryLayers.addImageryProvider(new C.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      maximumLevel: 13, credit: new C.Credit('Boundaries & places © Esri'),
    }));
    v.scene.globe.enableLighting = false;
    v.scene.backgroundColor = C.Color.fromCssColorString('#05080a');
    if (v.scene.skyAtmosphere) v.scene.skyAtmosphere.show = true;
    v.scene.globe.showGroundAtmosphere = true;
    v.scene.screenSpaceCameraController.enableCollisionDetection = true;
    if (opts.lowPower) { v.resolutionScale = 0.75; v.scene.fog.enabled = false; }

    if (CESIUM_ION_TOKEN) {
      try {
        v.terrainProvider = await C.createWorldTerrainAsync({ requestWaterMask: true });
        this.terrainReal = true;
      } catch { this.terrainReal = false; }
    }
    v.camera.setView({ destination: C.Cartesian3.fromDegrees(15, 30, 22_000_000) });
  }

  setAutoRotate(on: boolean) {
    const v = this.viewer, C = this.C;
    if (this.rotateHandler) { v.clock.onTick.removeEventListener(this.rotateHandler); this.rotateHandler = undefined; }
    if (!on) return;
    this.rotateHandler = () => {
      const h = v.camera.positionCartographic.height;
      if (h < 3_000_000) return; // only spin when looking at the whole Earth
      v.scene.camera.rotate(C.Cartesian3.UNIT_Z, -0.0009);
      v.scene.requestRender();
    };
    v.clock.shouldAnimate = true;
    v.clock.onTick.addEventListener(this.rotateHandler);
  }

  onPick(fn: (p: GlobePick) => void) {
    const C = this.C, v = this.viewer;
    this.clickHandler?.destroy();
    this.clickHandler = new C.ScreenSpaceEventHandler(v.scene.canvas);
    this.clickHandler.setInputAction((e: { position: CesiumNS.Cartesian2 }) => {
      const ray = v.camera.getPickRay(e.position);
      const cart = ray ? v.scene.globe.pick(ray, v.scene) : undefined;
      if (!cart) return;
      const c = C.Cartographic.fromCartesian(cart);
      fn({ coord: [C.Math.toDegrees(c.longitude), C.Math.toDegrees(c.latitude)], height: this.terrainReal ? c.height : null });
    }, C.ScreenSpaceEventType.LEFT_CLICK);
  }

  setMarker(c: LngLat, label: string) {
    const C = this.C, v = this.viewer;
    if (this.marker) v.entities.remove(this.marker);
    this.marker = v.entities.add({
      position: C.Cartesian3.fromDegrees(c[0], c[1]),
      point: { pixelSize: 12, color: C.Color.fromCssColorString('#14d3c8'), outlineColor: C.Color.WHITE, outlineWidth: 2, heightReference: C.HeightReference.CLAMP_TO_GROUND, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      label: { text: label, font: '600 15px Inter, "Noto Sans Arabic", sans-serif', fillColor: C.Color.WHITE, outlineColor: C.Color.BLACK, outlineWidth: 3, style: C.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new C.Cartesian2(0, -24), disableDepthTestDistance: Number.POSITIVE_INFINITY },
    });
    v.scene.requestRender();
  }

  /**
   * Cinematic flight: two eased stages so the camera arcs over the Earth rather than jumping,
   * then descends with a tilted view. Resolves when the flight completes.
   */
  flyTo(c: LngLat, opts: { finalHeight?: number; reducedMotion?: boolean; bbox?: number[] } = {}): Promise<void> {
    const C = this.C, v = this.viewer;
    const finalHeight = opts.finalHeight ?? 9000;
    if (opts.reducedMotion) {
      v.camera.setView({ destination: C.Cartesian3.fromDegrees(c[0], c[1] - 0.06, finalHeight), orientation: { heading: 0, pitch: C.Math.toRadians(-35), roll: 0 } });
      v.scene.requestRender();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const current = v.camera.positionCartographic.height;
      const cruise = Math.max(1_800_000, Math.min(current, 8_000_000));
      v.camera.flyTo({
        destination: C.Cartesian3.fromDegrees(c[0], c[1], cruise),
        duration: 3.2, easingFunction: C.EasingFunction.CUBIC_IN_OUT,
        complete: () => {
          // Offset south so the target sits in view when pitched down.
          const back = finalHeight / 111_000 / Math.tan(C.Math.toRadians(35));
          v.camera.flyTo({
            destination: C.Cartesian3.fromDegrees(c[0], c[1] - back * 0.8, finalHeight),
            orientation: { heading: 0, pitch: C.Math.toRadians(-35), roll: 0 },
            duration: 3.6, easingFunction: C.EasingFunction.QUADRATIC_IN_OUT, complete: () => resolve(), cancel: () => resolve(),
          });
        },
        cancel: () => resolve(),
      });
    });
  }

  returnToGlobe(reducedMotion = false) {
    const C = this.C;
    if (reducedMotion) { this.viewer.camera.setView({ destination: C.Cartesian3.fromDegrees(15, 30, 22_000_000) }); this.viewer.scene.requestRender(); return; }
    this.viewer.camera.flyTo({ destination: C.Cartesian3.fromDegrees(15, 30, 22_000_000), duration: 3, easingFunction: C.EasingFunction.CUBIC_IN_OUT });
  }

  zoom(factor: number) {
    const h = this.viewer.camera.positionCartographic.height;
    if (factor > 1) this.viewer.camera.zoomIn(h * (1 - 1 / factor)); else this.viewer.camera.zoomOut(h * (1 / factor - 1));
    this.viewer.scene.requestRender();
  }

  heightKm(): number { return this.viewer.camera.positionCartographic.height / 1000; }

  destroy() {
    this.setAutoRotate(false);
    this.clickHandler?.destroy();
    if (!this.viewer.isDestroyed()) this.viewer.destroy();
  }
}
