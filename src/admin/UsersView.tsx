import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDate, requireSupabase } from "./api";
import type { Profile } from "./types";

export default function UsersView() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [verificationByUser, setVerificationByUser] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const client = requireSupabase();
    const [profilesResult, verificationsResult] = await Promise.all([
      client
        .from("profiles")
        .select("id, display_name, age, city, profession, is_visible, is_admin, is_suspended, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      client.from("identity_verifications").select("user_id, status"),
    ]);
    if (profilesResult.error) {
      setError(profilesResult.error.message);
      setLoading(false);
      return;
    }
    setProfiles((profilesResult.data ?? []) as Profile[]);
    const map = new Map<string, string>();
    for (const row of verificationsResult.data ?? []) {
      map.set(row.user_id as string, row.status as string);
    }
    setVerificationByUser(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return profiles;
    return profiles.filter((profile) =>
      [profile.display_name, profile.city, profile.profession]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [profiles, search]);

  const toggle = async (profile: Profile, field: "is_suspended" | "is_visible") => {
    setActingId(profile.id);
    setError(null);
    const { error: updateError } = await requireSupabase()
      .from("profiles")
      .update({ [field]: !profile[field] })
      .eq("id", profile.id);
    if (updateError) setError(updateError.message);
    setActingId(null);
    await load();
  };

  return (
    <section className="stack">
      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Sök namn, stad eller yrke…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <span className="muted">{filtered.length} medlemmar</span>
      </div>
      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p className="muted">Laddar…</p>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Namn</th>
                <th>Ålder</th>
                <th>Stad</th>
                <th>Status</th>
                <th>Medlem sedan</th>
                <th>Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((profile) => (
                <tr key={profile.id} className={profile.is_suspended ? "row-muted" : undefined}>
                  <td>
                    <strong>{profile.display_name || "Namnlös"}</strong>
                    {profile.is_admin && <span className="badge blue">Admin</span>}
                  </td>
                  <td>{profile.age ?? "–"}</td>
                  <td>{profile.city ?? "–"}</td>
                  <td>
                    <div className="badge-row">
                      {verificationByUser.get(profile.id) === "verified" && (
                        <span className="badge green">Verifierad</span>
                      )}
                      {profile.is_suspended && <span className="badge red">Spärrad</span>}
                      {!profile.is_visible && <span className="badge gray">Dold</span>}
                    </div>
                  </td>
                  <td>{formatDate(profile.created_at)}</td>
                  <td>
                    <div className="action-row">
                      <button
                        className={`btn small${profile.is_suspended ? "" : " danger"}`}
                        disabled={actingId === profile.id || profile.is_admin}
                        onClick={() => void toggle(profile, "is_suspended")}
                      >
                        {profile.is_suspended ? "Häv spärr" : "Spärra"}
                      </button>
                      <button
                        className="btn small"
                        disabled={actingId === profile.id}
                        onClick={() => void toggle(profile, "is_visible")}
                      >
                        {profile.is_visible ? "Dölj" : "Visa"}
                      </button>
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
