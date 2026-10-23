import { Hero } from "../components/hero/Hero";
import { Journey } from "../components/sections/Journey";
import {
  CtaBand,
  Faq,
  FeaturedProject,
  Features,
  HowItWorks,
  JournalTeaser,
  Pricing,
  StatsBand,
  ValueProps,
} from "../components/sections/HomeSections";
import { brand } from "../config/brand";
import { useDocumentTitle } from "../lib/hooks";

export default function Home() {
  useDocumentTitle(`${brand.name} · ${brand.tagline}`);
  return (
    <>
      <Hero />
      <ValueProps />
      <Journey />
      <Features />
      <StatsBand />
      <FeaturedProject />
      <HowItWorks />
      <Pricing />
      <Faq />
      <JournalTeaser />
      <CtaBand />
    </>
  );
}
