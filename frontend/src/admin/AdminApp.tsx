import { lazy, Suspense, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { PageFallback } from "../components/layout/PublicLayout";
import { Logo } from "../components/ui/Logo";
import { ApiError } from "../lib/api";
import { useDocumentTitle } from "../lib/hooks";
import { AuthProvider, useAuth } from "./auth";
import { Btn, ErrorNote, inputCls } from "./ui";

const Dashboard = lazy(() => import("./Dashboard"));
const Leads = lazy(() => import("./Leads"));
const Pipeline = lazy(() => import("./Pipeline"));
const Inventory = lazy(() => import("./Inventory"));
const ProjectsCms = lazy(() => import("./ProjectsCms"));
const PostsCms = lazy(() => import("./PostsCms"));

const NAV = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/leads", label: "Leads" },
  { to: "/admin/pipeline", label: "Pipeline" },
  { to: "/admin/inventory", label: "Inventory & pricing" },
  { to: "/admin/projects", label: "Projects & buildings" },
  { to: "/admin/journal", label: "Journal" },
];

export default function AdminApp() {
  return (
    <AuthProvider>
      <AdminRoutes />
    </AuthProvider>
  );
}

function AdminRoutes() {
  const { user, ready } = useAuth();
  const location = useLocation();
  useEffect(() => {
    // Back panel must never be indexed.
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.append(meta);
    return () => meta.remove();
  }, []);

  if (!ready) return <PageFallback />;
  if (!user) {
    return location.pathname === "/admin/login" ? <Login /> : <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  return (
    <Shell>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="leads" element={<Leads />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="projects" element={<ProjectsCms />} />
          <Route path="journal" element={<PostsCms />} />
          <Route path="login" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  return (
    <div className="min-h-screen bg-ink-950 text-bone lg:grid lg:grid-cols-[240px_1fr]">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded focus:bg-gold focus:px-4 focus:py-2 focus:text-ink-950">
        Skip to content
      </a>
      <div className="flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
        <Logo className="scale-90" />
        <Btn variant="ghost" aria-expanded={open} aria-controls="admin-nav" onClick={() => setOpen((o) => !o)}>
          Menu
        </Btn>
      </div>
      <aside id="admin-nav" className={`${open ? "block" : "hidden"} border-b border-line bg-ink-900 lg:sticky lg:top-0 lg:block lg:h-screen lg:border-b-0 lg:border-r`}>
        <div className="hidden px-5 py-6 lg:block">
          <Logo />
          <p className="mt-1 text-xs text-stone-400">Sales back panel</p>
        </div>
        <nav aria-label="Back panel" className="px-3 py-3">
          <ul className="space-y-1">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm ${isActive ? "bg-ink-800 text-gold-soft" : "text-stone-300 hover:bg-ink-800 hover:text-bone"}`
                  }
                >
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-line px-5 py-4 text-sm lg:absolute lg:inset-x-0 lg:bottom-0">
          <p className="truncate text-bone">{user?.name}</p>
          <p className="truncate text-xs text-stone-400">{user?.email} · {user?.role}</p>
          <div className="mt-3 flex gap-2">
            <Btn variant="ghost" className="!px-2" onClick={logout}>Sign out</Btn>
            <a href="/" className="inline-flex min-h-9 items-center rounded-md px-2 text-sm text-stone-300 hover:text-bone">View site</a>
          </div>
        </div>
      </aside>
      <main id="admin-main" tabIndex={-1} className="min-w-0 px-4 py-6 outline-none sm:px-8 sm:py-8">
        {children}
      </main>
    </div>
  );
}

function Login() {
  useDocumentTitle("Sign in · Back panel");
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== "/admin/login" ? from : "/admin", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err : new Error("Couldn't reach the server."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-lg border border-line bg-ink-900 p-8">
        <div>
          <Logo />
          <h1 className="mt-6 font-sans text-xl font-semibold">Sign in to the back panel</h1>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-stone-300">Email</span>
          <input type="email" required autoComplete="username" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-stone-300">Password</span>
          <input type="password" required autoComplete="current-password" maxLength={72} className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <ErrorNote error={error} />
        <Btn type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Btn>
      </form>
    </div>
  );
}
