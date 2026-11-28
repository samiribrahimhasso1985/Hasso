/**
 * EZIDINET WORLD — 3D scene (three.js, no React): a Digital Earth made of light threads above the Sinjar mountains,
 * with every country of the world (borders, tap to select) and the places of Yazidi life joined by connection arcs.
 * Tapping a place or a country turns the Earth and flies the camera to it.
 * Everything is generated in code (no video, no static globe picture).
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLACES, SINJAR, type WorldPlace } from '../../lib/world/places';
import { loadCountries, type CountryIndex, type WorldCountry } from '../../lib/world/countries';
import { SHRINE, STORY } from '../../lib/world/story';

export const PALETTE = {
  navy: 0x061426,
  blue: 0x087cff,
  cyan: 0x35cfff,
  gold: 0xd6b15c,
  glow: 0xeaf7ff,
  shadow: 0x17212b,
};

export interface SceneOptions {
  lowDetail: boolean;
  reduceMotion: boolean;
  onSelect: (place: WorldPlace | null) => void;
  /** A country was chosen on the globe (null: tapped the sea / closed). */
  onCountry?: (country: WorldCountry | null) => void;
  /** A historical photograph in "From here the story began" was tapped. */
  onStory?: (id: string) => void;
  onReady?: () => void;
}

const GLOBE_Y = 0.75;
const R = 2.35;
const deg = Math.PI / 180;

/** lat/lon → point on a sphere of radius r (three.js axes: y up, longitude 0 towards +x). */
function sph(lat: number, lon: number, r: number) {
  const a = lat * deg;
  const b = lon * deg;
  return new THREE.Vector3(r * Math.cos(a) * Math.cos(b), r * Math.sin(a), -r * Math.cos(a) * Math.sin(b));
}

