import { useEffect, useRef } from "react";
import { media } from "../../config/media.config";
import { useReducedMotion } from "../../lib/hooks";
import { Reveal } from "../ui/Reveal";
import { SceneImage } from "../ui/SceneImage";

const STEPS = media.journey;

/** Pinned, scroll-scrubbed crossfade through pre-rendered stills. */
export function Journey() {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (reduced || !sectionRef.current) return;
    const section = sectionRef.current;
    let revert: (() => void) | undefined;
    let disposed = false;
    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        const layers = gsap.utils.toArray<HTMLElement>("[data-layer]");
        const captions = gsap.utils.toArray<HTMLElement>("[data-caption]");
        const bar = section.querySelector("[data-progress]");
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub: 0.8 },
        });
        layers.forEach((layer, i) => {
          tl.fromTo(layer.querySelector("img"), { scale: 1.12 }, { scale: 1, duration: 1.2 }, Math.max(0, i - 0.2));
          if (i > 0) {
            tl.fromTo(layer, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 }, i - 0.2);
            tl.fromTo(captions[i], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.25 }, i - 0.05);
            tl.to(captions[i - 1], { autoAlpha: 0, y: -30, duration: 0.2 }, i - 0.25);
          }
        });
        if (bar) tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: layers.length }, 0);
      }, section);
      revert = () => ctx.revert();
    })();
    return () => {
      disposed = true;
      revert?.();
    };
  }, [reduced]);

  if (reduced) {
    return (
      <section aria-labelledby="journey-title" className="container-luxe py-28">
        <p className="eyebrow">The journey</p>
        <h2 id="journey-title" className="mt-5 text-5xl">From model to moment</h2>
        <div className="mt-14 grid gap-14 md:grid-cols-2">
          {STEPS.map((s) => (
            <figure key={s.scene}>
              <SceneImage scene={s.scene} alt={s.title} sizes="(min-width: 768px) 50vw, 100vw" className="aspect-[16/10]" />
              <figcaption className="mt-5">
                <p className="font-display text-3xl">{s.title}</p>
                <p className="mt-2 text-stone-300">{s.body}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} aria-labelledby="journey-title" className="relative" style={{ height: `${STEPS.length * 100}svh` }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {STEPS.map((s, i) => (
          <div key={s.scene} data-layer className={`absolute inset-0 ${i === 0 ? "" : "invisible opacity-0"}`}>
            <SceneImage scene={s.scene} alt={s.title} className="h-full w-full" />
          </div>
        ))}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/20 to-ink-950/50" />
        <div className="container-luxe relative flex h-full flex-col justify-between pb-14 pt-28">
          <Reveal>
            <p className="eyebrow">The journey</p>
            <h2 id="journey-title" className="mt-4 max-w-xl text-[clamp(2.2rem,4.6vw,3.8rem)] leading-[1.02]">
              From model to moment
            </h2>
          </Reveal>
          <div className="relative min-h-[11rem]">
            {STEPS.map((s, i) => (
              <div key={s.scene} data-caption className={`absolute bottom-0 max-w-lg ${i === 0 ? "" : "invisible opacity-0"}`}>
                <p className="text-sm tabular-nums tracking-[0.2em] text-gold">
                  {String(i + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
                </p>
                <p className="mt-3 font-display text-[clamp(2rem,4vw,3.2rem)] leading-[1.05]">{s.title}</p>
                <p className="mt-3 text-stone-300">{s.body}</p>
              </div>
            ))}
          </div>
          <div aria-hidden="true" className="mt-8 h-px w-full bg-line">
            <div data-progress className="h-px origin-left scale-x-0 bg-gold" />
          </div>
        </div>
      </div>
    </section>
  );
}
