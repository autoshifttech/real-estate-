import { Link, useParams } from "react-router-dom";
import { ButtonLink } from "../components/ui/Button";
import { EnquiryForm } from "../components/ui/EnquiryForm";
import { Reveal } from "../components/ui/Reveal";
import { SceneImage } from "../components/ui/SceneImage";
import { StatusBadge } from "../components/ui/StatusBadge";
import { brand } from "../config/brand";
import { money } from "../lib/format";
import { useApi, useDocumentTitle } from "../lib/hooks";
import type { Project, Unit } from "../lib/types";
import NotFound from "./NotFound";

export default function ProjectDetail() {
  const { slug = "" } = useParams();
  const { data: p, error } = useApi<Project>(`/projects/${slug}`);
  const { data: units } = useApi<Unit[]>(`/projects/${slug}/units`, { query: { status: "available" } });
  useDocumentTitle(p ? `${p.name} · ${brand.name}` : undefined);

  if (error && !p) return <NotFound />;
  if (!p) return <div className="min-h-screen" role="status" aria-label="Loading" />;

  const byBeds = new Map<number, Unit[]>();
  units?.forEach((u) => byBeds.set(u.beds, [...(byBeds.get(u.beds) ?? []), u]));
  const total = p.unit_counts ? p.unit_counts.available + p.unit_counts.reserved + p.unit_counts.sold : 0;

  return (
    <>
      <section className="relative flex min-h-[92svh] items-end overflow-hidden">
        <SceneImage src={p.hero_image} alt={`${p.name}, aerial view`} priority className="absolute inset-0 h-full w-full" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-ink-950/40" />
        <div className="container-luxe relative pb-20">
          <p className="eyebrow">{p.location}</p>
          <h1 className="mt-5 text-[clamp(3.4rem,9vw,8rem)] leading-[0.9]">{p.name}</h1>
          <p className="mt-6 max-w-xl text-lg text-stone-300">{p.tagline}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <ButtonLink to={`/explorer/${p.slug}`} arrow>Explore residences</ButtonLink>
            <ButtonLink to="#enquire" variant="ghost">Enquire</ButtonLink>
          </div>
        </div>
      </section>

      <section className="container-luxe grid gap-16 py-28 lg:grid-cols-[1.3fr_1fr]">
        <Reveal>
          <p className="eyebrow">The development</p>
          <div className="mt-6 space-y-6 text-lg leading-relaxed text-stone-300">
            {p.description?.split("\n").map((para) => <p key={para}>{para}</p>)}
          </div>
        </Reveal>
        <Reveal delay={150}>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line">
            {[
              ["Residences", String(total)],
              ["Available", String(p.unit_counts?.available ?? 0)],
              ["Buildings", String(p.buildings?.length ?? 0)],
              ["Completion", p.completion],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col-reverse bg-ink-950 p-6">
                <dt className="mt-2 text-sm text-stone-400">{k}</dt>
                <dd className="font-display text-4xl">{v}</dd>
              </div>
            ))}
          </dl>
          <h2 className="eyebrow mt-12">Amenities</h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 text-stone-300">
            {p.amenities.map((a) => <li key={a} className="border-b border-line/60 pb-3">{a}</li>)}
          </ul>
        </Reveal>
      </section>

      <section aria-label="Gallery" className="overflow-hidden py-10">
        <div className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto px-[clamp(1.25rem,4vw,3.5rem)] pb-4" tabIndex={0} aria-label="Gallery, scroll horizontally">
          {p.gallery.map((src, i) => (
            <SceneImage key={src} src={src} alt={`${p.name} gallery image ${i + 1}`} sizes="(min-width: 768px) 60vw, 85vw"
              className="aspect-[16/10] w-[85vw] flex-none snap-start rounded-sm md:w-[60vw]" />
          ))}
        </div>
      </section>

      <section className="container-luxe py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Availability</p>
            <h2 className="mt-4 text-5xl">Residences available now</h2>
          </div>
          <ButtonLink to={`/explorer/${p.slug}`} variant="quiet" arrow>Open the 3D explorer</ButtonLink>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-sm border border-line bg-line md:grid-cols-2 lg:grid-cols-4">
          {[...byBeds.entries()].sort(([a], [b]) => a - b).map(([beds, list]) => (
            <div key={beds} className="bg-ink-950 p-8">
              <h3 className="text-3xl">{beds === 4 ? "Penthouses" : `${beds}-bedroom`}</h3>
              <p className="mt-2 text-stone-400">{list.length} available</p>
              <p className="mt-8 text-sm uppercase tracking-[0.16em] text-stone-400">From</p>
              <p className="font-display text-4xl text-gold-soft">{money(Math.min(...list.map((u) => u.price)), p.currency)}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {list.slice(0, 4).map((u) => (
                  <li key={u.id}>
                    <Link to={`/explorer/${p.slug}?unit=${u.id}`} className="flex items-center justify-between gap-3 text-stone-300 hover:text-gold-soft">
                      <span>{u.code}</span>
                      <StatusBadge status={u.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="enquire" className="scroll-mt-24 border-t border-line bg-ink-900">
        <div className="container-luxe grid gap-16 py-28 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="eyebrow">Private appointments</p>
            <h2 className="mt-4 text-5xl">Enquire about {p.name}</h2>
            <p className="mt-6 max-w-md text-stone-300">Request the price list, payment plan or a private viewing at the sales suite.</p>
          </div>
          <EnquiryForm source="website" defaultMessage={`I'm interested in ${p.name}.`} />
        </div>
      </section>
    </>
  );
}
