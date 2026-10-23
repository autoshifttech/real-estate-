import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { brand } from "../../config/brand";
import { ButtonLink } from "../ui/Button";
import { Logo } from "../ui/Logo";

const NAV = [
  { to: "/#platform", label: "Platform" },
  { to: "/projects", label: "Projects" },
  { to: `/explorer/${brand.demoProjectSlug}`, label: "Explorer" },
  { to: "/#pricing", label: "Pricing" },
  { to: "/journal", label: "Journal" },
  { to: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
        scrolled || open ? "border-b border-line/60 bg-ink-950/80 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <div className="container-luxe flex h-[72px] items-center justify-between">
        <Link to="/" aria-label={`${brand.name} home`} className="relative z-10">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-9 lg:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-[0.78rem] uppercase tracking-[0.18em] transition-colors hover:text-gold-soft ${
                  isActive && !item.to.includes("#") ? "text-gold-soft" : "text-stone-300"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden lg:block">
          <ButtonLink to="/contact" variant="ghost" className="!px-5 !py-2.5">
            Book a demo
          </ButtonLink>
        </div>
        <button
          ref={menuButton}
          type="button"
          className="relative z-10 -mr-2 flex h-11 w-11 items-center justify-center lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden="true" className="relative block h-3 w-6">
            <span className={`absolute left-0 h-px w-6 bg-bone transition-transform duration-500 ${open ? "top-1.5 rotate-45" : "top-0"}`} />
            <span className={`absolute left-0 h-px w-6 bg-bone transition-transform duration-500 ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
          </span>
        </button>
      </div>
      <div
        id="mobile-menu"
        hidden={!open}
        className="fixed inset-0 top-[72px] h-[calc(100dvh-72px)] bg-ink-950 lg:hidden"
      >
        <nav aria-label="Mobile" className="container-luxe flex h-full flex-col justify-between py-10">
          <ul className="space-y-2">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="block py-2 font-display text-4xl text-bone hover:text-gold-soft">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <ButtonLink to="/contact" arrow>
            Book a demo
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
