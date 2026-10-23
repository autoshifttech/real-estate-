import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  id,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  id?: string;
}) {
  return (
    <Reveal className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-5 text-[clamp(2.4rem,5.2vw,4.4rem)] leading-[1.02]">
        {title}
      </h2>
      {intro && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-300 [text-wrap:pretty]">{intro}</p>}
    </Reveal>
  );
}
