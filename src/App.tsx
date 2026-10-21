import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import MetricsView from "./admin/MetricsView";
import VerificationQueue from "./admin/VerificationQueue";
import UsersView from "./admin/UsersView";
import ReportsView from "./admin/ReportsView";
import PartnersView from "./admin/PartnersView";
import ChallengesView from "./admin/ChallengesView";
import BookingsView from "./admin/BookingsView";

type AdminView = "metrics" | "verification" | "users" | "reports" | "partners" | "challenges" | "bookings";
type AuthState = "loading" | "signedOut" | "admin";

const NAV: { key: AdminView; label: string; icon: string }[] = [
  { key: "metrics", label: "Översikt", icon: "▦" },
  { key: "verification", label: "Verifiering", icon: "✓" },
  { key: "users", label: "Medlemmar", icon: "☻" },
  { key: "reports", label: "Rapporter", icon: "⚑" },
  { key: "partners", label: "Partners", icon: "⌂" },
  { key: "challenges", label: "Utmaningar", icon: "◈" },
  { key: "bookings", label: "Bokningar", icon: "▤" },
];

const TITLES: Record<AdminView, string> = {
  metrics: "Översikt",
  verification: "Verifieringskö",
  users: "Medlemmar",
  reports: "Rapporter",
  partners: "Partners & erbjudanden",
  challenges: "Utmaningar",
  bookings: "Bokningar",
};

// Dev-läge: hoppa över inloggningen när VITE_ADMIN_BYPASS_AUTH=true i .env.
// Används endast lokalt — sätt aldrig till true i en byggd version.
const BYPASS_AUTH = import.meta.env.VITE_ADMIN_BYPASS_AUTH === "true";

export default function App() {
  const [authState, setAuthState] = useState<AuthState>(BYPASS_AUTH ? "admin" : "loading");
  const [view, setView] = useState<AdminView>("metrics");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  const checkAdmin = useCallback(async () => {
    if (BYPASS_AUTH) return;
    if (!supabase) {
      setAuthState("signedOut");
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setAuthState("signedOut");
      return;
    }
    const { data: isAdmin, error } = await supabase.rpc("is_admin");
    if (error || isAdmin !== true) {
      await supabase.auth.signOut();
      setLoginError(
        error && `${error.message}`.includes("is_admin")
          ? "Admin-rollen saknas i databasen. Kör supabase/admin-panel.sql i SQL Editor först."
          : "Det här kontot har inte admin-behörighet."
      );
      setAuthState("signedOut");
      return;
    }
    setAdminEmail(data.session.user.email ?? "");
    setAuthState("admin");
  }, []);

  useEffect(() => {
    void checkAdmin();
  }, [checkAdmin]);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setLoginError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setLoginError("Fel e-post eller lösenord.");
      return;
    }
    await checkAdmin();
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setAuthState("signedOut");
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <p className="kicker">JANNAHU ADMIN</p>
          <h1>Supabase saknas</h1>
          <p className="muted">
            Skapa en .env i projektroten med VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY och starta om
            dev-servern.
          </p>
        </div>
      </div>
    );
  }

  if (authState === "loading") {
    return (
      <div className="login-screen">
        <div className="login-card">
          <p className="muted">Laddar…</p>
        </div>
      </div>
    );
  }

  if (authState === "signedOut") {
    return (
      <div className="login-screen">
        <form className="login-card" onSubmit={signIn}>
          <p className="kicker">JANNAHU ADMIN</p>
          <h1>Logga in</h1>
          <p className="muted">Endast konton med admin-behörighet kan använda kontrollpanelen.</p>
          <label className="field">
            <span>E-post</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label className="field">
            <span>Lösenord</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {loginError && <p className="error-text">{loginError}</p>}
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "Loggar in…" : "Logga in"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("metrics")}>
          <span className="brand-mark">J</span>
          <div className="brand-text">
            <strong>Jannahu</strong>
            <span>Kontrollpanel</span>
          </div>
        </button>
        <nav className="nav">
          {NAV.map((item) => (
            <button
              key={item.key}
              className={`nav-item${view === item.key ? " active" : ""}`}
              onClick={() => setView(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="sidebar-email">{BYPASS_AUTH ? "Dev-läge" : adminEmail}</span>
          {!BYPASS_AUTH && (
            <button className="btn ghost" onClick={() => void signOut()}>
              Logga ut
            </button>
          )}
        </div>
      </aside>
      <main className="content">
        <header className="content-header">
          <h1>{TITLES[view]}</h1>
        </header>
        {view === "metrics" && <MetricsView />}
        {view === "verification" && <VerificationQueue />}
        {view === "users" && <UsersView />}
        {view === "reports" && <ReportsView />}
        {view === "partners" && <PartnersView />}
        {view === "challenges" && <ChallengesView />}
        {view === "bookings" && <BookingsView />}
      </main>
    </div>
  );
}
