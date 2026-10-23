/**
 * Tiny fetch wrapper. In dev, Vite proxies /api to FastAPI. In production set
 * VITE_API_URL to the API origin (e.g. https://aurevia-api.onrender.com).
 */
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const TOKEN_KEY = "aurevia.token";

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode): token lives only in memory for this tab */
  }
}

export class ApiError extends Error {
  status: number;
  details: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type Query = Record<string, string | number | boolean | (string | number)[] | null | undefined>;

export function apiUrl(path: string, query?: Query): string {
  const url = new URL(`${API_BASE}/api${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(key, String(v)));
      else url.searchParams.set(key, String(value));
    }
  }
  return API_BASE ? url.toString() : url.pathname + url.search;
}

/** Resolve media paths: app-relative (/media/...) stay as-is; API uploads get the API origin. */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith("/uploads/")) return `${API_BASE}${path}`;
  return path;
}

function messageFrom(status: number, body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) {
      const first = detail[0] as { msg: string; loc?: (string | number)[] };
      const field = first.loc?.[first.loc.length - 1];
      return field ? `${String(field)}: ${first.msg.replace(/^Value error, /, "")}` : first.msg;
    }
  }
  if (status === 429) return "Too many requests, please wait a moment.";
  return `Request failed (${status})`;
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; query?: Query; auth?: boolean; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  if (options.auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(apiUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body,
    signal: options.signal,
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data: unknown = text ? safeJson(text) : undefined;
  if (!res.ok) {
    if (res.status === 401 && options.auth) {
      setToken(null);
      window.dispatchEvent(new Event("aurevia:unauthorized"));
    }
    throw new ApiError(res.status, messageFrom(res.status, data), data);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Authenticated file download (CSV export etc.). */
export async function downloadAuthed(path: string, query: Query, filename: string): Promise<void> {
  const token = getToken();
  const res = await fetch(apiUrl(path, query), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new ApiError(res.status, messageFrom(res.status, undefined));
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
