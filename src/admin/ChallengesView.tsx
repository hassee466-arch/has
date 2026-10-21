import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { BUSINESS_HINT, formatSek, isMissingTableError, requireSupabase } from "./api";
import type { ChallengeRow, ChallengeStageRow } from "./types";

const CATEGORIES: { key: string; label: string }[] = [
  { key: "mystery", label: "Mysterieuppdrag" },
  { key: "competition", label: "Tävling" },
  { key: "creative", label: "Skapa tillsammans" },
  { key: "adventure", label: "Äventyr" },
  { key: "connection", label: "Kontakt" },
  { key: "teamwork", label: "Samarbete" },
];

const emptyForm = {
  id: "",
  title: "",
  category: "connection",
  level: "1",
  duration_minutes: "60",
  member_price_sek: "",
  area: "",
  description: "",
  goal: "",
  reward: "",
};

export default function ChallengesView() {
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [partnerNames, setPartnerNames] = useState<Map<string, string>>(new Map());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stages, setStages] = useState<ChallengeStageRow[]>([]);
  const [stageForm, setStageForm] = useState({ title: "", description: "" });
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const client = requireSupabase();
    const [challengeResult, partnerResult] = await Promise.all([
      client.from("challenges").select("*").order("category").order("title"),
      client.from("partners").select("id, name"),
    ]);
    if (challengeResult.error) {
      setError(
        isMissingTableError(challengeResult.error) ? BUSINESS_HINT : challengeResult.error.message
      );
      setLoading(false);
      return;
    }
    setChallenges((challengeResult.data ?? []) as ChallengeRow[]);
    const map = new Map<string, string>();
    for (const row of partnerResult.data ?? []) {
      map.set(row.id as string, row.name as string);
    }
    setPartnerNames(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadStages = useCallback(async (challengeId: string) => {
    const { data, error: stageError } = await requireSupabase()
      .from("challenge_stages")
      .select("*")
      .eq("challenge_id", challengeId)
      .order("stage_number");
    if (!stageError) setStages((data ?? []) as ChallengeStageRow[]);
  }, []);

  const expand = async (challengeId: string) => {
    if (expandedId === challengeId) {
      setExpandedId(null);
      setStages([]);
      return;
    }
    setExpandedId(challengeId);
    await loadStages(challengeId);
  };

  const addChallenge = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const { error: insertError } = await requireSupabase().from("challenges").insert({
      id: form.id.trim(),
      title: form.title.trim(),
      category: form.category,
      level: Number(form.level),
      duration_minutes: Number(form.duration_minutes),
      member_price_sek: form.member_price_sek === "" ? null : Number(form.member_price_sek),
      area: form.area.trim() || null,
      description: form.description.trim(),
      goal: form.goal.trim() || null,
      reward: form.reward.trim() || null,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    await load();
  };

  const toggleActive = async (challenge: ChallengeRow) => {
    const { error: updateError } = await requireSupabase()
      .from("challenges")
      .update({ is_active: !challenge.is_active })
      .eq("id", challenge.id);
    if (updateError) setError(updateError.message);
    await load();
  };

  const addStage = async (event: FormEvent) => {
    event.preventDefault();
    if (!expandedId) return;
    const nextNumber = stages.reduce((max, stage) => Math.max(max, stage.stage_number), 0) + 1;
    const { error: insertError } = await requireSupabase().from("challenge_stages").insert({
      challenge_id: expandedId,
      stage_number: nextNumber,
      title: stageForm.title.trim(),
      description: stageForm.description.trim(),
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setStageForm({ title: "", description: "" });
    await loadStages(expandedId);
  };

  const removeStage = async (stage: ChallengeStageRow) => {
    const { error: deleteError } = await requireSupabase()
      .from("challenge_stages")
      .delete()
      .eq("id", stage.id);
    if (deleteError) setError(deleteError.message);
    if (expandedId) await loadStages(expandedId);
  };

  if (loading) {
    return <p className="muted">Laddar…</p>;
  }

  return (
    <section className="stack">
      {error && <p className="error-text">{error}</p>}
      <div className="card">
        <div className="card-header">
          <h2>Utmaningar</h2>
          <button className="btn small primary" onClick={() => setShowForm((value) => !value)}>
            {showForm ? "Avbryt" : "Ny utmaning"}
          </button>
        </div>
        {showForm && (
          <form className="form-grid" onSubmit={addChallenge}>
            <label className="field">
              <span>ID (unikt, t.ex. cafe-mystery) *</span>
              <input
                value={form.id}
                onChange={(event) => setForm({ ...form, id: event.target.value })}
                pattern="[a-z0-9\-]+"
                required
              />
            </label>
            <label className="field">
              <span>Titel *</span>
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Kategori</span>
              <select
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              >
                {CATEGORIES.map((category) => (
                  <option key={category.key} value={category.key}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Nivå</span>
              <select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>
                <option value="1">1 — Lätt</option>
                <option value="2">2 — Medel</option>
                <option value="3">3 — Avancerad</option>
              </select>
            </label>
            <label className="field">
              <span>Längd (minuter) *</span>
              <input
                type="number"
                min="5"
                value={form.duration_minutes}
                onChange={(event) => setForm({ ...form, duration_minutes: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Medlemspris (kr, tomt = gratis)</span>
              <input
                type="number"
                min="0"
                value={form.member_price_sek}
                onChange={(event) => setForm({ ...form, member_price_sek: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Område</span>
              <input
                value={form.area}
                onChange={(event) => setForm({ ...form, area: event.target.value })}
                placeholder="Södermalm…"
              />
            </label>
            <label className="field span-2">
              <span>Beskrivning *</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Mål</span>
              <input value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} />
            </label>
            <label className="field">
              <span>Belöning</span>
              <input
                value={form.reward}
                onChange={(event) => setForm({ ...form, reward: event.target.value })}
              />
            </label>
            <button className="btn primary" type="submit">
              Spara utmaning
            </button>
          </form>
        )}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Titel</th>
                <th>Kategori</th>
                <th>Nivå</th>
                <th>Längd</th>
                <th>Pris</th>
                <th>Partner</th>
                <th>Aktiv</th>
                <th>Steg</th>
              </tr>
            </thead>
            <tbody>
              {challenges.map((challenge) => (
                <>
                  <tr key={challenge.id} className={challenge.is_active ? undefined : "row-muted"}>
                    <td>
                      <strong>{challenge.title}</strong>
                      <br />
                      <span className="muted small">
                        {challenge.area ?? ""} · {challenge.id}
                      </span>
                    </td>
                    <td>{CATEGORIES.find((category) => category.key === challenge.category)?.label ?? challenge.category}</td>
                    <td>{challenge.level}</td>
                    <td>{challenge.duration_minutes} min</td>
                    <td>{challenge.member_price_sek === null ? "Gratis" : formatSek(challenge.member_price_sek)}</td>
                    <td>{challenge.partner_id ? partnerNames.get(challenge.partner_id) ?? "–" : "–"}</td>
                    <td>
                      <button className="btn small" onClick={() => void toggleActive(challenge)}>
                        {challenge.is_active ? "Aktiv" : "Inaktiv"}
                      </button>
                    </td>
                    <td>
                      <button className="btn small" onClick={() => void expand(challenge.id)}>
                        {expandedId === challenge.id ? "Stäng" : "Visa"}
                      </button>
                    </td>
                  </tr>
                  {expandedId === challenge.id && (
                    <tr key={`${challenge.id}-stages`} className="stage-row">
                      <td colSpan={8}>
                        <div className="stage-editor">
                          <h3>Steg i uppdraget</h3>
                          {stages.length === 0 && <p className="muted">Inga steg ännu.</p>}
                          <ol className="stage-list">
                            {stages.map((stage) => (
                              <li key={stage.id}>
                                <strong>{stage.title}</strong>
                                <span className="muted"> {stage.description}</span>
                                <button
                                  className="btn small danger"
                                  onClick={() => void removeStage(stage)}
                                >
                                  Ta bort
                                </button>
                              </li>
                            ))}
                          </ol>
                          <form className="stage-form" onSubmit={addStage}>
                            <input
                              placeholder="Stegtitel *"
                              value={stageForm.title}
                              onChange={(event) => setStageForm({ ...stageForm, title: event.target.value })}
                              required
                            />
                            <input
                              placeholder="Beskrivning *"
                              value={stageForm.description}
                              onChange={(event) =>
                                setStageForm({ ...stageForm, description: event.target.value })
                              }
                              required
                            />
                            <button className="btn small primary" type="submit">
                              Lägg till steg
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
