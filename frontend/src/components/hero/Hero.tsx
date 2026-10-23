import { useEffect, useRef, useState } from "react";
import { brand } from "../../config/brand";
import { media } from "../../config/media.config";
import { useReducedMotion } from "../../lib/hooks";
import { ButtonLink } from "../ui/Button";
import { FrameLoader, pickVariant, type SequenceManifest } from "./frameLoader";

const SEQ = media.hero.sequence;

const CAPTIONS = [
  { eyebrow: "Chapter I", title: "Every residence, modelled.", body: "A sculpted massing of the whole development, as precise as the drawings." },
  { eyebrow: "Chapter II", title: "Every line, traced in light.", body: "Watch the plan come alive, from paper to place, in a single scroll." },
];

/**
 * Full-screen hero. The poster <img> paints first (LCP); the canvas frame
 * sequence loads after first paint and is scrubbed by GSAP ScrollTrigger.
 */
export function Hero() {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoMode = media.hero.mode === "video";
  const headlineRef = useRef<HTMLDivElement>(null);
  const captionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cueRef = useRef<HTMLDivElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || (!canvas && !videoMode)) return;

    let disposed = false;
    let loader: FrameLoader | null = null;
    let cleanup: (() => void) | undefined;
    const state = { frame: 0 };
    const ctx = canvas?.getContext("2d", { alpha: false });

    const resize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      draw();
    };

    function draw() {
      const video = videoRef.current;
      if (videoMode && video) {
        if (video.duration) video.currentTime = (state.frame / 1000) * video.duration;
        return;
      }
      if (!ctx || !loader || !canvas) return;
      const img = loader.nearest(Math.round(state.frame));
      if (!img) return;
      const cw = canvas.width;
      const ch = canvas.height;
      const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    }

    const boot = async () => {
      let last = 1000;
      if (videoMode) {
        const video = videoRef.current;
        if (!video) return;
        video.src = media.hero.video;
        video.addEventListener("loadeddata", () => setCanvasReady(true), { once: true });
        video.load();
      } else {
        const res = await fetch(`${SEQ}/manifest.json`);
        const manifest = (await res.json()) as SequenceManifest;
        if (disposed) return;
        last = manifest.frameCount - 1;
        loader = new FrameLoader(SEQ, manifest, pickVariant(), (index) => {
          if (index === 0) {
            resize();
            setCanvasReady(true);
          } else if (Math.abs(index - state.frame) < 3) {
            draw();
          }
        });
        loader.start();
      }

      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);

      const gctx = gsap.context(() => {
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
          },
        });
        tl.to(state, { frame: last, duration: 1, onUpdate: draw }, 0);
        tl.to(headlineRef.current, { autoAlpha: 0, y: -60, duration: 0.18 }, 0.04);
        tl.to(cueRef.current, { autoAlpha: 0, duration: 0.05 }, 0);
        captionRefs.current.forEach((el, i) => {
          if (!el) return;
          const at = 0.28 + i * 0.36;
          tl.fromTo(el, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.1 }, at);
          tl.to(el, { autoAlpha: 0, y: -40, duration: 0.1 }, at + 0.22);
        });
      }, section);
      cleanup = () => gctx.revert();
    };

    // Start after first paint so frames never compete with the LCP poster.
    const kick = () => void boot();
    let idleHandle: number | undefined;
    const startWhenIdle = () => {
      if ("requestIdleCallback" in window) idleHandle = window.requestIdleCallback(kick, { timeout: 1500 });
      else idleHandle = setTimeout(kick, 200) as unknown as number;
    };
    if (document.readyState === "complete") startWhenIdle();
    else window.addEventListener("load", startWhenIdle, { once: true });

    window.addEventListener("resize", resize);
    return () => {
      disposed = true;
      loader?.cancel();
      cleanup?.();
      window.removeEventListener("resize", resize);
      window.removeEventListener("load", startWhenIdle);
      if (idleHandle !== undefined) {
        if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleHandle);
        clearTimeout(idleHandle);
      }
    };
  }, [reduced, videoMode]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-title"
      className="relative"
      style={{ height: reduced ? "100svh" : `${(1 + media.hero.scrollLength) * 100}svh` }}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <picture>
          <source media="(max-aspect-ratio: 1/1)" srcSet={`${SEQ}/poster-mobile.webp`} />
          <img
            src={`${SEQ}/poster-desktop.webp`}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
        {videoMode ? (
          <video
            ref={videoRef}
            aria-hidden="true"
            muted
            playsInline
            preload="none"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${canvasReady ? "opacity-100" : "opacity-0"}`}
          />
        ) : (
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${canvasReady ? "opacity-100" : "opacity-0"}`}
          />
        )}
        {/* Legibility gradient */}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-ink-950/75 via-ink-950/10 to-ink-950/85" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-ink-950/60 via-transparent to-transparent" />

        <div ref={headlineRef} className="container-luxe relative flex h-full flex-col justify-end pb-[14svh] sm:justify-center sm:pb-0">
          <p className="eyebrow">Off-plan, brought to life</p>
          <h1 id="hero-title" className="mt-6 max-w-4xl text-[clamp(3.1rem,8.6vw,8.2rem)] leading-[0.92]">
            Render it. <em className="text-gold-soft">Reveal</em> it.
            <br /> Reserve it.
          </h1>
          <p className="mt-7 max-w-xl text-[1.05rem] leading-relaxed text-stone-300 sm:text-lg">{brand.description}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <ButtonLink to={`/explorer/${brand.demoProjectSlug}`} arrow>
              Explore a live demo
            </ButtonLink>
            <ButtonLink to="/contact" variant="ghost">
              Book a walkthrough
            </ButtonLink>
          </div>
        </div>

        {!reduced &&
          CAPTIONS.map((c, i) => (
            <div
              key={c.title}
              ref={(el) => {
                captionRefs.current[i] = el;
              }}
              className="invisible absolute inset-x-0 bottom-[12svh] opacity-0"
            >
              <div className={`container-luxe flex ${i % 2 ? "justify-end text-right" : ""}`}>
                <div className="max-w-md">
                  <p className="eyebrow">{c.eyebrow}</p>
                  <p className="mt-4 font-display text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.02]">{c.title}</p>
                  <p className="mt-4 text-stone-300">{c.body}</p>
                </div>
              </div>
            </div>
          ))}

        {!reduced && (
          <div ref={cueRef} aria-hidden="true" className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 sm:flex">
            <span className="text-[0.65rem] uppercase tracking-[0.3em] text-stone-400">Scroll</span>
            <span className="h-10 w-px origin-top animate-[cue_2.4s_var(--ease-luxe)_infinite] bg-gold" />
          </div>
        )}
      </div>
    </section>
  );
}
