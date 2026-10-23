import { useRef, useState } from "react";
import { api, mediaUrl } from "../lib/api";
import { Btn, ErrorNote } from "./ui";

export function ImageUpload({ value, onChange, label = "Upload image" }: { value: string | null; onChange: (url: string | null) => void; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await api<{ url: string }>("/admin/uploads", { method: "POST", body, auth: true });
      onChange(res.url);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {value && <img src={mediaUrl(value)} alt="" className="aspect-[16/9] w-full max-w-xs rounded-md border border-line object-cover" />}
      <div className="flex gap-2">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" tabIndex={-1}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
        <Btn onClick={() => input.current?.click()} disabled={busy}>{busy ? "Uploading…" : label}</Btn>
        {value && <Btn variant="ghost" onClick={() => onChange(null)}>Remove</Btn>}
      </div>
      <ErrorNote error={error} />
    </div>
  );
}
