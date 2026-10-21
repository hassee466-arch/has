import { useEffect, useState } from "react";
import { BUSINESS_HINT, formatSek, isMissingTableError, requireSupabase } from "./api";

type Metrics = {
  members: number | null;
  newMembers30d: number | null;
  verified: number | null;
  verificationQueue: number | null;
  suspended: number | null;
  subscriptionsByTier: Record<string, number> | null;
  bookingsByStatus: Record<string, number> | null;
  revenueSek: number | null;
  subsidySek: number | null;
  commissionSek: number | null;
};

const TIER_LABEL: Record<string, string> = {
  free: "Free",
  plus: "Plus",
  premium: "Premium",
  adventure: "Adventure",
};

const BOOKING_LABEL: Record<string, string> = {
  proposed: "Väntar",
  confirmed: "Bekräftade",
  paid: "Betalda",
  completed: "Genomförda",
  cancelled: "Avbokade",
  no_show: "Uteblev",
};

export default function MetricsView() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const client = requireSupabase();

      const count = async (
        table: string,
        build?: (query: any) => any
      ): Promise<number | null> => {
        let query = client.from(table).select("*", { count: "exact", head: true });
        if (build) query = build(query);
        const { count: value, error } = await query;
        if (error) {
          if (isMissingTableError(error)) setHint(BUSINESS_HINT);
          return null;
        }
        return value ?? 0;
      };

      const groupBy = async (table: string, column: string): Promise<Record<string, number> | null> => {
        const { data, error } = await client.from(table).select(column);
        if (error) {
          if (isMissingTableError(error)) setHint(BUSINESS_HINT);
          return null;
        }
        const result: Record<string, number> = {};
        const rows = (data ?? []) as unknown as Record<string, unknown>[];
        for (const row of rows) {
          const key = String(row[column] ?? "okänd");
          result[key] = (result[key] ?? 0) + 1;
        }
        return result;
      };

      const sumWhere = async (
        table: string,
        column: string,
        build?: (query: any) => any
      ): Promise<number | null> => {
        let query = client.from(table).select(column);
        if (build) query = build(query);
        const { data, error } = await query;
        if (error) {
          if (isMissingTableError(error)) setHint(BUSINESS_HINT);
          return null;
        }
        const rows = (data ?? []) as unknown as Record<string, unknown>[];
        return rows.reduce((acc, row) => acc + (Number(row[column]) || 0), 0);
      };

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        members,
        newMembers30d,
        verified,
        verificationQueue,
        suspended,
        subscriptionsByTier,
        bookingsByStatus,
        revenueSek,
        subsidySek,
        commissionSek,
      ] = await Promise.all([
        count("profiles"),
        count("profiles", (q) => q.gte("created_at", thirtyDaysAgo)),
        count("identity_verifications", (q) => q.eq("status", "verified")),
        count("identity_verifications", (q) => q.in("status", ["pending", "manual_review", "needs_retry"])),
        count("profiles", (q) => q.eq("is_suspended", true)),
        groupBy("subscriptions", "tier"),
        groupBy("bookings", "status"),
        sumWhere("payments", "amount_sek", (q) => q.eq("status", "completed")),
        sumWhere("subsidy_ledger", "amount_sek", (q) => q.eq("entry_type", "subsidy_grant")),
        sumWhere("subsidy_ledger", "amount_sek", (q) => q.eq("entry_type", "partner_commission")),
      ]);

      setMetrics({
        members,
        newMembers30d,
        verified,
        verificationQueue,
        suspended,
        subscriptionsByTier,
        bookingsByStatus,
        revenueSek,
        subsidySek,
        commissionSek,
      });
    };

    void load();
  }, []);

  const stat = (label: string, value: number | null | undefined, accent?: "amber" | "green" | "red") => (
    <div className={`stat-card${accent ? ` accent-${accent}` : ""}`}>
      <span className="stat-value">{value === null || value === undefined ? (value === null ? "–" : "…") : value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );

  return (
    <section className="stack">
      {hint && <p className="hint">{hint}</p>}
      <div className="stat-grid">
        {stat("Medlemmar totalt", metrics?.members)}
        {stat("Nya medlemmar (30 dagar)", metrics?.newMembers30d, "green")}
        {stat("Verifierade", metrics?.verified, "green")}
        {stat("I verifieringskön", metrics?.verificationQueue, "amber")}
        {stat("Spärrade konton", metrics?.suspended, "red")}
        {stat("Intäkter (betalda)", metrics?.revenueSek === null ? null : metrics?.revenueSek, undefined)}
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-value">{metrics ? formatSek(metrics.revenueSek) : "…"}</span>
          <span className="stat-label">Intäkter (genomförda betalningar)</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{metrics ? formatSek(metrics.subsidySek) : "…"}</span>
          <span className="stat-label">Utbetalda dejtbidrag</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{metrics ? formatSek(metrics.commissionSek) : "…"}</span>
          <span className="stat-label">Partnerprovision</span>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h2>Prenumerationer per nivå</h2>
          {metrics?.subscriptionsByTier ? (
            <div className="chip-row">
              {Object.entries(TIER_LABEL).map(([tier, label]) => (
                <span key={tier} className="chip">
                  {label}: <strong>{metrics.subscriptionsByTier?.[tier] ?? 0}</strong>
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">Ingen data ännu.</p>
          )}
        </div>
        <div className="card">
          <h2>Bokningar per status</h2>
          {metrics?.bookingsByStatus ? (
            <div className="chip-row">
              {Object.entries(BOOKING_LABEL).map(([status, label]) => (
                <span key={status} className="chip">
                  {label}: <strong>{metrics.bookingsByStatus?.[status] ?? 0}</strong>
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">Ingen data ännu.</p>
          )}
        </div>
      </div>
    </section>
  );
}
