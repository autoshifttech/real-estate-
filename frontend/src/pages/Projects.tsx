import { Link } from "react-router-dom";
import { Reveal } from "../components/ui/Reveal";
import { SceneImage } from "../components/ui/SceneImage";
import { brand } from "../config/brand";
import { money } from "../lib/format";
import { useApi, useDocumentTitle } from "../lib/hooks";
import type { Project } from "../lib/types";

const STATUS = { launching: "Launching", selling: "Now selling", sold_out: "Sold out" } as const;

export default function Projects() {
  useDocumentTitle(`Projects · ${brand.name}`);
  const { data, error, loading } = useApi<Project[]>("/projects");
  return (
    <div className="container-luxe pb-28 pt-40">
      <p className="eyebrow">Portfolio</p>
      <h1 className="mt-5 text-[clamp(3rem,7vw,6rem)] leading-[0.95]">Projects</h1>
      <p className="mt-6 max-w-xl text-lg text-stone-300">Developments presented on {brand.name}, each with a live explorer, brochures and pipeline.</p>
      {loading && !data && <p className="mt-20 text-stone-400" role="status">Loading projects…</p>}
      {error && !data && <p className="mt-20 text-stone-300" role="alert">Projects couldn't be loaded. Check your connection and try again.</p>}
      <div className="mt-20 grid gap-16">
        {data?.map((p, i) => (
          <Reveal key={p.slug}>
            <Link to={`/projects/${p.slug}`} className="group grid items-end gap-10 lg:grid-cols-[1.5fr_1fr]">
              <SceneImage src={p.hero_image} alt={p.name} priority={i === 0} sizes="(min-width: 1024px) 60vw, 100vw"
                className="aspect-[16/10] rounded-sm" imgClassName="transition-transform duration-[1.6s] ease-[var(--ease-luxe)] group-hover:scale-[1.04]" />
              <div>
                <p className="eyebrow">{STATUS[p.status]} · {p.location}</p>
                <h2 className="mt-4 text-5xl transition-colors group-hover:text-gold-soft">{p.name}</h2>
                <p className="mt-4 leading-relaxed text-stone-300">{p.summary}</p>
                <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-line pt-6 text-sm">
                  <div><dt className="text-stone-400">From</dt><dd className="mt-1 text-bone">{p.price_from ? money(p.price_from, p.currency, true) : "—"}</dd></div>
                  <div><dt className="text-stone-400">Available</dt><dd className="mt-1 text-bone">{p.unit_counts?.available ?? "—"}</dd></div>
                  <div><dt className="text-stone-400">Completion</dt><dd className="mt-1 text-bone">{p.completion}</dd></div>
                </dl>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
