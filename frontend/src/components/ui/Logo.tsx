import { brand } from "../../config/brand";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg aria-hidden="true" width="26" height="26" viewBox="0 0 32 32" className="text-gold">
        <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M9 23 16 8l7 15M11.6 18h8.8" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
      <span className="font-display text-[1.6rem] leading-none tracking-[0.02em]">{brand.name}</span>
    </span>
  );
}
