import { api } from "./api";

const VISITOR_KEY = "aurevia.visitor";
const QUEUE_KEY = "aurevia.outbox";

function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return "v" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Anonymous, first-party visitor id used to attach viewed units to a lead when they enquire. */
export function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return randomId();
  }
}

const tracked = new Set<string>();

export function trackUnitView(unitId: string): void {
  if (tracked.has(unitId)) return;
  tracked.add(unitId);
  api("/track/view", { method: "POST", body: { visitor_id: visitorId(), unit_id: unitId } }).catch(() => {
    tracked.delete(unitId);
  });
}

export interface EnquiryPayload {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  unit_ids?: string[];
  source: "website" | "explorer" | "brochure" | "contact";
  consent: boolean;
  website?: string;
}

/** Send an enquiry; if offline, keep it in a local outbox and flush when back online. */
export async function sendEnquiry(payload: EnquiryPayload): Promise<"sent" | "queued"> {
  const body = { ...payload, visitor_id: visitorId() };
  if (!navigator.onLine) {
    queue(body);
    return "queued";
  }
  try {
    await api("/enquiries", { method: "POST", body });
    return "sent";
  } catch (err) {
    if (err instanceof TypeError) {
      // Network failure (not a validation error): keep it for later.
      queue(body);
      return "queued";
    }
    throw err;
  }
}

function readQueue(): unknown[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as unknown[];
  } catch {
    return [];
  }
}

function queue(body: unknown): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([...readQueue(), body].slice(-20)));
  } catch {
    /* ignore */
  }
}

export async function flushOutbox(): Promise<void> {
  const pending = readQueue();
  if (!pending.length) return;
  const remaining: unknown[] = [];
  for (const body of pending) {
    try {
      await api("/enquiries", { method: "POST", body });
    } catch (err) {
      if (err instanceof TypeError) remaining.push(body);
    }
  }
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  } catch {
    /* ignore */
  }
}
