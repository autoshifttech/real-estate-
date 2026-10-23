import { useId, useState, type FormEvent } from "react";
import { ApiError } from "../../lib/api";
import { sendEnquiry, type EnquiryPayload } from "../../lib/visitor";
import { Button } from "./Button";

interface Props {
  source: EnquiryPayload["source"];
  unitIds?: string[];
  unitLabels?: string[];
  defaultMessage?: string;
  submitLabel?: string;
  compact?: boolean;
  onDone?: () => void;
}

type Errors = Partial<Record<"name" | "email" | "phone" | "message" | "consent" | "form", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9+()\-. ]{0,32}$/;

export function validateEnquiry(v: { name: string; email: string; phone: string; message: string; consent: boolean }): Errors {
  const e: Errors = {};
  if (v.name.trim().length < 2) e.name = "Please enter your name.";
  else if (v.name.length > 80) e.name = "Name is too long.";
  if (!EMAIL_RE.test(v.email.trim())) e.email = "Please enter a valid email address.";
  if (v.phone && !PHONE_RE.test(v.phone)) e.phone = "Use digits, spaces and + ( ) - only.";
  if (v.message.length > 2000) e.message = "Please keep your message under 2,000 characters.";
  if (!v.consent) e.consent = "Please agree so we can contact you.";
  return e;
}

export function EnquiryForm({ source, unitIds = [], unitLabels = [], defaultMessage = "", submitLabel = "Send enquiry", compact, onDone }: Props) {
  const id = useId();
  const [values, setValues] = useState({ name: "", email: "", phone: "", message: defaultMessage, consent: false, website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "queued">("idle");

  const set = (key: keyof typeof values) => (value: string | boolean) => setValues((v) => ({ ...v, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validateEnquiry(values);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    setState("sending");
    try {
      const result = await sendEnquiry({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        message: values.message.trim(),
        unit_ids: unitIds,
        source,
        consent: values.consent,
        website: values.website,
      });
      setState(result);
      onDone?.();
    } catch (err) {
      setState("idle");
      setErrors({ form: err instanceof ApiError ? err.message : "Something went wrong. Please try again." });
    }
  }

  if (state === "sent" || state === "queued") {
    return (
      <div role="status" className="py-6">
        <p className="font-display text-4xl">Thank you.</p>
        <p className="mt-3 text-stone-300">
          {state === "sent"
            ? "Your enquiry is with our sales team. We'll be in touch within one working day."
            : "You're offline right now. We've saved your enquiry and will send it automatically when you reconnect."}
        </p>
      </div>
    );
  }

  const fieldError = (key: keyof Errors) =>
    errors[key] ? (
      <p id={`${id}-${key}-err`} className="mt-2 text-sm text-[#f0a58f]">
        {errors[key]}
      </p>
    ) : null;

  const describedBy = (key: keyof Errors) => (errors[key] ? `${id}-${key}-err` : undefined);

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-6">
      {unitLabels.length > 0 && (
        <p className="text-sm text-stone-300">
          Regarding <span className="text-gold-soft">{unitLabels.join(", ")}</span>
        </p>
      )}
      <div className={compact ? "space-y-6" : "grid gap-6 sm:grid-cols-2"}>
        <div>
          <label htmlFor={`${id}-name`} className="text-xs uppercase tracking-[0.16em] text-stone-400">
            Full name
          </label>
          <input id={`${id}-name`} className="field" autoComplete="name" maxLength={80} value={values.name}
            aria-invalid={!!errors.name} aria-describedby={describedBy("name")} onChange={(e) => set("name")(e.target.value)} />
          {fieldError("name")}
        </div>
        <div>
          <label htmlFor={`${id}-email`} className="text-xs uppercase tracking-[0.16em] text-stone-400">
            Email
          </label>
          <input id={`${id}-email`} type="email" className="field" autoComplete="email" maxLength={254} value={values.email}
            aria-invalid={!!errors.email} aria-describedby={describedBy("email")} onChange={(e) => set("email")(e.target.value)} />
          {fieldError("email")}
        </div>
        <div className={compact ? "" : "sm:col-span-2"}>
          <label htmlFor={`${id}-phone`} className="text-xs uppercase tracking-[0.16em] text-stone-400">
            Phone <span className="normal-case tracking-normal text-stone-500">(optional)</span>
          </label>
          <input id={`${id}-phone`} type="tel" className="field" autoComplete="tel" maxLength={32} value={values.phone}
            aria-invalid={!!errors.phone} aria-describedby={describedBy("phone")} onChange={(e) => set("phone")(e.target.value)} />
          {fieldError("phone")}
        </div>
        <div className={compact ? "" : "sm:col-span-2"}>
          <label htmlFor={`${id}-message`} className="text-xs uppercase tracking-[0.16em] text-stone-400">
            Message <span className="normal-case tracking-normal text-stone-500">(optional)</span>
          </label>
          <textarea id={`${id}-message`} rows={compact ? 3 : 4} className="field resize-y" maxLength={2000} value={values.message}
            aria-invalid={!!errors.message} aria-describedby={describedBy("message")} onChange={(e) => set("message")(e.target.value)} />
          {fieldError("message")}
        </div>
      </div>
      {/* Honeypot: hidden from people and assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set("website")(e.target.value)} />
      </div>
      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-stone-300">
          <input id={`${id}-consent`} type="checkbox" checked={values.consent} onChange={(e) => set("consent")(e.target.checked)}
            aria-invalid={!!errors.consent} aria-describedby={describedBy("consent")}
            className="mt-1 h-4 w-4 flex-none accent-[var(--color-gold)]" />
          I agree to be contacted about this enquiry. My details are used only for this purpose.
        </label>
        {fieldError("consent")}
      </div>
      {errors.form && (
        <p role="alert" className="text-sm text-[#f0a58f]">
          {errors.form}
        </p>
      )}
      <Button type="submit" arrow disabled={state === "sending"} className={compact ? "w-full" : ""}>
        {state === "sending" ? "Sending…" : submitLabel}
      </Button>
    </form>
  );
}
