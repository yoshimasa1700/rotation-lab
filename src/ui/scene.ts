import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { toThreeQuaternion } from "../adapters/three";
import type { Pose } from "../math/rigid-transform";
import type { Vec3 } from "../math/rotation";

const colors = [0xba4939, 0x397f57, 0x376da3];
function label(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "bold 36px sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(text, 128, 52);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, depthTest: false }),
  );
  sprite.scale.set(0.95, 0.3, 1);
  return sprite;
}
function axes(length: number, suffix: string): THREE.Group {
  const group = new THREE.Group();
  ["X", "Y", "Z"].forEach((name, i) => {
    const d = new THREE.Vector3(
      i === 0 ? 1 : 0,
      i === 1 ? 1 : 0,
      i === 2 ? 1 : 0,
    );
    group.add(
      new THREE.ArrowHelper(
        d,
        new THREE.Vector3(),
        length,
        colors[i],
        0.15,
        0.07,
      ),
    );
    const text = label(`${name}${suffix}`, `#${colors[i].toString(16)}`);
    text.position.copy(d.multiplyScalar(length + 0.2));
    group.add(text);
  });
  return group;
}
function aircraft(point: Vec3): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({
    color: 0xd27947,
    roughness: 0.65,
    metalness: 0.12,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x344d4a,
    roughness: 0.6,
  });
  const box = (size: Vec3, pos: Vec3, material: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    m.position.set(...pos);
    group.add(m);
  };
  box([1.6, 0.28, 0.24], [0, 0, 0], body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 4), body);
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 1.05;
  group.add(nose);
  box([0.5, 1.55, 0.08], [-0.12, 0, 0], body);
  box([0.3, 0.6, 0.08], [-0.65, 0, 0.05], dark);
  box([0.35, 0.06, 0.45], [-0.63, 0, 0.2], dark);
  box([0.35, 0.22, 0.18], [0.3, 0, 0.18], dark);
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x833e23 }),
  );
  marker.position.set(...point);
  group.add(marker);
  const text = label("p", "#71452e");
  text.position.set(point[0] + 0.2, point[1], point[2] + 0.35);
  group.add(text);
  return group;
}
export class SceneView {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
  private renderer: THREE.WebGLRenderer | undefined;
  private controls: OrbitControls | undefined;
  private object: THREE.Group;
  private yaw = new THREE.Group();
  private pitch = new THREE.Group();
  private roll = new THREE.Group();
  private trail: THREE.Line | undefined;
  private observer: ResizeObserver;
  constructor(
    private host: HTMLElement,
    gimbal = false,
    point: Vec3 = [1, 0, 0],
  ) {
    this.object = aircraft(point);
    this.scene.background = new THREE.Color(0xf0f0e8);
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(5, -7, 5);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x77776c, 2.3));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(3, -4, 8);
    this.scene.add(light);
    const grid = new THREE.GridHelper(12, 24, 0xc3c9bf, 0xdfe2d7);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -1.45;
    this.scene.add(grid);
    this.scene.add(axes(2.4, "w"));
    this.object.add(axes(1.7, "b"));
    this.scene.add(this.object);
    if (gimbal) {
      this.scene.add(this.yaw);
      this.yaw.add(this.pitch);
      this.pitch.add(this.roll);
      [this.yaw, this.pitch, this.roll].forEach((g, i) => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(2.05 - i * 0.22, 0.018, 8, 100),
          new THREE.MeshBasicMaterial({
            color: colors[2 - i],
            transparent: true,
            opacity: 0.7,
          }),
        );
        if (i === 1) ring.rotation.x = Math.PI / 2;
        if (i === 2) ring.rotation.y = Math.PI / 2;
        g.add(ring);
        const direction = new THREE.Vector3(
          i === 2 ? 1 : 0,
          i === 1 ? 1 : 0,
          i === 0 ? 1 : 0,
        );
        g.add(
          new THREE.ArrowHelper(
            direction,
            new THREE.Vector3(),
            2.2,
            colors[2 - i],
            0.14,
            0.06,
          ),
        );
      });
    }
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      this.renderer.domElement.setAttribute(
        "aria-label",
        "3D姿勢。ドラッグで視点を変更できます。数値は隣のパネルに表示されます。",
      );
      host.append(this.renderer.domElement);
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enablePan = false;
      this.controls.minDistance = 4;
      this.controls.maxDistance = 22;
      this.controls.addEventListener("change", () => this.render());
    } catch {
      const fallback = document.createElement("p");
      fallback.className = "webgl-fallback";
      fallback.textContent =
        "この環境では3D表示を開始できません。WebGL対応ブラウザで開いてください。数値と操作はそのまま利用できます。";
      host.append(fallback);
    }
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
  }
  private resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer?.setSize(w, h);
    this.render();
  }
  setPose(pose: Pose, euler?: Vec3) {
    this.object.quaternion.copy(toThreeQuaternion(pose.q));
    this.object.position.set(...pose.t);
    if (euler) {
      this.yaw.rotation.z = euler[2];
      this.pitch.rotation.y = euler[1];
      this.roll.rotation.x = euler[0];
    }
    this.render();
  }
  setTrail(points: Vec3[], color = 0xb85b35) {
    if (this.trail) {
      this.scene.remove(this.trail);
      this.trail.geometry.dispose();
      (this.trail.material as THREE.Material).dispose();
    }
    this.trail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(
        points.map((p) => new THREE.Vector3(...p)),
      ),
      new THREE.LineBasicMaterial({ color }),
    );
    this.scene.add(this.trail);
    this.render();
  }
  resetCamera() {
    this.camera.position.set(5, -7, 5);
    this.controls?.target.set(0, 0, 0);
    this.controls?.update();
    this.render();
  }
  private render() {
    this.renderer?.render(this.scene, this.camera);
  }
  dispose() {
    this.observer.disconnect();
    this.controls?.dispose();
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    this.scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.geometry) geometries.add(m.geometry);
      if (m.material)
        for (const mat of Array.isArray(m.material)
          ? m.material
          : [m.material]) {
          materials.add(mat);
          const map = (mat as THREE.MeshBasicMaterial).map;
          if (map) textures.add(map);
        }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.host.replaceChildren();
  }
}
