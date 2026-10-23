import type { ComponentPropsWithoutRef, ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div>
        <h1 className="font-sans text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "danger" | "ghost";
const btn: Record<BtnVariant, string> = {
  primary: "bg-gold text-ink-950 hover:bg-gold-soft",
  secondary: "border border-line text-bone hover:border-stone-400",
  danger: "border border-[#7a3a2c] text-[#f0a58f] hover:bg-[#2a1712]",
  ghost: "text-stone-300 hover:text-bone hover:bg-ink-800",
};

export function Btn({ variant = "secondary", className = "", type = "button", ...rest }: ComponentPropsWithoutRef<"button"> & { variant?: BtnVariant }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${btn[variant]} ${className}`}
      {...rest}
    />
  );
}

export const inputCls =
  "w-full rounded-md border border-line bg-ink-900 px-3 py-2 text-sm text-bone placeholder:text-stone-500 focus:border-gold focus:outline-none";

export function Field({ label, children, hint, error }: { label: string; children: ReactNode; hint?: string; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-stone-300">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-[#f0a58f]">{error}</span>}
    </label>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-line bg-ink-900 p-5 ${className}`}>{children}</section>;
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-md border border-[#7a3a2c] bg-[#2a1712] px-3 py-2 text-sm text-[#f0a58f]">
      {error instanceof Error ? error.message : String(error)}
    </p>
  );
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-5 right-5 z-[80]">
      {message && <p className="rounded-md border border-line bg-ink-800 px-4 py-2.5 text-sm shadow-xl">{message}</p>}
    </div>
  );
}
