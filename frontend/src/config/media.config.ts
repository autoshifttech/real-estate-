/**
 * Media wiring. Swap in your own renders by regenerating media (see docs/ASSETS.md)
 * and changing the paths below. Nothing else in the codebase hard-codes media paths.
 */
export type HeroMode = "frames" | "video";

export const media = {
  hero: {
    mode: "frames" as HeroMode,
    /** Folder produced by scripts/video_to_frames.sh (must contain manifest.json). */
    sequence: "/media/sequences/clip1_K1_to_K2",
    /** Used only when mode === "video": an all-intra MP4 (every frame a keyframe). */
    video: "/media/sequences/clip1_K1_to_K2/scrub.mp4",
    /** Scroll distance of the pinned hero, in viewport heights. */
    scrollLength: 2.6,
  },
  /** The "journey" section crossfades through these stills while pinned. */
  journey: [
    { scene: "aerial", title: "Set in the landscape", body: "Pre-rendered at golden hour, so the first impression is the one you designed." },
    { scene: "entrance", title: "Arrive", body: "Walk buyers through the entrance sequence before a single wall is poured." },
    { scene: "living", title: "Live in it", body: "Interiors at true scale, lit the way the architect intended." },
    { scene: "terrace", title: "Step outside", body: "Every terrace, every view line, matched to the unit it belongs to." },
    { scene: "pool-night", title: "Day into night", body: "Show the residence after dark: the moment most buyers fall for it." },
  ],
  scenes: {
    cutaway: "cutaway",
    drone: "drone",
    model: "model",
    modelLine: "model-line",
    exterior1: "exterior-1",
    exterior2: "exterior-2",
    glassWall: "glass-wall",
    poolSunset: "pool-sunset",
  },
} as const;

/** Build a scene URL for a given width (800 | 1600) or the tiny blurred placeholder. */
export function sceneUrl(slug: string, size: 800 | 1600 | "lqip" = 1600): string {
  return `/media/scenes/${slug}-${size}.webp`;
}

/** Turn a stored "/media/scenes/x-1600.webp" into a responsive srcset when possible. */
export function srcSetFor(url: string): string | undefined {
  const m = url.match(/^\/media\/scenes\/(.+)-1600\.webp$/);
  if (!m) return undefined;
  return `${sceneUrl(m[1], 800)} 800w, ${sceneUrl(m[1], 1600)} 1600w`;
}
