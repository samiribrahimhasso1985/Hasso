/**
 * EZIDINET WORLD — 3D scene (three.js, no React): Sinjar mountains, a procedural Tree of Life growing from them,
 * and a Digital Earth made of light threads above, joined by branches and connection arcs.
 * Everything is generated in code (no video, no static globe picture).
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLACES, SINJAR, type WorldPlace } from '../../lib/world/places';

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
  onReady?: () => void;
}

const GLOBE_Y = 4.6;
const R = 2.35;
const deg = Math.PI / 180;

/** lat/lon → point on a sphere of radius r (three.js axes: y up, longitude 0 towards +x). */
function sph(lat: number, lon: number, r: number) {
  const a = lat * deg;
  const b = lon * deg;
  return new THREE.Vector3(r * Math.cos(a) * Math.cos(b), r * Math.sin(a), -r * Math.cos(a) * Math.sin(b));
}

/** Small deterministic random generator, so the tree looks the same for everyone. */
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

type Seg = { a: THREE.Vector3; b: THREE.Vector3; birth: number; dist0: number; dist1: number; depth: number };

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
  private leafPoints?: THREE.Points;
  private leafPlaces: WorldPlace[] = [];
  private selected?: THREE.Mesh;
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
    this.controls.minDistance = 5.5;
    this.controls.maxDistance = 26;
    this.controls.target.set(0, -2.6, 0);
    this.controls.addEventListener('start', () => { this.userMoved = true; this.targetCam = null; });
    // Without the animation loop (reduced motion, paused tab) every interaction redraws once.
    this.controls.addEventListener('change', () => this.kick());
    if (opts.reduceMotion) this.controls.enableDamping = false;

    this.scene.add(this.root);
    this.buildLights();
    this.buildMountains();
    this.buildMist();
    this.buildTree();
    this.buildGlobeShell();
    this.buildPlaces();
    this.buildOrbits();

    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointerup', this.onUp);
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas.parentElement ?? canvas);
    this.resize();
    if (opts.reduceMotion) this.t = 14; // the finished picture, without movement
    this.loadLand().then(() => !this.disposed && opts.onReady?.());
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
    const fromTree = new THREE.PointLight(PALETTE.cyan, 6, 9, 1.6);
    fromTree.position.set(0, -2.2, 1.2);
    this.root.add(fromTree);
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

  /** Recursive branching from the ridge top; roots go down into the mountain. */
  private buildTree() {
    const rand = rng(2026);
    const top = new THREE.Vector3(0, MOUNT_BASE + ridgeHeight(0, 0) - 0.05, 0.1);
    const segs: Seg[] = [];
    const tips: THREE.Vector3[] = [];
    const maxDepth = this.opts.lowDetail ? 6 : 7;
    const globeBottom = new THREE.Vector3(0, GLOBE_Y - R, 0);

    const grow = (start: THREE.Vector3, dir: THREE.Vector3, len: number, depth: number, dist: number, birth: number, up: boolean) => {
      const end = start.clone().addScaledVector(dir, len);
      segs.push({ a: start, b: end, birth, dist0: dist, dist1: dist + len, depth });
      if (depth >= (up ? maxDepth : maxDepth - 2)) { if (up) tips.push(end); return; }
      const kids = 2 + (rand() < (up ? 0.45 : 0.3) ? 1 : 0);
      for (let k = 0; k < kids; k++) {
        const d = dir.clone();
        const spread = up ? 0.62 : 0.75;
        d.x += (rand() - 0.5) * spread * 2;
        d.z += (rand() - 0.5) * spread * 1.2;
        d.y += (rand() - 0.5) * spread * 0.8;
        if (up) d.y += 0.12; // crowns lean gently upwards, towards the Earth
        else d.y = -Math.abs(d.y) - 0.25; // roots spread down and out
        d.normalize();
        grow(end, d, len * (0.74 + rand() * 0.1), depth + 1, dist + len, birth + (up ? 0.5 : 0.38), up);
      }
    };
    // Trunk, then 5 main limbs in a wide crown; roots start at the same point.
    const trunkTop = top.clone().add(new THREE.Vector3(0, 1.35, 0));
    segs.push({ a: top, b: top.clone().add(new THREE.Vector3(0.05, 0.7, 0)), birth: 3.3, dist0: 0, dist1: 0.7, depth: 0 });
    segs.push({ a: top.clone().add(new THREE.Vector3(0.05, 0.7, 0)), b: trunkTop, birth: 3.6, dist0: 0.7, dist1: 1.35, depth: 0 });
    const limbs = 5;
    for (let i = 0; i < limbs; i++) {
      const ang = (i / (limbs - 1)) * Math.PI * 0.84 + Math.PI * 0.08; // fan from left to right
      const dir = new THREE.Vector3(Math.cos(ang) * 1.05, 0.62 + Math.sin(ang) * 0.45, (rand() - 0.5) * 0.5).normalize();
      grow(trunkTop, dir, 1.05, 1, 1.35, 4.0, true);
    }
    for (let i = 0; i < 4; i++) {
      const ang = (i / 3) * Math.PI * 0.8 + Math.PI * 0.1;
      grow(top, new THREE.Vector3(Math.cos(ang), -0.7, (rand() - 0.5) * 0.6).normalize(), 0.8, 1, 0, 1.5, false);
    }

    // Lines (trunk, crown, roots) with growth + flowing light.
    const n = segs.length;
    const position = new Float32Array(n * 6);
    const birth = new Float32Array(n * 2);
    const dist = new Float32Array(n * 2);
    const tint = new Float32Array(n * 6);
    const cyan = new THREE.Color(PALETTE.cyan), gold = new THREE.Color(PALETTE.gold), blue = new THREE.Color(PALETTE.blue);
    segs.forEach((s, i) => {
      position.set([s.a.x, s.a.y, s.a.z, s.b.x, s.b.y, s.b.z], i * 6);
      birth.set([s.birth, s.birth + 0.25], i * 2);
      dist.set([s.dist0, s.dist1], i * 2);
      const c = s.depth <= 1 ? gold : s.b.y < top.y ? blue : cyan.clone().lerp(gold, Math.min(1, s.depth / 12));
      tint.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geo.setAttribute('birth', new THREE.BufferAttribute(birth, 1));
    geo.setAttribute('dist', new THREE.BufferAttribute(dist, 1));
    geo.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
    const mat = glowMaterial(0.85, PALETTE.glow);
    this.glowMats.push(mat);
    this.root.add(new THREE.LineSegments(geo, mat));

    // Roots glow faintly through the rock (drawn again without depth test, softer).
    const rootIdx: number[] = [];
    segs.forEach((sg, i) => { if (sg.b.y < top.y - 0.01) rootIdx.push(i * 2, i * 2 + 1); });
    const rootsGeo = geo.clone();
    rootsGeo.setIndex(rootIdx);
    const rootMat = glowMaterial(0.32, PALETTE.gold);
    rootMat.depthTest = false;
    this.glowMats.push(rootMat);
    const rootsLines = new THREE.LineSegments(rootsGeo, rootMat);
    rootsLines.renderOrder = 2;
    this.root.add(rootsLines);

    // Leaves: small points at every tip; some of them carry the stories of places (interactive, gold).
    const leafGeo = new THREE.BufferGeometry();
    const lp = new Float32Array(tips.length * 3);
    tips.forEach((p, i) => lp.set([p.x, p.y, p.z], i * 3));
    leafGeo.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    const leaves = new THREE.Points(leafGeo, new THREE.PointsMaterial({ size: 0.09, map: this.dots, color: PALETTE.cyan, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.root.add(leaves);
    leaves.userData.fade = [7.2, 8.6];

    // Story leaves: the highest tips, spread out, one per place.
    const sorted = [...tips].sort((a, b) => b.y - a.y);
    const step = Math.max(1, Math.floor(sorted.length / PLACES.length));
    const chosen = PLACES.map((_, i) => sorted[Math.min(sorted.length - 1, i * step)]);
    this.leafPlaces = PLACES;
    const sg = new THREE.BufferGeometry();
    const sp = new Float32Array(chosen.length * 3);
    chosen.forEach((p, i) => sp.set([p.x, p.y, p.z], i * 3));
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.leafPoints = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.2, map: this.dots, color: PALETTE.gold, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.leafPoints.userData.fade = [7.8, 9.2];
    this.root.add(this.leafPoints);

    // Branch-to-Earth links: from the highest tips to a ring under the globe (fixed while the globe spins).
    const links: number[] = [];
    const lb: number[] = [];
    const ld: number[] = [];
    const lt: number[] = [];
    sorted.slice(0, this.opts.lowDetail ? 10 : 18).forEach((p, i) => {
      const ang = (i / 18) * Math.PI * 2;
      const q = new THREE.Vector3(Math.cos(ang) * R * 0.45, GLOBE_Y - R * 0.9, Math.sin(ang) * R * 0.45);
      links.push(p.x, p.y, p.z, q.x, q.y, q.z);
      lb.push(8.4, 8.9);
      ld.push(0, p.distanceTo(q) + 8);
      lt.push(0.21, 0.81, 1, 0.84, 0.69, 0.36);
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(links, 3));
    lg.setAttribute('birth', new THREE.Float32BufferAttribute(lb, 1));
    lg.setAttribute('dist', new THREE.Float32BufferAttribute(ld, 1));
    lg.setAttribute('tint', new THREE.Float32BufferAttribute(lt, 3));
    const lm = glowMaterial(0.35, PALETTE.gold);
    this.glowMats.push(lm);
    this.root.add(new THREE.LineSegments(lg, lm));
  }

  private buildGlobeShell() {
    this.tilt.position.set(0, GLOBE_Y, 0);
    this.tilt.rotation.x = 0.4;
    this.tilt.add(this.spin);
    this.spin.add(this.globe);
    this.root.add(this.tilt);
    this.tilt.scale.setScalar(0.001);
    // Dark core hides the far side so the threads read clearly.
    this.globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 48, 32), new THREE.MeshBasicMaterial({ color: PALETTE.navy, transparent: true, opacity: 0.92 })));
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
    const pulseGeo = new THREE.SphereGeometry(0.028, 8, 8);
    PLACES.forEach((p, i) => {
      const v = sph(p.lat, p.lon, R * 1.012);
      const color = p.kind === 'homeland' ? PALETTE.gold : PALETTE.cyan;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(p.id === 'sinjar' ? 0.055 : 0.034, 12, 12), new THREE.MeshBasicMaterial({ color }));
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
        ab.push(9 + i * 0.05, 9 + i * 0.05);
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
      line.userData.fade = [9.5 + idx * 0.4, 11];
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

  // ── interaction ──────────────────────────────────────────────────────────────────────────────────────

  private onDown = (e: PointerEvent) => { this.down = { x: e.clientX, y: e.clientY }; };

  private onUp = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 6) return; // a drag, not a tap
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    this.raycaster.params.Points = { threshold: 0.18 };
    const hits = this.raycaster.intersectObjects([...this.placeTargets, ...(this.leafPoints ? [this.leafPoints] : [])], false);
    for (const h of hits) {
      if (h.object === this.leafPoints && h.index !== undefined) return this.select(this.leafPlaces[h.index]?.id ?? null, false);
      if (h.object.userData.place && this.isFacing(h.object as THREE.Mesh)) return this.select((h.object.userData.place as WorldPlace).id, false);
    }
    this.select(null, false);
  };

  /** Only places on the visible side of the globe can be tapped. */
  private isFacing(m: THREE.Mesh) {
    const p = m.getWorldPosition(new THREE.Vector3());
    const centre = this.tilt.getWorldPosition(new THREE.Vector3());
    return p.clone().sub(centre).dot(this.camera.position.clone().sub(p)) > 0;
  }

  /** Highlights a place, turns the globe so it faces the viewer (optionally flying the camera to it). */
  select(id: string | null, fly = true) {
    if (this.selected) (this.selected.material as THREE.MeshBasicMaterial).color.setHex(this.selected.userData.baseColor);
    this.selected = undefined;
    const target = this.placeTargets.find((m) => (m.userData.place as WorldPlace).id === id);
    if (!target) return this.opts.onSelect(null);
    const place = target.userData.place as WorldPlace;
    const dot = target.userData.dot as THREE.Mesh;
    dot.userData.baseColor = (dot.material as THREE.MeshBasicMaterial).color.getHex();
    (dot.material as THREE.MeshBasicMaterial).color.setHex(PALETTE.glow);
    this.selected = dot;
    this.targetSpin = this.nearestAngle(this.spin.rotation.y, -place.lon * deg - Math.PI / 2);
    this.targetTilt = place.lat * deg;
    if (fly) this.flyTo('globe');
    this.kick();
    this.opts.onSelect(place);
  }

  /** Camera presets: the whole scene, the Earth, or the Sinjar mountains and the tree. */
  flyTo(where: 'overview' | 'globe' | 'sinjar') {
    this.userMoved = true;
    const presets = {
      overview: { pos: new THREE.Vector3(0, 1.6, this.fitDistance()), look: new THREE.Vector3(0, 1.3, 0) },
      globe: { pos: new THREE.Vector3(0, GLOBE_Y + 0.4, 8.2), look: new THREE.Vector3(0, GLOBE_Y, 0) },
      sinjar: { pos: new THREE.Vector3(2.2, -1.6, 7.2), look: new THREE.Vector3(0, -2.4, 0) },
    };
    const shift = this.root.position.x;
    presets[where].pos.x += shift;
    presets[where].look.x += shift;
    this.targetCam = presets[where];
    if (where === 'sinjar') {
      this.targetSpin = this.nearestAngle(this.spin.rotation.y, -SINJAR.lon * deg - Math.PI / 2);
      this.targetTilt = SINJAR.lat * deg;
    }
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

  private fitDistance() {
    const aspect = this.camera.aspect || 1;
    return aspect < 0.6 ? 27 : aspect < 0.8 ? 23 : aspect < 1.2 ? 19 : 17.5;
  }

  /** On wide screens the scene moves away from the side where the title is (RTL: title on the right). */
  setSide(dir: 'rtl' | 'ltr') {
    this.side = dir === 'rtl' ? -1 : 1;
    this.applySide();
  }

  private applySide() {
    const aspect = this.camera.aspect || 1;
    this.root.position.x = aspect > 1.25 ? this.side * 3.4 : 0;
    // Portrait phones: the title takes the top of the screen, so the scene sits lower.
    this.root.position.y = aspect < 0.8 ? -3.4 : 0;
  }

  /** For tests: where a place appears on screen (CSS px), and whether it faces the viewer. */
  screenPosition(id: string) {
    const target = this.placeTargets.find((m) => (m.userData.place as WorldPlace).id === id);
    if (!target) return null;
    const p = target.getWorldPosition(new THREE.Vector3()).project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height, facing: this.isFacing(target) };
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
    this.tilt.scale.setScalar(Math.max(0.001, 0.55 + 0.45 * ease(5.6, 8)) * (ease(5.6, 6.4) > 0 ? 1 : 0.001));
    if (this.targetSpin !== null) {
      this.spin.rotation.y += (this.targetSpin - this.spin.rotation.y) * Math.min(1, dt * 2.5 || 1);
      if (Math.abs(this.targetSpin - this.spin.rotation.y) < 0.002) this.targetSpin = null;
    } else if (!still) {
      this.spin.rotation.y += dt * 0.07 * ease(7, 9);
    }
    if (this.targetTilt !== null) {
      this.tilt.rotation.x += (this.targetTilt - this.tilt.rotation.x) * Math.min(1, dt * 2.5 || 1);
    }

    // Moving lights.
    const pulseK = ease(9.5, 11);
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
      const k = ease(1, 9.5);
      const end = new THREE.Vector3(0, 1.6, this.fitDistance());
      this.camera.position.lerpVectors(new THREE.Vector3(0, -1.4, 10.5), end, k);
      this.controls.target.lerpVectors(new THREE.Vector3(0, -2.6, 0), new THREE.Vector3(0, 1.3, 0), k);
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
