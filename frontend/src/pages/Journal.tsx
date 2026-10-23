import { Link } from "react-router-dom";
import { Reveal } from "../components/ui/Reveal";
import { SceneImage } from "../components/ui/SceneImage";
import { brand } from "../config/brand";
import { dateShort } from "../lib/format";
import { useApi, useDocumentTitle } from "../lib/hooks";
import type { Post } from "../lib/types";

export default function Journal() {
  useDocumentTitle(`Journal · ${brand.name}`);
  const { data, error } = useApi<Post[]>("/posts");
  const [lead, ...rest] = data ?? [];
  return (
    <div className="container-luxe pb-28 pt-40">
      <p className="eyebrow">Journal</p>
      <h1 className="mt-5 text-[clamp(3rem,7vw,6rem)] leading-[0.95]">Notes on selling off-plan</h1>
      {error && !data && <p className="mt-16 text-stone-300" role="alert">Articles couldn't be loaded.</p>}
      {lead && (
        <Reveal className="mt-20">
          <Link to={`/journal/${lead.slug}`} className="group grid items-end gap-10 lg:grid-cols-[1.4fr_1fr]">
            <SceneImage src={lead.cover} alt="" priority className="aspect-[16/10] rounded-sm" sizes="(min-width: 1024px) 60vw, 100vw" />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-stone-400">{dateShort(lead.published_at)}</p>
              <h2 className="mt-4 text-5xl leading-tight group-hover:text-gold-soft">{lead.title}</h2>
              <p className="mt-4 text-stone-300">{lead.excerpt}</p>
            </div>
          </Link>
        </Reveal>
      )}
      <div className="mt-20 grid gap-12 md:grid-cols-2">
        {rest.map((p) => (
          <Reveal key={p.slug}>
            <Link to={`/journal/${p.slug}`} className="group block">
              <SceneImage src={p.cover} alt="" className="aspect-[16/10] rounded-sm" sizes="(min-width: 768px) 45vw, 100vw" />
              <p className="mt-6 text-xs uppercase tracking-[0.18em] text-stone-400">{dateShort(p.published_at)}</p>
              <h2 className="mt-3 text-3xl group-hover:text-gold-soft">{p.title}</h2>
              <p className="mt-3 text-stone-300">{p.excerpt}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