/** Small deterministic random generator, so the scene looks the same for everyone. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Smooth value noise for the mountain ridge. */
function noise2(x: number, y: number) {
  const s = (i: number, j: number) => {
    const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return h - Math.floor(h);
  };
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = s(xi, yi), b = s(xi + 1, yi), c = s(xi, yi + 1), d = s(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x: number, y: number) => noise2(x, y) * 0.55 + noise2(x * 2.1, y * 2.1) * 0.28 + noise2(x * 4.3, y * 4.3) * 0.17;

/** Ridge height: one long east–west mountain (like the Sinjar range), tapering at both ends. */
function ridgeHeight(x: number, z: number) {
  const along = Math.max(0, 1 - Math.pow(Math.abs(x) / 8.5, 2.4));
  const across = Math.exp(-Math.pow(z / 1.45, 2));
  return along * across * (1.55 + 1.1 * fbm(x * 0.45 + 3.1, z * 0.6)) + fbm(x * 0.9, z * 0.9) * 0.18 * along;
}
const MOUNT_BASE = -4.4;

// Shader used by every glowing line set: appears at its "birth" time, with a pulse travelling along "dist".
const GLOW_VERT = /* glsl */ `
  attribute float birth; attribute float dist; attribute vec3 tint;
  uniform float uTime; varying float vAlpha; varying vec3 vColor; varying float vPulse;
  void main(){
    float grow = smoothstep(birth, birth + 0.6, uTime);
    vAlpha = grow;
    vPulse = pow(max(0.0, sin(dist * 1.6 - uTime * 2.2)), 18.0);
    vColor = tint;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const GLOW_FRAG = /* glsl */ `
  uniform float uOpacity; uniform vec3 uPulseColor; varying float vAlpha; varying vec3 vColor; varying float vPulse;
  void main(){
    if (vAlpha <= 0.001) discard;
    vec3 c = mix(vColor, uPulseColor, vPulse * 0.85);
    gl_FragColor = vec4(c, (uOpacity + vPulse * 0.6) * vAlpha);
  }`;

function glowMaterial(opacity: number, pulseColor = PALETTE.glow) {
  return new THREE.ShaderMaterial({
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: opacity }, uPulseColor: { value: new THREE.Color(pulseColor) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Soft round sprite texture for points and mist. */
function dotTexture(soft = 0.5) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(soft, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class WorldScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock = new THREE.Clock();
  private t = 0;
  private raf = 0;
  private running = false;
  private userMoved = false;
  private disposed = false;
  private glowMats: THREE.ShaderMaterial[] = [];
  private root = new THREE.Group();
  private side = 0;
  private tilt = new THREE.Group();
  private spin = new THREE.Group();
  private globe = new THREE.Group();
  private mountain?: THREE.Mesh;
  private mountainLines?: THREE.LineSegments;
  private mist: THREE.Sprite[] = [];
  private orbitDots: { mesh: THREE.Mesh; ring: number; speed: number; phase: number; radius: number; tiltX: number; tiltZ: number }[] = [];
  private arcPulses: { mesh: THREE.Mesh; curve: THREE.QuadraticBezierCurve3; speed: number; phase: number }[] = [];
  private placeTargets: THREE.Mesh[] = [];
  private selected?: THREE.Mesh;
  private core?: THREE.Mesh;
  private countries?: CountryIndex;
  private borders?: THREE.LineSegments;
  private highlight?: THREE.LineSegments;
  private selectedCountry: string | null = null;
  private story = new THREE.Group();
  private storyItems: { mesh: THREE.Mesh; glow: THREE.Mesh; shadow: THREE.Mesh; base: THREE.Vector3; phase: number; id: string }[] = [];
  private storyTextures: THREE.Texture[] = [];
  private shrine?: THREE.Mesh;
  private caption?: THREE.Mesh;
  private targetSpin: number | null = null;
  private targetTilt: number | null = null;
  private targetCam: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;
  private raycaster = new THREE.Raycaster();
  private down = { x: 0, y: 0 };
  private resizeObs: ResizeObserver;
  private dots = dotTexture(0.35);

  constructor(private canvas: HTMLCanvasElement, private opts: SceneOptions) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !opts.lowDetail, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.lowDetail ? 1.25 : 1.75));
    this.renderer.setClearColor(PALETTE.navy, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.fog = new THREE.FogExp2(PALETTE.navy, 0.035);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(0, -1.4, 10.5);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3.1;
    this.controls.maxDistance = 22;
    this.controls.target.set(0, -2.6, 0);
    this.controls.addEventListener('start', () => { this.userMoved = true; this.targetCam = null; });
    // Without the animation loop (reduced motion, paused tab) every interaction redraws once.
    this.controls.addEventListener('change', () => this.kick());
    if (opts.reduceMotion) this.controls.enableDamping = false;

    this.scene.add(this.root);
    this.buildLights();
    this.buildMountains();
    this.buildMist();
    this.buildGlobeShell();
    this.buildPlaces();
    this.buildOrbits();
    this.buildStory();

    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointerup', this.onUp);
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas.parentElement ?? canvas);
    this.resize();
    if (opts.reduceMotion) this.t = 14; // the finished picture, without movement
    Promise.all([this.loadLand(), this.loadCountryLayer()]).then(() => !this.disposed && opts.onReady?.());
  }

  // ── building the scene ───────────────────────────────────────────────────────────────────────────────

  private buildLights() {
    this.scene.add(new THREE.HemisphereLight(0x2a5a8a, 0x05080c, 0.9));
    const moon = new THREE.DirectionalLight(0x9fd8ff, 1.1);
    moon.position.set(-6, 8, 6);
    this.scene.add(moon);
    const gold = new THREE.DirectionalLight(PALETTE.gold, 0.9);
    gold.position.set(7, 1, -4);
    this.scene.add(gold);
    const fromEarth = new THREE.PointLight(PALETTE.cyan, 5, 9, 1.6);
    fromEarth.position.set(0, -1.6, 1.4);
    this.root.add(fromEarth);
  }

  private buildMountains() {
    const segX = this.opts.lowDetail ? 90 : 160;
    const segZ = this.opts.lowDetail ? 26 : 48;
    const geo = new THREE.PlaneGeometry(44, 12, segX + 40, segZ + 10);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, MOUNT_BASE + ridgeHeight(x, z));
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: PALETTE.shadow, roughness: 0.92, metalness: 0.08, flatShading: true, transparent: true, opacity: 0 });
    this.mountain = new THREE.Mesh(geo, mat);
    this.root.add(this.mountain);
    // Contour-like light lines on the ridge (subtle cyan), drawn from the same terrain.
    const wire = new THREE.WireframeGeometry(new THREE.PlaneGeometry(22, 7, Math.round(segX / 3), Math.round(segZ / 3)).rotateX(-Math.PI / 2));
    const wp = wire.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < wp.count; i++) wp.setY(i, MOUNT_BASE + ridgeHeight(wp.getX(i), wp.getZ(i)) + 0.01);
    this.mountainLines = new THREE.LineSegments(wire, new THREE.LineBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.root.add(this.mountainLines);
  }

  private buildMist() {
    const tex = dotTexture(0.15);
    const rand = rng(7);
    const n = this.opts.lowDetail ? 6 : 11;
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x6fa8d6, transparent: true, opacity: 0, depthWrite: false }));
      s.position.set(-8 + rand() * 16, MOUNT_BASE + 0.6 + rand() * 0.8, -1.5 + rand() * 3.5);
      s.scale.set(5 + rand() * 4, 1.6 + rand(), 1);
      s.userData.base = s.position.x;
      s.userData.speed = 0.05 + rand() * 0.08;
      this.mist.push(s);
      this.root.add(s);
    }
  }

  private buildGlobeShell() {
    this.tilt.position.set(0, GLOBE_Y, 0);
    this.tilt.rotation.x = 0.4;
    this.tilt.add(this.spin);
    this.spin.add(this.globe);
    this.root.add(this.tilt);
    this.tilt.scale.setScalar(0.001);
    // Dark core hides the far side so the threads read clearly.
    this.core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 48, 32), new THREE.MeshBasicMaterial({ color: PALETTE.navy, transparent: true, opacity: 0.92 }));
    this.globe.add(this.core);
    // Atmosphere: soft fresnel glow.
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.12, 48, 32),
      new THREE.ShaderMaterial({
        vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform vec3 c; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(c, f * 0.55); }`,
        uniforms: { c: { value: new THREE.Color(PALETTE.blue) } },
        transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
      }),
    );
    this.tilt.add(atmo);
    // Faint latitude/longitude threads.
    const grid: number[] = [];
    for (let lat = -60; lat <= 75; lat += 15) for (let lon = 0; lon < 360; lon += 4) {
      const a = sph(lat, lon, R * 1.002), b = sph(lat, lon + 4, R * 1.002);
      grid.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    for (let lon = 0; lon < 360; lon += 20) for (let lat = -80; lat < 80; lat += 4) {
      const a = sph(lat, lon, R * 1.002), b = sph(lat + 4, lon, R * 1.002);
      grid.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(grid, 3));
    this.globe.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: PALETTE.blue, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })));
  }

  /** Continents as thousands of connected light points (Natural Earth land, see scripts/build-world-data.mjs). */
  private async loadLand() {
    try {
      const res = await fetch(`/world/land-${this.opts.lowDetail ? 'low' : 'high'}.json`);
      const { points, edges } = (await res.json()) as { points: number[]; edges: number[] };
      const count = points.length / 2;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const v = sph(points[i * 2], points[i * 2 + 1], R * 1.004);
        pos.set([v.x, v.y, v.z], i * 3);
      }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.globe.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: this.opts.lowDetail ? 0.06 : 0.05, map: this.dots, color: PALETTE.cyan, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending })));
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      lg.setIndex(edges);
      this.globe.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: PALETTE.blue, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })));
    } catch {
      /* the globe still shows its grid, places and arcs */
    }
  }

  /** Place markers on the globe and arcs from Sinjar to every place, with light travelling along them. */
  private buildPlaces() {
    const sinjar = sph(SINJAR.lat, SINJAR.lon, R * 1.01);
    const arcPts: number[] = [];
    const ab: number[] = [];
    const ad: number[] = [];
    const at: number[] = [];
    const pulseGeo = new THREE.SphereGeometry(0.018, 8, 8);
    PLACES.forEach((p, i) => {
      const v = sph(p.lat, p.lon, R * 1.012);
      const color = p.kind === 'homeland' ? PALETTE.gold : PALETTE.cyan;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(p.id === 'sinjar' ? 0.042 : 0.024, 12, 12), new THREE.MeshBasicMaterial({ color }));
      dot.position.copy(v);
      this.globe.add(dot);
      // Larger invisible target makes tapping easy on phones.
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.copy(v);
      hit.userData.place = p;
      hit.userData.dot = dot;
      this.globe.add(hit);
      this.placeTargets.push(hit);
      if (p.id === 'sinjar' || v.distanceTo(sinjar) < 0.12) return;
      const mid = sinjar.clone().add(v).multiplyScalar(0.5);
      const lift = 1 + Math.min(0.55, sinjar.distanceTo(v) * 0.17);
      const ctrl = mid.normalize().multiplyScalar(R * lift);
      const curve = new THREE.QuadraticBezierCurve3(sinjar, ctrl, v);
      const pts = curve.getPoints(40);
      let len = 0;
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1], b = pts[k];
        arcPts.push(a.x, a.y, a.z, b.x, b.y, b.z);
        ab.push(4.2 + i * 0.04, 4.2 + i * 0.04);
        ad.push(len, (len += a.distanceTo(b)));
        const c = new THREE.Color(color);
        at.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
      const pulse = new THREE.Mesh(pulseGeo, new THREE.MeshBasicMaterial({ color: PALETTE.glow, transparent: true }));
      this.globe.add(pulse);
      this.arcPulses.push({ mesh: pulse, curve, speed: 0.12 + (i % 5) * 0.025, phase: i * 0.37 });
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arcPts, 3));
    g.setAttribute('birth', new THREE.Float32BufferAttribute(ab, 1));
    g.setAttribute('dist', new THREE.Float32BufferAttribute(ad, 1));
    g.setAttribute('tint', new THREE.Float32BufferAttribute(at, 3));
    const m = glowMaterial(0.45, PALETTE.glow);
    this.glowMats.push(m);
    this.globe.add(new THREE.LineSegments(g, m));
  }

  /** Thin rings circling the Earth with small lights moving on them. */
  private buildOrbits() {
    const rings = [
      { r: R * 1.32, x: 1.15, z: 0.25, color: PALETTE.cyan, speed: 0.35 },
      { r: R * 1.45, x: 1.75, z: -0.5, color: PALETTE.gold, speed: -0.22 },
      { r: R * 1.22, x: 0.5, z: 0.9, color: PALETTE.blue, speed: 0.28 },
    ];
    rings.forEach((o, idx) => {
      const curve = new THREE.EllipseCurve(0, 0, o.r, o.r, 0, Math.PI * 2);
      const pts = curve.getPoints(160).map((p) => new THREE.Vector3(p.x, 0, p.y));
      const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: o.color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
      line.rotation.set(o.x, 0, o.z);
      line.position.y = GLOBE_Y;
      line.userData.fade = [4.8 + idx * 0.4, 6.4];
      line.userData.maxOpacity = 0.22;
      line.scale.setScalar(0.001);
      this.root.add(line);
      for (let k = 0; k < 2; k++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), new THREE.MeshBasicMaterial({ color: o.color }));
        this.root.add(m);
        this.orbitDots.push({ mesh: m, ring: idx, speed: o.speed, phase: k * Math.PI, radius: o.r, tiltX: o.x, tiltZ: o.z });
      }
      line.userData.ring = idx;
    });
  }

  /**
   * "From here the story began": historical portraits (backgrounds removed) standing in a wide arc in front of
   * the Sinjar ridge, each with a soft golden halo and a shadow, turning gently towards the viewer; the shrine
   * photograph as a faded archival plate behind them; a caption below.
   */
  private buildStory() {
    this.root.add(this.story);
    const loader = new THREE.TextureLoader();
    const load = (url: string) =>
      new Promise<THREE.Texture>((res, rej) => loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; this.storyTextures.push(t); res(t); }, undefined, rej));
    const n = STORY.length;
    const shadowTex = dotTexture(0.2);
    this.storyTextures.push(shadowTex);
    STORY.forEach((p, i) => {
      const u = n === 1 ? 0 : i / (n - 1) - 0.5; // -0.5 … 0.5
      const base = new THREE.Vector3(u * 11.6, -3.75, 2.2 + Math.cos(u * Math.PI) * 1.3);
      Promise.all([load(p.cutout!), load(p.cutout!.replace('.webp', '-glow.webp'))])
        .then(([tex, glowTex]) => {
          if (this.disposed) return;
          const img = tex.image as HTMLImageElement;
          const w = (p.height * img.width) / img.height;
          const geo = new THREE.PlaneGeometry(w, p.height);
          geo.translate(0, p.height / 2, 0); // stand on the ground
          const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.04, opacity: 0, toneMapped: false }));
          mesh.userData.storyId = p.id;
          // Halo: the same silhouette, blurred, in soft gold, slightly behind.
          const gw = w * 1.36, gh = p.height * 1.26;
          const glowGeo = new THREE.PlaneGeometry(gw, gh);
          glowGeo.translate(0, p.height / 2, -0.05);
          const glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ map: glowTex, color: PALETTE.gold, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
          const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.1, 0.34), new THREE.MeshBasicMaterial({ map: shadowTex, color: 0x000000, transparent: true, opacity: 0, depthWrite: false }));
          shadow.rotation.x = -Math.PI / 2;
          const holder = new THREE.Group();
          holder.add(glow, mesh);
          holder.position.copy(base);
          shadow.position.set(base.x, base.y + 0.01, base.z);
          this.story.add(holder, shadow);
          this.storyItems.push({ mesh, glow, shadow, base, phase: i * 0.9, id: p.id });
          this.kick();
        })
        .catch(() => undefined);
    });
    load(SHRINE.plate)
      .then((tex) => {
        if (this.disposed) return;
        const img = tex.image as HTMLImageElement;
        const h = 2.3;
        this.shrine = new THREE.Mesh(new THREE.PlaneGeometry((h * img.width) / img.height, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
        this.shrine.position.set(0, -2.95, 1.15);
        this.shrine.userData.storyId = SHRINE.id;
        this.story.add(this.shrine);
        this.kick();
      })
      .catch(() => undefined);
  }

  /** Caption under the portraits, drawn into a texture so it stays part of the 3D scene (any language). */
  setStoryCaption(text: string, rtl: boolean) {
    const c = document.createElement('canvas');
    c.width = 2048;
    c.height = 200;
    const g = c.getContext('2d')!;
    const draw = () => {
      g.clearRect(0, 0, c.width, c.height);
      g.direction = rtl ? 'rtl' : 'ltr';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `600 ${rtl ? 92 : 78}px ${rtl ? "'IBM Plex Sans Arabic'" : 'Inter'}, system-ui, sans-serif`;
      if (!rtl) (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '14px';
      g.shadowColor = 'rgba(214,177,92,0.65)';
      g.shadowBlur = 28;
      g.fillStyle = '#d6b15c';
      g.fillText(text, c.width / 2, c.height / 2 + 4);
      const grd = g.createLinearGradient(0, 0, c.width, 0);
      grd.addColorStop(0, 'rgba(214,177,92,0)');
      grd.addColorStop(0.5, 'rgba(214,177,92,0.8)');
      grd.addColorStop(1, 'rgba(214,177,92,0)');
      g.shadowBlur = 0;
      g.fillStyle = grd;
      g.fillRect(c.width * 0.2, c.height - 18, c.width * 0.6, 3);
      if (this.caption) (this.caption.material as THREE.MeshBasicMaterial).map!.needsUpdate = true;
      this.kick();
    };
    if (this.caption) {
      const m = this.caption.material as THREE.MeshBasicMaterial;
      m.map?.dispose();
      m.map = new THREE.CanvasTexture(c);
      m.map.colorSpace = THREE.SRGBColorSpace;
      m.needsUpdate = true;
    } else {
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      this.caption = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 0.74), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
      this.caption.position.set(0, -4.15, 3.75);
      this.story.add(this.caption);
    }
    draw();
    // Web fonts may still be loading: draw again once they are ready.
    document.fonts?.ready.then(() => !this.disposed && draw());
  }

  // ── interaction ──────────────────────────────────────────────────────────────────────────────────────

  private onDown = (e: PointerEvent) => { this.down = { x: e.clientX, y: e.clientY }; };

  private onUp = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 6) return; // a drag, not a tap
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    // 0. A historical photograph of the story.
    const storyHits = this.raycaster.intersectObjects([...this.storyItems.map((s) => s.mesh), ...(this.shrine ? [this.shrine] : [])], false);
    const sh = storyHits.find((h) => ((h.object as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity > 0.3);
    if (sh) return this.opts.onStory?.(sh.object.userData.storyId as string);
    // 1. A place light (cities and regions) wins over the country under it.
    for (const h of this.raycaster.intersectObjects(this.placeTargets, false)) {
      if (h.object.userData.place && this.isFacing(h.object as THREE.Mesh)) return this.select((h.object.userData.place as WorldPlace).id);
    }
    // 2. Otherwise the country at the tapped point of the Earth.
    const hit = this.core ? this.raycaster.intersectObject(this.core, false)[0] : undefined;
    if (hit && this.countries) {
      const { lat, lon } = this.latLonOf(hit.point);
      const c = this.countries.at(lat, lon);
      if (c) return this.selectCountry(c.code);
    }
    this.clearSelection();
  };

  /** World point on the Earth → latitude/longitude (inverse of sph, through the globe's turning). */
  private latLonOf(world: THREE.Vector3) {
    const v = this.globe.worldToLocal(world.clone()).normalize();
    return { lat: Math.asin(THREE.MathUtils.clamp(v.y, -1, 1)) / deg, lon: Math.atan2(-v.z, v.x) / deg };
  }

  /** Only places on the visible side of the globe can be tapped. */
  private isFacing(m: THREE.Mesh) {
    const p = m.getWorldPosition(new THREE.Vector3());
    const centre = this.tilt.getWorldPosition(new THREE.Vector3());
    return p.clone().sub(centre).dot(this.camera.position.clone().sub(p)) > 0;
  }

  private unmarkPlace() {
    if (this.selected) (this.selected.material as THREE.MeshBasicMaterial).color.setHex(this.selected.userData.baseColor);
    this.selected = undefined;
  }

  /** Removes any highlight and lets the Earth turn again. */
  clearSelection() {
    this.unmarkPlace();
    this.setHighlight(null);
    this.kick();
    this.opts.onSelect(null);
    this.opts.onCountry?.(null);
  }

  /** Highlights a place, turns the Earth so it faces the viewer and flies the camera close to it. */
  select(id: string | null, fly = true) {
    this.unmarkPlace();
    const target = this.placeTargets.find((m) => (m.userData.place as WorldPlace).id === id);
    if (!target) return this.clearSelection();
    const place = target.userData.place as WorldPlace;
    const dot = target.userData.dot as THREE.Mesh;
    dot.userData.baseColor = (dot.material as THREE.MeshBasicMaterial).color.getHex();
    (dot.material as THREE.MeshBasicMaterial).color.setHex(PALETTE.glow);
    this.selected = dot;
    this.setHighlight(place.country);
    this.focus(place.lat, place.lon, fly ? R + 2.3 : null);
    this.opts.onSelect(place);
  }

  /** Highlights a country's outline, turns the Earth to it and flies the camera there (distance by its size). */
  selectCountry(code: string, fly = true) {
    const c = this.countries?.byCode.get(code);
    if (!c) return;
    this.unmarkPlace();
    this.setHighlight(code);
    let span = 4;
    for (const ring of c.rings) {
      let la0 = 90, la1 = -90, lo0 = 180, lo1 = -180;
      for (let i = 0; i < ring.length; i += 2) {
        la0 = Math.min(la0, ring[i]); la1 = Math.max(la1, ring[i]);
        lo0 = Math.min(lo0, ring[i + 1]); lo1 = Math.max(lo1, ring[i + 1]);
      }
      // Only parts near the focus point count (France without French Guiana, USA without Alaska).
      if (Math.abs((la0 + la1) / 2 - c.lat) < 25 && Math.abs((lo0 + lo1) / 2 - c.lon) < 40) span = Math.max(span, la1 - la0, (lo1 - lo0) * Math.cos(c.lat * deg));
    }
    this.focus(c.lat, c.lon, fly ? THREE.MathUtils.clamp(R + 1.6 + span * 0.06, R + 2.4, R + 6) : null);
    this.opts.onSelect(null);
    this.opts.onCountry?.(c);
  }

  /** Turns the Earth so lat/lon faces the camera; with a distance, the camera flies straight towards it. */
  private focus(lat: number, lon: number, distance: number | null) {
    this.targetSpin = this.nearestAngle(this.spin.rotation.y, -lon * deg - Math.PI / 2);
    this.targetTilt = lat * deg;
    if (distance !== null) {
      this.userMoved = true;
      const cx = this.root.position.x, cy = this.root.position.y + GLOBE_Y;
      // Portrait phones: the info card covers the lower half, so the Earth is shown higher up.
      const lift = (this.camera.aspect || 1) < 0.8 ? (distance - R) * 0.19 : 0;
      this.targetCam = { pos: new THREE.Vector3(cx, cy - lift, distance), look: new THREE.Vector3(cx, cy - lift, 0) };
      if (this.opts.reduceMotion) this.jumpCamera();
    }
    if (this.opts.reduceMotion) {
      this.spin.rotation.y = this.targetSpin;
      this.tilt.rotation.x = this.targetTilt;
      this.targetSpin = this.targetTilt = null;
    }
    this.kick();
  }

  /** Gold outline around one country (null removes it). */
  private setHighlight(code: string | null) {
    this.selectedCountry = code;
    if (this.highlight) {
      this.globe.remove(this.highlight);
      this.highlight.geometry.dispose();
      this.highlight = undefined;
    }
    const c = code ? this.countries?.byCode.get(code) : undefined;
    if (!c) return;
    this.highlight = new THREE.LineSegments(this.ringGeometry(c.rings, R * 1.007), new THREE.LineBasicMaterial({ color: PALETTE.gold, transparent: true, opacity: 0.95, depthWrite: false }));
    this.highlight.renderOrder = 3;
    this.globe.add(this.highlight);
  }

  private ringGeometry(rings: number[][], radius: number) {
    const pts: number[] = [];
    for (const ring of rings) {
      for (let i = 2; i < ring.length; i += 2) {
        if (Math.abs(ring[i + 1] - ring[i - 1]) > 180) continue; // do not draw across the date line
        const a = sph(ring[i - 2], ring[i - 1], radius), b = sph(ring[i], ring[i + 1], radius);
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }

  /** Every country of the world: thin borders on the Earth, and the lookup used when the Earth is tapped. */
  private async loadCountryLayer() {
    try {
      this.countries = await loadCountries();
      if (this.disposed) return;
      this.borders = new THREE.LineSegments(
        this.ringGeometry(this.countries.countries.map((c) => c.rings).flat(), R * 1.005),
        new THREE.LineBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      this.globe.add(this.borders);
      if (this.selectedCountry) this.setHighlight(this.selectedCountry);
      this.kick();
    } catch {
      /* without the country file the Earth still works with its places */
    }
  }

  /** Camera presets: the whole scene, the Earth, or the Sinjar mountains. */
  flyTo(where: 'overview' | 'globe' | 'sinjar') {
    this.userMoved = true;
    const presets = {
      overview: { pos: new THREE.Vector3(0, -0.1, this.fitDistance()), look: new THREE.Vector3(0, -1.45, 0) },
      globe: { pos: new THREE.Vector3(0, GLOBE_Y + 0.3, 7.4), look: new THREE.Vector3(0, GLOBE_Y, 0) },
      sinjar: { pos: new THREE.Vector3(0, -2.2, this.storyDistance()), look: new THREE.Vector3(0, -2.9, 1.8) },
    };
    // The overview keeps the scene beside the title; the other views centre their subject.
    const { x: sx, y: sy } = where === 'overview' ? { x: 0, y: 0 } : this.root.position;
    presets[where].pos.x += sx;
    presets[where].look.x += sx;
    presets[where].pos.y += sy;
    presets[where].look.y += sy;
    // Portrait phones: the title fills the top, so the photographs are shown lower on the screen.
    if (where === 'sinjar' && (this.camera.aspect || 1) < 0.8) {
      presets.sinjar.pos.y += 1.5;
      presets.sinjar.look.y += 1.5;
    }
    this.targetCam = presets[where];
    if (where === 'sinjar') this.focus(SINJAR.lat, SINJAR.lon, null);
    if (this.opts.reduceMotion) this.jumpCamera();
    this.kick();
  }

  private kicking = false;
  /** Redraw once when the loop is not running. */
  private kick() {
    if (this.running || this.kicking || this.disposed) return;
    this.kicking = true;
    this.frame(0);
    this.kicking = false;
  }

  private jumpCamera() {
    if (!this.targetCam) return;
    this.camera.position.copy(this.targetCam.pos);
    this.controls.target.copy(this.targetCam.look);
    this.targetCam = null;
  }

  private nearestAngle(from: number, to: number) {
    const tau = Math.PI * 2;
    return from + ((((to - from) % tau) + tau * 1.5) % tau) - tau / 2;
  }

  /** Distance at which the whole row of portraits fits the screen. */
  private storyDistance() {
    const aspect = this.camera.aspect || 1;
    return aspect < 0.6 ? 16 : aspect < 1.2 ? 15 : 13.5;
  }

  private fitDistance() {
    const aspect = this.camera.aspect || 1;
    return aspect < 0.6 ? 19.5 : aspect < 0.8 ? 16.5 : aspect < 1.2 ? 14 : 12.5;
  }

  /** On wide screens the scene moves away from the side where the title is (RTL: title on the right). */
  setSide(dir: 'rtl' | 'ltr') {
    this.side = dir === 'rtl' ? -1 : 1;
    this.applySide();
  }

  private applySide() {
    const aspect = this.camera.aspect || 1;
    this.root.position.x = aspect > 1.25 ? this.side * 2.3 : 0;
    // Portrait phones: the title takes the top of the screen, so the scene sits lower.
    this.root.position.y = aspect < 0.8 ? -2.4 : 0;
  }

  /** For tests: where a place appears on screen (CSS px), and whether it faces the viewer. */
  screenPosition(id: string) {
    const target = this.placeTargets.find((m) => (m.userData.place as WorldPlace).id === id);
    if (!target) return null;
    const p = target.getWorldPosition(new THREE.Vector3()).project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height, facing: this.isFacing(target) };
  }

  /** For tests: where a story photograph appears on screen (CSS px), once loaded. */
  storyScreenPosition(id: string) {
    const it = this.storyItems.find((s) => s.id === id);
    if (!it) return null;
    const box = new THREE.Box3().setFromObject(it.mesh);
    const p = box.getCenter(new THREE.Vector3()).project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height, loaded: this.storyItems.length };
  }

  /** For tests: where a latitude/longitude on the Earth appears on screen (CSS px). */
  screenPositionOf(lat: number, lon: number) {
    const p = this.globe.localToWorld(sph(lat, lon, R)).project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height };
  }

  /** For tests: what the last frame drew. */
  stats() {
    const r = this.renderer.info.render;
    return { calls: r.calls, lines: r.lines, points: r.points, triangles: r.triangles };
  }

  // ── loop ─────────────────────────────────────────────────────────────────────────────────────────────

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.clock.getDelta();
    const loop = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      this.frame(Math.min(this.clock.getDelta(), 0.05));
    };
    loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Renders a single frame (used when motion is reduced and the loop is paused). */
  renderOnce() {
    this.frame(0);
  }

  private frame(dt: number) {
    const still = this.opts.reduceMotion;
    if (!still) this.t += dt;
    const t = this.t;
    const ease = (a: number, b: number) => THREE.MathUtils.smoothstep(t, a, b);

    for (const m of this.glowMats) m.uniforms.uTime.value = still ? 14 : t;
    if (this.mountain) (this.mountain.material as THREE.MeshStandardMaterial).opacity = ease(0, 2);
    if (this.mountainLines) (this.mountainLines.material as THREE.LineBasicMaterial).opacity = 0.09 * ease(0.5, 2.5);
    this.mist.forEach((s, i) => {
      (s.material as THREE.SpriteMaterial).opacity = 0.11 * ease(0.8, 3);
      if (!still) s.position.x = s.userData.base + Math.sin(t * s.userData.speed + i) * 0.8;
    });
    this.root.traverse((o) => {
      if (!o.userData.fade) return;
      const [a, b] = o.userData.fade as [number, number];
      const k = ease(a, b);
      const mat = (o as THREE.Points).material as THREE.PointsMaterial;
      if ('opacity' in mat) mat.opacity = (o.userData.maxOpacity ?? 0.95) * k;
      if (o.userData.ring !== undefined) o.scale.setScalar(Math.max(0.001, k));
    });

    // Earth: appears above the mountains, then turns slowly (or towards a chosen place).
    this.tilt.scale.setScalar(Math.max(0.001, 0.55 + 0.45 * ease(1.4, 3.8)) * (ease(1.4, 2.2) > 0 ? 1 : 0.001));
    if (this.targetSpin !== null) {
      this.spin.rotation.y += (this.targetSpin - this.spin.rotation.y) * Math.min(1, dt * 2.5 || 1);
      if (Math.abs(this.targetSpin - this.spin.rotation.y) < 0.002) this.targetSpin = null;
    } else if (!still) {
      this.spin.rotation.y += dt * 0.07 * ease(3, 5) * (this.selectedCountry || this.selected ? 0 : 1);
    }
    if (this.targetTilt !== null) {
      this.tilt.rotation.x += (this.targetTilt - this.tilt.rotation.x) * Math.min(1, dt * 2.5 || 1);
    }

    // The story: fades in during the opening shot; portraits float slightly and turn towards the viewer.
    const sk = ease(0.3, 2.4);
    const camLocal = this.root.worldToLocal(this.camera.position.clone());
    for (const it of this.storyItems) {
      const holder = it.mesh.parent!;
      if (!still) holder.position.y = it.base.y + Math.sin(t * 0.7 + it.phase) * 0.035;
      holder.rotation.y = Math.atan2(camLocal.x - it.base.x, camLocal.z - it.base.z) * 0.9;
      (it.mesh.material as THREE.MeshBasicMaterial).opacity = sk;
      (it.glow.material as THREE.MeshBasicMaterial).opacity = sk * (0.32 + (still ? 0 : Math.sin(t * 1.1 + it.phase) * 0.08));
      (it.shadow.material as THREE.MeshBasicMaterial).opacity = sk * 0.55;
    }
    if (this.shrine) {
      (this.shrine.material as THREE.MeshBasicMaterial).opacity = 0.42 * ease(0.8, 3.2);
      this.shrine.rotation.y = Math.atan2(camLocal.x - this.shrine.position.x, camLocal.z - this.shrine.position.z) * 0.6;
    }
    if (this.caption) {
      (this.caption.material as THREE.MeshBasicMaterial).opacity = ease(1.2, 3.2);
      this.caption.rotation.x = Math.atan2(camLocal.y - this.caption.position.y, camLocal.z - this.caption.position.z) * -0.5;
    }

    // Moving lights.
    const pulseK = ease(4.8, 6.4);
    for (const p of this.arcPulses) {
      const u = (t * p.speed + p.phase) % 1;
      p.mesh.position.copy(p.curve.getPoint(u));
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = pulseK * Math.sin(Math.PI * u);
    }
    for (const d of this.orbitDots) {
      const a = t * d.speed + d.phase;
      const v = new THREE.Vector3(Math.cos(a) * d.radius, 0, Math.sin(a) * d.radius).applyEuler(new THREE.Euler(d.tiltX, 0, d.tiltZ));
      d.mesh.position.set(v.x, v.y + GLOBE_Y, v.z); // inside root
      d.mesh.visible = pulseK > 0.05;
    }

    // Camera: opening move from the mountains up to the whole scene, unless the visitor took over.
    if (this.targetCam) {
      const k = Math.min(1, dt * 2.2 || 1);
      this.camera.position.lerp(this.targetCam.pos, k);
      this.controls.target.lerp(this.targetCam.look, k);
      if (this.camera.position.distanceTo(this.targetCam.pos) < 0.02) this.targetCam = null;
    } else if (!this.userMoved) {
      const k = ease(0.5, 5.5);
      const end = new THREE.Vector3(0, -0.1, this.fitDistance());
      this.camera.position.lerpVectors(new THREE.Vector3(0, -1.4, 10.5), end, k);
      this.controls.target.lerpVectors(new THREE.Vector3(0, -2.6, 0), new THREE.Vector3(0, -1.45, 0), k);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private resize() {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.applySide();
    if (!this.running) this.renderOnce();
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.resizeObs.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.controls.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      mats.forEach((x) => x.dispose());
    });
    this.dots.dispose();
    this.storyTextures.forEach((t) => t.dispose());
    (this.caption?.material as THREE.MeshBasicMaterial | undefined)?.map?.dispose();
    this.renderer.dispose();
  }
}

/** True when the browser can draw WebGL. */
export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
