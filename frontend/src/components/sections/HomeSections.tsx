import { useState } from "react";
import { Link } from "react-router-dom";
import { brand } from "../../config/brand";
import { media } from "../../config/media.config";
import { faqs, features, howItWorks, pricing, valueProps } from "../../config/platform";
import { useApi } from "../../lib/hooks";
import { dateShort, money } from "../../lib/format";
import type { Post, Project } from "../../lib/types";
import { ButtonLink } from "../ui/Button";
import { Reveal } from "../ui/Reveal";
import { SceneImage } from "../ui/SceneImage";
import { SectionHeading } from "../ui/SectionHeading";

export function ValueProps() {
  return (
    <section aria-labelledby="value-title" className="container-luxe py-28 sm:py-36">
      <SectionHeading
        id="value-title"
        eyebrow="Why it converts"
        title={<>Luxury that loads <em className="text-gold-soft">instantly</em>.</>}
        intro="Buyers judge a residence in seconds. The experience has to be there before they decide to leave."
      />
      <div className="mt-20 grid gap-px overflow-hidden rounded-sm border border-line bg-line md:grid-cols-3">
        {valueProps.map((v, i) => (
          <Reveal key={v.title} delay={i * 120} className="bg-ink-950 p-8 sm:p-10">
            <p className="font-display text-6xl text-gold-soft">{v.stat}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-stone-400">{v.statLabel}</p>
            <h3 className="mt-10 text-3xl">{v.title}</h3>
            <p className="mt-4 leading-relaxed text-stone-300">{v.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Features() {
  return (
    <section id="platform" aria-labelledby="features-title" className="scroll-mt-24 bg-ink-900 py-28 sm:py-36">
      <div className="container-luxe">
        <SectionHeading
          id="features-title"
          eyebrow="The platform"
          title="Everything a sales suite does, in a link."
          intro="Four tools, one live inventory. Change a price once and it's right everywhere."
        />
        <div className="mt-20 grid gap-x-10 gap-y-20 md:grid-cols-2">
          {features.map((f, i) => (
            <Reveal key={f.key} delay={(i % 2) * 150} className={i % 2 ? "md:mt-24" : ""}>
              <SceneImage scene={f.scene} alt="" sizes="(min-width: 768px) 45vw, 100vw" className="aspect-[4/3] rounded-sm" />
              <p className="mt-8 text-sm tabular-nums text-gold">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-3 text-4xl">{f.title}</h3>
              <p className="mt-4 max-w-md leading-relaxed text-stone-300">{f.body}</p>
            </Reveal>
          ))}
        </div>
        <div className="mt-20">
          <ButtonLink to={`/explorer/${brand.demoProjectSlug}`} arrow>
            Try the unit explorer
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

export function StatsBand() {
  const { data: projects } = useApi<Project[]>("/projects");
  const project = projects?.[0];
  const counts = project?.unit_counts;
  const total = counts ? counts.available + counts.reserved + counts.sold : 40;
  const stats = [
    { value: "120", label: "frames per scroll, streamed progressively" },
    { value: String(total), label: "residences live in the demo" },
    { value: counts ? String(counts.available) : "·", label: "available right now" },
    { value: "0", label: "app-store installs needed" },
  ];
  return (
    <section aria-label="Key figures" className="border-y border-line bg-ink-950">
      <dl className="container-luxe grid grid-cols-2 gap-y-12 py-16 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse border-l border-line pl-6">
            <dt className="mt-3 text-sm text-stone-400">{s.label}</dt>
            <dd className="font-display text-5xl tabular-nums text-bone sm:text-6xl">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function FeaturedProject() {
  const { data: projects } = useApi<Project[]>("/projects");
  const p = projects?.[0];
  return (
    <section aria-labelledby="featured-title" className="relative overflow-hidden">
      <SceneImage scene={media.scenes.exterior1} alt="" className="absolute inset-0 h-full w-full" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/70 to-ink-950/10" />
      <div className="container-luxe relative py-32 sm:py-44">
        <Reveal className="max-w-xl">
          <p className="eyebrow">Live demo · {p?.location ?? "Aegean Coast"}</p>
          <h2 id="featured-title" className="mt-5 text-[clamp(2.8rem,6vw,5.2rem)] leading-[0.98]">
            {p?.name ?? "Calanthe Bay"}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-stone-300">
            {p?.summary ?? "Forty residences across two buildings, set into olive terraces above a private cove."}
          </p>
          {p?.price_from ? (
            <p className="mt-6 text-sm uppercase tracking-[0.18em] text-stone-400">
              Residences from <span className="text-gold-soft">{money(p.price_from, p.currency)}</span>
            </p>
          ) : null}
          <div className="mt-10 flex flex-wrap gap-4">
            <ButtonLink to={`/explorer/${brand.demoProjectSlug}`} arrow>
              Open the explorer
            </ButtonLink>
            <ButtonLink to={`/projects/${brand.demoProjectSlug}`} variant="ghost">
              Project details
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="container-luxe py-28 sm:py-36">
      <SectionHeading id="how-title" eyebrow="How it works" title="Live in weeks, not seasons." />
      <ol className="mt-20 grid gap-12 md:grid-cols-3">
        {howItWorks.map((s, i) => (
          <Reveal as="li" key={s.step} delay={i * 140} className="relative border-t border-line pt-10">
            <span aria-hidden="true" className="absolute -top-px left-0 h-px w-16 bg-gold" />
            <p className="font-display text-7xl text-stone-500">{s.step}</p>
            <h3 className="mt-6 text-3xl">{s.title}</h3>
            <p className="mt-4 leading-relaxed text-stone-300">{s.body}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

export function Pricing() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-24 bg-ink-900 py-28 sm:py-36">
      <div className="container-luxe">
        <SectionHeading
          id="pricing-title"
          eyebrow="Pricing"
          title="Sized to your estate."
          intro="Every plan includes hosting, updates and the full back panel. No per-lead fees."
          align="center"
        />
        <div className="mt-20 grid gap-6 lg:grid-cols-3">
          {pricing.map((tier, i) => (
            <Reveal
              key={tier.name}
              delay={i * 120}
              className={`flex flex-col rounded-sm border p-8 sm:p-10 ${
                tier.highlight ? "border-gold/60 bg-ink-800" : "border-line bg-ink-950"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-3xl">{tier.name}</h3>
                {tier.highlight && (
                  <span className="rounded-full border border-gold/50 px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-gold-soft">
                    Most chosen
                  </span>
                )}
              </div>
              <p className="mt-3 text-stone-400">{tier.blurb}</p>
              <p className="mt-10 flex items-baseline gap-2">
                <span className="font-display text-6xl">{tier.price}</span>
                <span className="text-stone-400">{tier.cadence}</span>
              </p>
              <p className="mt-2 text-sm uppercase tracking-[0.16em] text-gold">{tier.limit}</p>
              <ul className="mt-10 flex-1 space-y-4 border-t border-line pt-8 text-stone-300">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-3">
                    <svg aria-hidden="true" viewBox="0 0 16 16" className="mt-1 h-4 w-4 flex-none text-gold">
                      <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <ButtonLink to={`/contact?plan=${encodeURIComponent(tier.name)}`} variant={tier.highlight ? "primary" : "ghost"} className="mt-10">
                {tier.price === "Custom" ? "Talk to us" : "Start with " + tier.name.split(" ")[0]}
              </ButtonLink>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" aria-labelledby="faq-title" className="container-luxe scroll-mt-24 py-28 sm:py-36">
      <div className="grid gap-16 lg:grid-cols-[1fr_1.6fr]">
        <SectionHeading id="faq-title" eyebrow="Questions" title="Asked by developers like you." />
        <div className="border-t border-line">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="border-b border-line">
                <h3 className="font-sans text-base">
                  <button
                    type="button"
                    id={`faq-q-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-7 text-left text-lg text-bone transition-colors hover:text-gold-soft"
                  >
                    {f.q}
                    <span aria-hidden="true" className="relative h-4 w-4 flex-none">
                      <span className="absolute left-0 top-1/2 h-px w-4 bg-gold" />
                      <span className={`absolute left-1/2 top-0 h-4 w-px bg-gold transition-transform duration-500 ${isOpen ? "scale-y-0" : ""}`} />
                    </span>
                  </button>
                </h3>
                <div
                  id={`faq-a-${i}`}
                  role="region"
                  aria-labelledby={`faq-q-${i}`}
                  className={`grid transition-[grid-template-rows] duration-500 ease-[var(--ease-luxe)] ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden" inert={!isOpen}>
                    <p className="max-w-2xl pb-8 leading-relaxed text-stone-300">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function JournalTeaser() {
  const { data: posts } = useApi<Post[]>("/posts");
  if (!posts?.length) return null;
  return (
    <section aria-labelledby="journal-title" className="border-t border-line bg-ink-950 py-28">
      <div className="container-luxe">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading id="journal-title" eyebrow="Journal" title="Notes on selling off-plan." />
          <ButtonLink to="/journal" variant="quiet" arrow>
            All articles
          </ButtonLink>
        </div>
        <div className="mt-16 grid gap-10 md:grid-cols-3">
          {posts.slice(0, 3).map((p, i) => (
            <Reveal key={p.slug} delay={i * 120}>
              <Link to={`/journal/${p.slug}`} className="group block">
                <SceneImage src={p.cover} alt="" sizes="(min-width: 768px) 30vw, 100vw" className="aspect-[3/2] rounded-sm" imgClassName="transition-transform duration-[1.4s] ease-[var(--ease-luxe)] group-hover:scale-105" />
                <p className="mt-6 text-xs uppercase tracking-[0.18em] text-stone-400">{dateShort(p.published_at)}</p>
                <h3 className="mt-3 text-2xl leading-snug transition-colors group-hover:text-gold-soft">{p.title}</h3>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section aria-labelledby="cta-title" className="relative overflow-hidden border-t border-line">
      <SceneImage scene={media.scenes.poolSunset} alt="" className="absolute inset-0 h-full w-full" />
      <div aria-hidden="true" className="absolute inset-0 bg-ink-950/75" />
      <div className="container-luxe relative py-32 text-center sm:py-40">
        <Reveal>
          <p className="eyebrow">Your development, next</p>
          <h2 id="cta-title" className="mx-auto mt-6 max-w-3xl text-[clamp(2.6rem,6vw,5rem)] leading-[1]">
            Let buyers fall for it <em className="text-gold-soft">before</em> it's built.
          </h2>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <ButtonLink to="/contact" arrow>
              Book a walkthrough
            </ButtonLink>
            <ButtonLink to={`/explorer/${brand.demoProjectSlug}`} variant="ghost">
              Explore the demo
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
