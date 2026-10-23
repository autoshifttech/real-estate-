/**
 * Progressive frame-sequence loader.
 * Order: every 4th frame first (so scrubbing works early at low density), then the gaps.
 * On Save-Data / slow connections only every `lowDataStride`-th frame is fetched.
 */
export interface SequenceManifest {
  frameCount: number;
  fps: number;
  pattern: string;
  pad: number;
  desktop: { dir: string; width: number; height: number; poster: string };
  mobile: { dir: string; width: number; height: number; poster: string };
}

type Variant = "desktop" | "mobile";

export function pickVariant(): Variant {
  return window.innerWidth / window.innerHeight < 1 ? "mobile" : "desktop";
}

export function isLowData(): boolean {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!conn && (conn.saveData === true || /(^|-)2g|3g/.test(conn.effectiveType ?? ""));
}

export function loadOrder(count: number, coarse = 4, stride = 1): number[] {
  const order: number[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < count; i += Math.max(coarse, stride)) {
    order.push(i);
    seen.add(i);
  }
  if (!seen.has(count - 1)) {
    order.push(count - 1);
    seen.add(count - 1);
  }
  for (let i = 0; i < count; i += stride) {
    if (!seen.has(i)) order.push(i);
  }
  return order;
}

export class FrameLoader {
  readonly frames: (HTMLImageElement | undefined)[];
  private started = false;
  private cancelled = false;

  constructor(
    private base: string,
    private manifest: SequenceManifest,
    private variant: Variant,
    private onFrame: (index: number) => void,
  ) {
    this.frames = new Array(manifest.frameCount);
  }

  url(index: number): string {
    const name = this.manifest.pattern.replace("{index}", String(index + 1).padStart(this.manifest.pad, "0"));
    return `${this.base}/${this.manifest[this.variant].dir}/${name}`;
  }

  start(concurrency = 6): void {
    if (this.started) return;
    this.started = true;
    const order = loadOrder(this.manifest.frameCount, 4, isLowData() ? 3 : 1);
    let cursor = 0;
    const next = (): void => {
      if (this.cancelled || cursor >= order.length) return;
      const index = order[cursor++];
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        const done = () => {
          this.frames[index] = img;
          this.onFrame(index);
          next();
        };
        // decode() keeps the main thread free while scrubbing.
        if (img.decode) img.decode().then(done, done);
        else done();
      };
      img.onerror = () => next();
      img.src = this.url(index);
    };
    for (let i = 0; i < concurrency; i++) next();
  }

  /** Nearest loaded frame to `index` (searches outward). */
  nearest(index: number): HTMLImageElement | undefined {
    const n = this.frames.length;
    for (let d = 0; d < n; d++) {
      const a = this.frames[index - d];
      if (a) return a;
      const b = this.frames[index + d];
      if (b) return b;
    }
    return undefined;
  }

  cancel(): void {
    this.cancelled = true;
  }
}
