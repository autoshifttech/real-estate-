import {
  ACESFilmicToneMapping,
  BoxGeometry,
  CircleGeometry,
  Color,
  EdgesGeometry,
  FogExp2,
  Group,
  HemisphereLight,
  DirectionalLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Building, Unit, UnitStatus } from "../lib/types";

const FLOOR_H = 1.25;
const DEPTH = 6;
const GAP = 0.08;
/** Relative widths per plan type: matches the plan widths in backend/app/plans.py. */
const PLAN_WIDTH: Record<string, number> = { A1: 9, B2: 12, C3: 14, P4: 18 };

const STATUS_COLOR: Record<UnitStatus, Color> = {
  // Same hues as the --color-available/reserved/sold tokens in index.css.
  available: new Color("#4fa57f"),
  reserved: new Color("#bd8527"),
  sold: new Color("#7b86d1"),
};
const GOLD = new Color("#c9a46a");
const BLACK = new Color("#000000");

interface UnitMesh {
  mesh: Mesh<BoxGeometry, MeshStandardMaterial>;
  edges: LineSegments<EdgesGeometry, LineBasicMaterial>;
  unit: Unit;
  buildingCode: string;
}

export interface SceneOptions {
  reducedMotion: boolean;
  onSelect: (unitId: string | null) => void;
  onHover: (unitId: string | null) => void;
}

/**
 * A lightweight architectural massing model: every residence is a picking volume
 * coloured by live status. The photoreal look lives in the pre-rendered frames;
 * this model is for navigation, so it stays small and fast.
 */
export class BuildingScene {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(32, 1, 0.5, 400);
  private controls: OrbitControls;
  private root = new Group();
  private units = new Map<string, UnitMesh>();
  private buildingGroups = new Map<string, Group>();
  private slabs: { mesh: Object3D; buildingCode: string; floor: number }[] = [];
  private labels = new Map<string, { el: HTMLElement; anchor: Vector3 }>();
  private raycaster = new Raycaster();
  private pointer = new Vector2();
  private hovered: string | null = null;
  private selected: string | null = null;
  private matches: Set<string> | null = null;
  private isolate: { building: string | null; floor: number | null } = { building: null, floor: null };
  private frame = 0;
  private visible = true;
  private lastInteraction = performance.now();
  private flyTo: { target: Vector3; position: Vector3 } | null = null;
  private downAt: { x: number; y: number } | null = null;
  private resizeObserver: ResizeObserver;
  private intersection: IntersectionObserver;

