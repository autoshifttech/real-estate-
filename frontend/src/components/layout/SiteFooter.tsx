import { Link } from "react-router-dom";
import { brand } from "../../config/brand";
import { Logo } from "../ui/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line/70 bg-ink-950">
      <div className="container-luxe grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-stone-400">{brand.description}</p>
        </div>
        <div>
          <h2 className="eyebrow">Explore</h2>
          <ul className="mt-5 space-y-3 text-sm text-stone-300">
            <li><Link className="hover:text-gold-soft" to="/projects">Projects</Link></li>
            <li><Link className="hover:text-gold-soft" to={`/explorer/${brand.demoProjectSlug}`}>Unit explorer</Link></li>
            <li><Link className="hover:text-gold-soft" to="/journal">Journal</Link></li>
            <li><Link className="hover:text-gold-soft" to="/#faq">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="eyebrow">Studio</h2>
          <ul className="mt-5 space-y-3 text-sm text-stone-300">
            <li><a className="hover:text-gold-soft" href={`mailto:${brand.email}`}>{brand.email}</a></li>
            <li><a className="hover:text-gold-soft" href={`tel:${brand.phone.replace(/\s/g, "")}`}>{brand.phone}</a></li>
            <li className="text-stone-400">{brand.address}</li>
          </ul>
        </div>
        <div>
          <h2 className="eyebrow">Team</h2>
          <ul className="mt-5 space-y-3 text-sm text-stone-300">
            <li><Link className="hover:text-gold-soft" to="/admin">Sales back panel</Link></li>
            <li><Link className="hover:text-gold-soft" to="/contact">Book a demo</Link></li>
          </ul>
        </div>
      </div>
      <div className="container-luxe flex flex-col gap-2 border-t border-line/50 py-6 text-xs text-stone-500 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} {brand.name}. Demo content; Calanthe Bay is a fictional development.</p>
        <p>Imagery: pre-rendered visualisations.</p>
      </div>
    </footer>
  );
}
