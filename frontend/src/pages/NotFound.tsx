import { ButtonLink } from "../components/ui/Button";
import { useDocumentTitle } from "../lib/hooks";

export default function NotFound() {
  useDocumentTitle("Not found");
  return (
    <div className="container-luxe flex min-h-[80svh] flex-col justify-center pt-24">
      <p className="eyebrow">404</p>
      <h1 className="mt-5 text-6xl">This page isn't on the plans.</h1>
      <div className="mt-10">
        <ButtonLink to="/" arrow>Back to home</ButtonLink>
      </div>
    </div>
  );
}
