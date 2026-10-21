import { useCallback, useEffect, useState } from "react";
import { BUSINESS_HINT, fetchNameMap, formatDateTime, isMissingTableError, nameOf, requireSupabase } from "./api";
import type { ProfileReport, SafetyReport } from "./types";

const SAFETY_STATUS: { key: SafetyReport["status"]; label: string }[] = [
  { key: "open", label: "Öppen" },
  { key: "reviewing", label: "Granskas" },
  { key: "resolved", label: "Löst" },
  { key: "dismissed", label: "Avfärdad" },
];

const SAFETY_BADGE: Record<SafetyReport["status"], string> = {
  open: "amber",
  reviewing: "blue",
  resolved: "green",
  dismissed: "gray",
};

export default function ReportsView() {
  const [profileReports, setProfileReports] = useState<ProfileReport[]>([]);
  const [safetyReports, setSafetyReports] = useState<SafetyReport[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    const client = requireSupabase();

    const [profileResult, safetyResult] = await Promise.all([
      client.from("profile_reports").select("*").order("created_at", { ascending: false }).limit(200),
      client.from("safety_reports").select("*").order("created_at", { ascending: false }).limit(200),
    ]);

    if (profileResult.error) {
      setError(profileResult.error.message);
      setLoading(false);
      return;
    }
    const profileRows = (profileResult.data ?? []) as ProfileReport[];
    setProfileReports(profileRows);

    let safetyRows: SafetyReport[] | null = null;
    if (safetyResult.error) {
      if (isMissingTableError(safetyResult.error)) {
        setHint(BUSINESS_HINT);
      } else {
        setError(safetyResult.error.message);
      }
    } else {
      safetyRows = (safetyResult.data ?? []) as SafetyReport[];
      setSafetyReports(safetyRows);
    }

    const ids = [
      ...profileRows.flatMap((row) => [row.reporter_id, row.reported_id]),
      ...(safetyRows ?? []).flatMap((row) => [row.reporter_id, row.reported_id]),
    ];
    setNames(await fetchNameMap(ids));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setSafetyStatus = async (report: SafetyReport, status: SafetyReport["status"]) => {
    setError(null);
    const { error: updateError } = await requireSupabase()
      .from("safety_reports")
      .update({ status })
      .eq("id", report.id);
    if (updateError) setError(updateError.message);
    await load();
  };

  if (loading) {
    return <p className="muted">Laddar…</p>;
  }

  return (
    <section className="stack">
      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <h2>Säkerhetsrapporter</h2>
        {hint && <p className="hint">{hint}</p>}
        {safetyReports && safetyReports.length === 0 && <p className="muted">Inga säkerhetsrapporter.</p>}
        {safetyReports && safetyReports.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Rapportör</th>
                  <th>Rapporterad</th>
                  <th>Anledning</th>
                  <th>Status</th>
                  <th>Skapad</th>
                  <th>Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {safetyReports.map((report) => (
                  <tr key={report.id}>
                    <td>{nameOf(report.reporter_id, names)}</td>
                    <td>{nameOf(report.reported_id, names)}</td>
                    <td className="reason-cell">{report.reason}</td>
                    <td>
                      <span className={`badge ${SAFETY_BADGE[report.status]}`}>
                        {SAFETY_STATUS.find((item) => item.key === report.status)?.label ?? report.status}
                      </span>
                    </td>
                    <td>{formatDateTime(report.created_at)}</td>
                    <td>
                      <div className="action-row">
                        {report.status !== "reviewing" && report.status !== "resolved" && (
                          <button className="btn small" onClick={() => void setSafetyStatus(report, "reviewing")}>
                            Granska
                          </button>
                        )}
                        {report.status !== "resolved" && (
                          <button
                            className="btn small primary"
                            onClick={() => void setSafetyStatus(report, "resolved")}
                          >
                            Lös
                          </button>
                        )}
                        {report.status !== "dismissed" && (
                          <button
                            className="btn small danger"
                            onClick={() => void setSafetyStatus(report, "dismissed")}
                          >
                            Avfärda
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
      </div>

      <div className="card">
        <h2>Profilrapporter</h2>
        {profileReports.length === 0 ? (
          <p className="muted">Inga profilrapporter.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Rapportör</th>
                  <th>Rapporterad profil</th>
                  <th>Anledning</th>
                  <th>Skapad</th>
                </tr>
              </thead>
              <tbody>
                {profileReports.map((report) => (
                  <tr key={report.id}>
                    <td>{nameOf(report.reporter_id, names)}</td>
                    <td>{nameOf(report.reported_id, names)}</td>
                    <td className="reason-cell">{report.reason}</td>
                    <td>{formatDateTime(report.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small">
          Hantera rapporterade medlemmar under Medlemmar (spärra eller dölj profilen).
        </p>
      </div>
    </section>
  );
}
