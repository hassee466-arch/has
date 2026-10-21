import { useCallback, useEffect, useState } from "react";
import { fetchNameMap, formatDateTime, nameOf, requireSupabase } from "./api";
import type { Verification, VerificationStatus } from "./types";

const STATUS_LABEL: Record<VerificationStatus, string> = {
  pending: "Väntar",
  manual_review: "Manuell granskning",
  needs_retry: "Behöver göras om",
  verified: "Verifierad",
  rejected: "Avvisad",
};

const STATUS_BADGE: Record<VerificationStatus, string> = {
  pending: "amber",
  manual_review: "blue",
  needs_retry: "amber",
  verified: "green",
  rejected: "red",
};

export default function VerificationQueue() {
  const [rows, setRows] = useState<Verification[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const client = requireSupabase();
    let query = client
      .from("identity_verifications")
      .select("*")
      .order("updated_at", { ascending: false });
    if (!showAll) {
      query = query.in("status", ["pending", "manual_review", "needs_retry"]);
    }
    const { data, error: loadError } = await query;
    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }
    const verifications = (data ?? []) as Verification[];
    setRows(verifications);
    setNames(await fetchNameMap(verifications.map((row) => row.user_id)));
    setLoading(false);
  }, [showAll]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (userId: string, decision: "verified" | "rejected" | "needs_retry") => {
    setActingId(userId);
    setError(null);
    const now = new Date().toISOString();
    const updates =
      decision === "verified"
        ? { status: "verified", verified_at: now, review_answer: "GREEN", updated_at: now }
        : decision === "rejected"
          ? { status: "rejected", review_answer: "RED", updated_at: now }
          : { status: "needs_retry", review_answer: null, updated_at: now };
    const { error: updateError } = await requireSupabase()
      .from("identity_verifications")
      .update(updates)
      .eq("user_id", userId);
    if (updateError) setError(updateError.message);
    setActingId(null);
    await load();
  };

  return (
    <section className="stack">
      <div className="toolbar">
        <p className="muted">
          Granska inkomna identitetsverifieringar. Beslut skrivs direkt till databasen och styr om
          medlemmen kan använda appen.
        </p>
        <label className="toggle">
          <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />
          Visa även avslutade
        </label>
      </div>
      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p className="muted">Laddar…</p>
      ) : rows.length === 0 ? (
        <div className="card empty-state">
          <p>Kön är tom. Inga verifieringar väntar på beslut.</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Medlem</th>
                <th>Status</th>
                <th>Leverantör</th>
                <th>Ärende-ID</th>
                <th>Uppdaterad</th>
                <th>Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user_id}>
                  <td>
                    <strong>{nameOf(row.user_id, names)}</strong>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[row.status]}`}>{STATUS_LABEL[row.status]}</span>
                  </td>
                  <td>{row.provider}</td>
                  <td className="mono">{row.applicant_id ?? "–"}</td>
                  <td>{formatDateTime(row.updated_at)}</td>
                  <td>
                    <div className="action-row">
                      {row.status !== "verified" && (
                        <button
                          className="btn small primary"
                          disabled={actingId === row.user_id}
                          onClick={() => void decide(row.user_id, "verified")}
                        >
                          Godkänn
                        </button>
                      )}
                      {row.status !== "needs_retry" && row.status !== "verified" && (
                        <button
                          className="btn small"
                          disabled={actingId === row.user_id}
                          onClick={() => void decide(row.user_id, "needs_retry")}
                        >
                          Be om nytt försök
                        </button>
                      )}
                      {row.status !== "rejected" && (
                        <button
                          className="btn small danger"
                          disabled={actingId === row.user_id}
                          onClick={() => void decide(row.user_id, "rejected")}
                        >
                          Avvisa
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