  constructor(
    private container: HTMLElement,
    private opts: SceneOptions,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor("#0d0c0a");
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.touchAction = "none";
    container.appendChild(this.renderer.domElement);

    this.scene.fog = new FogExp2("#0d0c0a", 0.012);
    this.scene.add(new HemisphereLight("#f6e6cc", "#1a1612", 1.4));
    const sun = new DirectionalLight("#ffd9a0", 2.4);
    sun.position.set(-30, 40, 25);
    this.scene.add(sun);
    const rim = new DirectionalLight("#8fa6c8", 0.6);
    rim.position.set(30, 12, -30);
    this.scene.add(rim);

    const ground = new Mesh(new CircleGeometry(80, 64), new MeshStandardMaterial({ color: "#16130f", roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    const pad = new Mesh(new CircleGeometry(24, 64), new MeshStandardMaterial({ color: "#1f1b16", roughness: 0.95 }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.01;
    this.scene.add(pad);
    this.scene.add(this.root);

    this.camera.position.set(34, 24, 40);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 3.5, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 16;
    this.controls.maxDistance = 90;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = 1.38;
    this.controls.autoRotateSpeed = 0.45;
    this.controls.addEventListener("start", () => {
      this.lastInteraction = performance.now();
      this.flyTo = null;
    });

    const el = this.renderer.domElement;
    el.addEventListener("pointermove", this.onPointerMove);
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointerleave", this.onPointerLeave);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.intersection = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
    });
    this.intersection.observe(container);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.resize();
    this.loop();
  }

  setData(buildings: Building[], units: Unit[]): void {
    this.clearModel();
    const byBuilding = new Map<string, Unit[]>();
    units.forEach((u) => byBuilding.set(u.building_id, [...(byBuilding.get(u.building_id) ?? []), u]));

    for (const b of buildings) {
      const group = new Group();
      group.position.set(b.position.x, 0, b.position.z);
      this.root.add(group);
      this.buildingGroups.set(b.code, group);
      const list = byBuilding.get(b.id) ?? [];
      const floors = Math.max(b.floors, ...list.map((u) => u.floor));

      // Width of a floor = sum of its unit widths (scaled), so every floor lines up.
      const widthsByFloor = new Map<number, number>();
      list.forEach((u) => widthsByFloor.set(u.floor, (widthsByFloor.get(u.floor) ?? 0) + (PLAN_WIDTH[u.plan_type] ?? 12)));
      const maxRaw = Math.max(1, ...widthsByFloor.values());
      const scale = 13 / maxRaw;

      for (let floor = 0; floor <= floors; floor++) {
        const slab = new Mesh(
          new BoxGeometry(13.6, 0.14, DEPTH + 0.8),
          new MeshStandardMaterial({ color: floor === 0 ? "#2b2620" : "#3a342c", roughness: 0.8, transparent: true }),
        );
        slab.position.set(0, floor * FLOOR_H + (floor === 0 ? 0.07 : 0), 0);
        group.add(slab);
        this.slabs.push({ mesh: slab, buildingCode: b.code, floor });
      }

      for (let floor = 1; floor <= floors; floor++) {
        const row = list.filter((u) => u.floor === floor).sort((a, c) => a.position - c.position);
        const rowWidth = row.reduce((s, u) => s + (PLAN_WIDTH[u.plan_type] ?? 12) * scale, 0);
        let x = -rowWidth / 2;
        // Upper floors step back slightly, like the terraced renders.
        const setback = floor === floors ? -0.5 : 0;
        for (const u of row) {
          const w = (PLAN_WIDTH[u.plan_type] ?? 12) * scale;
          const geo = new BoxGeometry(w - GAP * 2, FLOOR_H - 0.22, DEPTH - GAP * 2);
          const mat = new MeshStandardMaterial({
            color: STATUS_COLOR[u.status].clone(),
            roughness: 0.35,
            metalness: 0.05,
            transparent: true,
            opacity: 0.92,
          });
          const mesh = new Mesh(geo, mat);
          mesh.position.set(x + w / 2, (floor - 1) * FLOOR_H + FLOOR_H / 2 + 0.07, setback);
          mesh.userData.unitId = u.id;
          const edges = new LineSegments(
            new EdgesGeometry(geo),
            new LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.35 }),
          );
          edges.position.copy(mesh.position);
          group.add(mesh, edges);
          this.units.set(u.id, { mesh, edges, unit: u, buildingCode: b.code });
          x += w;
        }
      }
      const label = this.labels.get(b.code);
      if (label) label.anchor.set(b.position.x, floors * FLOOR_H + 1.6, b.position.z);
    }
    this.applyAppearance();
  }

  updateUnits(units: Unit[]): void {
    units.forEach((u) => {
      const entry = this.units.get(u.id);
      if (entry) entry.unit = u;
    });
    this.applyAppearance();
  }

  attachLabel(code: string, el: HTMLElement | null): void {
    if (!el) {
      this.labels.delete(code);
      return;
    }
    const group = this.buildingGroups.get(code);
    const anchor = new Vector3();
    if (group) {
      const floors = Math.max(0, ...[...this.units.values()].filter((u) => u.buildingCode === code).map((u) => u.unit.floor));
      anchor.set(group.position.x, floors * FLOOR_H + 1.6, group.position.z);
    }
    this.labels.set(code, { el, anchor });
  }

  setMatches(ids: Set<string> | null): void {
    this.matches = ids;
    this.applyAppearance();
  }

  setSelected(id: string | null): void {
    this.selected = id;
    this.applyAppearance();
    if (id) {
      const entry = this.units.get(id);
      if (entry) {
        const world = new Vector3();
        entry.mesh.getWorldPosition(world);
        const dir = this.camera.position.clone().sub(this.controls.target).normalize();
        const distance = 30;
        this.flyTo = { target: world.clone(), position: world.clone().add(dir.multiplyScalar(distance)) };
        this.lastInteraction = performance.now();
      }
    }
  }

  focusBuilding(code: string | null): void {
    const group = code ? this.buildingGroups.get(code) : null;
    const target = group ? new Vector3(group.position.x, 3.5, group.position.z) : new Vector3(0, 3.5, 0);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.flyTo = { target, position: target.clone().add(dir.multiplyScalar(group ? 36 : 52)) };
    this.lastInteraction = performance.now();
  }

  isolateFloor(building: string | null, floor: number | null): void {
    this.isolate = { building, floor };
    this.applyAppearance();
  }

  private applyAppearance(): void {
    const { building: isoB, floor: isoF } = this.isolate;
    for (const [id, entry] of this.units) {
      const { mesh, edges, unit, buildingCode } = entry;
      const mat = mesh.material;
      const hidden = isoF !== null && (isoB === null || isoB === buildingCode) && unit.floor > isoF;
      const muted = isoF !== null && (isoB === null || isoB === buildingCode) && unit.floor < isoF;
      const match = !this.matches || this.matches.has(id);
      mat.color.copy(STATUS_COLOR[unit.status]);
      mat.opacity = hidden ? 0.04 : !match ? 0.1 : muted ? 0.35 : 0.92;
      mat.depthWrite = !hidden && match;
      edges.material.opacity = hidden ? 0.03 : !match ? 0.08 : 0.35;
      mesh.visible = true;
      let emissive = BLACK;
      let intensity = 0;
      if (id === this.selected) {
        emissive = GOLD;
        intensity = 0.9;
        edges.material.opacity = 1;
      } else if (id === this.hovered && match && !hidden) {
        emissive = GOLD;
        intensity = 0.4;
        edges.material.opacity = 0.8;
      }
      mat.emissive.copy(emissive);
      mat.emissiveIntensity = intensity;
      mesh.userData.pickable = !hidden && match;
    }
    for (const slab of this.slabs) {
      const mat = (slab.mesh as Mesh<BoxGeometry, MeshStandardMaterial>).material;
      const hidden = isoF !== null && (isoB === null || isoB === slab.buildingCode) && slab.floor > isoF;
      mat.opacity = hidden ? 0.05 : 1;
    }
  }

  private pick(clientX: number, clientY: number): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = [...this.units.values()].filter((u) => u.mesh.userData.pickable).map((u) => u.mesh);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    return (hit?.object.userData.unitId as string | undefined) ?? null;
  }

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const id = this.pick(e.clientX, e.clientY);
    if (id !== this.hovered) {
      this.hovered = id;
      this.renderer.domElement.style.cursor = id ? "pointer" : "grab";
      this.applyAppearance();
      this.opts.onHover(id);
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    this.downAt = { x: e.clientX, y: e.clientY };
    this.lastInteraction = performance.now();
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.downAt) return;
    const moved = Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y);
    this.downAt = null;
    if (moved > 6) return; // that was a drag/orbit, not a tap
    const id = this.pick(e.clientX, e.clientY);
    if (id) this.opts.onSelect(id);
  };

  private onPointerLeave = () => {
    if (this.hovered) {
      this.hovered = null;
      this.applyAppearance();
      this.opts.onHover(null);
    }
  };

  private onVisibility = () => {
    if (document.visibilityState === "visible") this.lastInteraction = performance.now();
  };

  private resize(): void {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.camera.aspect = w / h;
    // Pull back on narrow (portrait) screens so both buildings fit.
    this.camera.fov = w / h < 0.9 ? 44 : 32;
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    this.frame = requestAnimationFrame(this.loop);
    if (!this.visible || document.visibilityState !== "visible") return;
    const idle = performance.now() - this.lastInteraction > 8000;
    this.controls.autoRotate = !this.opts.reducedMotion && idle && !this.selected;
    if (this.flyTo) {
      const k = this.opts.reducedMotion ? 1 : 0.06;
      this.controls.target.lerp(this.flyTo.target, k);
      this.camera.position.lerp(this.flyTo.position, k);
      if (this.camera.position.distanceTo(this.flyTo.position) < 0.05) this.flyTo = null;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.updateLabels();
  };

  private updateLabels(): void {
    if (!this.labels.size) return;
    const { clientWidth: w, clientHeight: h } = this.container;
    const v = new Vector3();
    for (const { el, anchor } of this.labels.values()) {
      v.copy(anchor).project(this.camera);
      const behind = v.z > 1;
      el.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
      el.style.opacity = behind ? "0" : "1";
    }
  }

  private clearModel(): void {
    this.root.traverse((obj) => {
      const m = obj as Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as MeshStandardMaterial | MeshStandardMaterial[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.root.clear();
    this.units.clear();
    this.buildingGroups.clear();
    this.slabs = [];
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.intersection.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    const el = this.renderer.domElement;
    el.removeEventListener("pointermove", this.onPointerMove);
    el.removeEventListener("pointerdown", this.onPointerDown);
    el.removeEventListener("pointerup", this.onPointerUp);
    el.removeEventListener("pointerleave", this.onPointerLeave);
    this.controls.dispose();
    this.clearModel();
    this.scene.traverse((obj) => {
      const m = obj as Mesh;
      m.geometry?.dispose();
      (m.material as MeshStandardMaterial | undefined)?.dispose?.();
    });
    this.renderer.dispose();
    el.remove();
  }
}

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
