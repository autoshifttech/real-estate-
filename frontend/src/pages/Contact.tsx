import { useSearchParams } from "react-router-dom";
import { EnquiryForm } from "../components/ui/EnquiryForm";
import { SceneImage } from "../components/ui/SceneImage";
import { brand } from "../config/brand";
import { useDocumentTitle } from "../lib/hooks";

export default function Contact() {
  useDocumentTitle(`Contact · ${brand.name}`);
  const [params] = useSearchParams();
  const plan = params.get("plan")?.slice(0, 40);
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <SceneImage scene="glass-wall" alt="" priority className="sticky top-0 h-screen" />
      </div>
      <div className="container-luxe max-w-2xl pb-24 pt-40 lg:px-16">
        <p className="eyebrow">Contact</p>
        <h1 className="mt-5 text-[clamp(3rem,6vw,5rem)] leading-[0.95]">Book a walkthrough</h1>
        <p className="mt-6 text-lg text-stone-300">
          Tell us about your development. We'll show you the platform with your own renders within a week.
        </p>
        <div className="mt-14">
          <EnquiryForm
            source="contact"
            submitLabel="Request a walkthrough"
            defaultMessage={plan ? `Interested in the ${plan} plan.` : ""}
          />
        </div>
        <dl className="mt-16 grid gap-6 border-t border-line pt-10 text-sm sm:grid-cols-3">
          <div><dt className="text-stone-400">Email</dt><dd className="mt-1"><a className="hover:text-gold-soft" href={`mailto:${brand.email}`}>{brand.email}</a></dd></div>
          <div><dt className="text-stone-400">Phone</dt><dd className="mt-1">{brand.phone}</dd></div>
          <div><dt className="text-stone-400">Studio</dt><dd className="mt-1">{brand.address}</dd></div>
        </dl>
      </div>
    </div>
  );
}
