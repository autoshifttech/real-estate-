import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider, useSearchParams } from "react-router-dom";
import { PageFallback, PublicLayout } from "./components/layout/PublicLayout";
import { SiteHeader } from "./components/layout/SiteHeader";
import Home from "./pages/Home";

const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Explorer = lazy(() => import("./explorer/ExplorerPage"));
const Journal = lazy(() => import("./pages/Journal"));
const JournalPost = lazy(() => import("./pages/JournalPost"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminApp = lazy(() => import("./admin/AdminApp"));

/** The explorer keeps the site header (except in kiosk mode) but drops the footer. */
function ExplorerRoute() {
  const [params] = useSearchParams();
  return (
    <>
      {params.get("kiosk") !== "1" && <SiteHeader />}
      <Explorer />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/projects", element: <Projects /> },
      { path: "/projects/:slug", element: <ProjectDetail /> },
      { path: "/journal", element: <Journal /> },
      { path: "/journal/:slug", element: <JournalPost /> },
      { path: "/blog/*", element: <Navigate to="/journal" replace /> },
      { path: "/contact", element: <Contact /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    element: <PublicLayout chrome={false} />,
    children: [{ path: "/explorer/:slug", element: <ExplorerRoute /> }],
  },
  {
    path: "/admin/*",
    element: (
      <Suspense fallback={<PageFallback />}>
        <AdminApp />
      </Suspense>
    ),
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
