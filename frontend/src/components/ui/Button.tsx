import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "ghost" | "quiet";

const base =
  "group inline-flex items-center justify-center gap-3 rounded-full text-[0.8rem] font-medium uppercase tracking-[0.18em] transition-all duration-500 ease-[var(--ease-luxe)] disabled:cursor-not-allowed disabled:opacity-50 min-h-11";
const variants: Record<Variant, string> = {
  primary: "bg-gold px-7 py-3.5 text-ink-950 hover:bg-gold-soft",
  ghost: "border border-bone/30 px-7 py-3.5 text-bone hover:border-gold hover:text-gold-soft backdrop-blur-sm",
  quiet: "px-1 py-2 text-bone hover:text-gold-soft",
};

function Arrow() {
  return (
    <svg aria-hidden="true" width="18" height="10" viewBox="0 0 18 10" className="transition-transform duration-500 group-hover:translate-x-1">
      <path d="M0 5h16M12 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

interface CommonProps {
  variant?: Variant;
  arrow?: boolean;
  children: ReactNode;
  className?: string;
}

export function ButtonLink({ to, variant = "primary", arrow, children, className = "", ...rest }: CommonProps & { to: string } & Omit<ComponentPropsWithoutRef<"a">, "href">) {
  const cls = `${base} ${variants[variant]} ${className}`;
  if (/^(https?:|mailto:|tel:)/.test(to) || to.endsWith(".pdf")) {
    return (
      <a href={to} className={cls} {...rest}>
        {children}
        {arrow && <Arrow />}
      </a>
    );
  }
  return (
    <Link to={to} className={cls} {...rest}>
      {children}
      {arrow && <Arrow />}
    </Link>
  );
}

export function Button({ variant = "primary", arrow, children, className = "", type = "button", ...rest }: CommonProps & ComponentPropsWithoutRef<"button">) {
  return (
    <button type={type} className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
      {arrow && <Arrow />}
    </button>
  );
}
