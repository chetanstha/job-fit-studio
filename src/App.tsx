import { useEffect } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useStore } from "./lib/store";
import { needsFollowUp } from "./lib/util";
import Dashboard from "./pages/Dashboard";
import Analyze from "./pages/Analyze";
import JobDetail from "./pages/JobDetail";
import Tracker from "./pages/Tracker";
import Resumes from "./pages/Resumes";
import SettingsPage from "./pages/Settings";

export default function App() {
  const { data } = useStore();
  const { theme, apiKey } = data.settings;
  const followUps = data.jobs.filter(needsFollowUp).length;
  const { pathname } = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => window.scrollTo(0, 0), [pathname]);

  return (
    <div className="shell">
      <aside className="rail">
        <Link to="/" className="brand">
          Job Fit <span>Studio</span>
        </Link>
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/analyze">Analyze a job</NavLink>
          <NavLink to="/tracker">
            Tracker {followUps > 0 && <span className="badge" title="Applications to follow up on">{followUps}</span>}
          </NavLink>
          <NavLink to="/resumes">Resumes</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
        <div className="rail-foot">
          <Link to="/settings" className={`key-dot ${apiKey ? "ok" : ""}`} style={{ color: "inherit", textDecoration: "none" }}>
            {apiKey ? "AI connected" : "Add API key to use AI"}
          </Link>
          <span>Your data stays in this browser.</span>
        </div>
      </aside>
      <main>
        <div className="page">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analyze" element={<Analyze />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/resumes" element={<Resumes />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
