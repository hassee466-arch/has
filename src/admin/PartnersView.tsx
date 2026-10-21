import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { BUSINESS_HINT, formatSek, isMissingTableError, requireSupabase } from "./api";
import type { Partner, PartnerOffer } from "./types";

const PARTNER_STATUS: { key: Partner["status"]; label: string }[] = [
  { key: "active", label: "Aktiv" },
  { key: "paused", label: "Pausad" },
  { key: "pending", label: "Väntar" },
];

const emptyPartnerForm = { name: "", category: "", city: "", contact_email: "", commission_pct: "10" };
const emptyOfferForm = {
  title: "",
  challenge_id: "",
  list_price_sek: "",
  partner_price_sek: "",
  member_price_sek: "",
  max_subsidy_sek: "0",
};

export default function PartnersView() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [offers, setOffers] = useState<PartnerOffer[]>([]);
  const [challenges, setChallenges] = useState<{ id: string; title: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [partnerForm, setPartnerForm] = useState(emptyPartnerForm);
  const [offerForm, setOfferForm] = useState(emptyOfferForm);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const client = requireSupabase();
    const [partnerResult, challengeResult] = await Promise.all([
      client.from("partners").select("*").order("name"),
      client.from("challenges").select("id, title").order("title"),
    ]);
    if (partnerResult.error) {
      setError(isMissingTableError(partnerResult.error) ? BUSINESS_HINT : partnerResult.error.message);
      setLoading(false);
      return;
    }
    setPartners((partnerResult.data ?? []) as Partner[]);
    setChallenges((challengeResult.data ?? []) as { id: string; title: string }[]);
    setLoading(false);
  }, []);

  const loadOffers = useCallback(async (partnerId: string) => {
    const { data, error: offerError } = await requireSupabase()
      .from("partner_offers")
      .select("*")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false });
    if (!offerError) setOffers((data ?? []) as PartnerOffer[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedId) void loadOffers(selectedId);
    else setOffers([]);
  }, [selectedId, loadOffers]);

  const addPartner = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const { error: insertError } = await requireSupabase().from("partners").insert({
      name: partnerForm.name.trim(),
      category: partnerForm.category.trim() || null,
      city: partnerForm.city.trim() || null,
      contact_email: partnerForm.contact_email.trim() || null,
      commission_rate: Number(partnerForm.commission_pct) / 100,
      status: "active",
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setPartnerForm(emptyPartnerForm);
    setShowPartnerForm(false);
    await load();
  };

  const setPartnerStatus = async (partner: Partner, status: Partner["status"]) => {
    const { error: updateError } = await requireSupabase()
      .from("partners")
      .update({ status })
      .eq("id", partner.id);
    if (updateError) setError(updateError.message);
    await load();
  };

  const addOffer = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId) return;
    setError(null);
    const { error: insertError } = await requireSupabase().from("partner_offers").insert({
      partner_id: selectedId,
      challenge_id: offerForm.challenge_id || null,
      title: offerForm.title.trim(),
      list_price_sek: Number(offerForm.list_price_sek),
      partner_price_sek: Number(offerForm.partner_price_sek),
      member_price_sek: Number(offerForm.member_price_sek),
      max_subsidy_sek: Number(offerForm.max_subsidy_sek) || 0,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setOfferForm(emptyOfferForm);
    setShowOfferForm(false);
    await loadOffers(selectedId);
  };

  const toggleOffer = async (offer: PartnerOffer) => {
    const { error: updateError } = await requireSupabase()
      .from("partner_offers")
      .update({ is_active: !offer.is_active })
      .eq("id", offer.id);
    if (updateError) setError(updateError.message);
    if (selectedId) await loadOffers(selectedId);
  };

  const removeOffer = async (offer: PartnerOffer) => {
    const { error: deleteError } = await requireSupabase()
      .from("partner_offers")
      .delete()
      .eq("id", offer.id);
    if (deleteError) setError(deleteError.message);
    if (selectedId) await loadOffers(selectedId);
  };

  const selectedPartner = partners.find((partner) => partner.id === selectedId) ?? null;

  if (loading) {
    return <p className="muted">Laddar…</p>;
  }

  return (
    <section className="stack">
      {error && <p className="error-text">{error}</p>}
      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <h2>Partners</h2>
            <button className="btn small primary" onClick={() => setShowPartnerForm((value) => !value)}>
              {showPartnerForm ? "Avbryt" : "Ny partner"}
            </button>
          </div>
          {showPartnerForm && (
            <form className="form-grid" onSubmit={addPartner}>
              <label className="field">
                <span>Namn *</span>
                <input
                  value={partnerForm.name}
                  onChange={(event) => setPartnerForm({ ...partnerForm, name: event.target.value })}
                  required
                />
              </label>
              <label className="field">
                <span>Kategori</span>
                <input
                  value={partnerForm.category}
                  onChange={(event) => setPartnerForm({ ...partnerForm, category: event.target.value })}
                  placeholder="Café, Restaurang…"
                />
              </label>
              <label className="field">
                <span>Stad</span>
                <input
                  value={partnerForm.city}
                  onChange={(event) => setPartnerForm({ ...partnerForm, city: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Kontakt-e-post</span>
                <input
                  type="email"
                  value={partnerForm.contact_email}
                  onChange={(event) => setPartnerForm({ ...partnerForm, contact_email: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Provision %</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={partnerForm.commission_pct}
                  onChange={(event) => setPartnerForm({ ...partnerForm, commission_pct: event.target.value })}
                  required
                />
              </label>
              <button className="btn primary" type="submit">
                Spara partner
              </button>
            </form>
          )}
          {partners.length === 0 ? (
            <p className="muted">Inga partners ännu. Lägg till den första.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Namn</th>
                    <th>Kategori</th>
                    <th>Provision</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((partner) => (
                    <tr
                      key={partner.id}
                      className={`clickable${selectedId === partner.id ? " row-selected" : ""}`}
                      onClick={() => setSelectedId(partner.id)}
                    >
                      <td>
                        <strong>{partner.name}</strong>
                        <br />
                        <span className="muted small">{partner.city ?? ""}</span>
                      </td>
                      <td>{partner.category ?? "–"}</td>
                      <td>{Math.round(partner.commission_rate * 1000) / 10} %</td>
                      <td>
                        <select
                          value={partner.status}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) =>
                            void setPartnerStatus(partner, event.target.value as Partner["status"])
                          }
                        >
                          {PARTNER_STATUS.map((status) => (
                            <option key={status.key} value={status.key}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2>{selectedPartner ? `Erbjudanden — ${selectedPartner.name}` : "Erbjudanden"}</h2>
            {selectedPartner && (
              <button className="btn small primary" onClick={() => setShowOfferForm((value) => !value)}>
                {showOfferForm ? "Avbryt" : "Nytt erbjudande"}
              </button>
            )}
          </div>
          {!selectedPartner ? (
            <p className="muted">Välj en partner till vänster för att se och skapa erbjudanden.</p>
          ) : (
            <>
              {showOfferForm && (
                <form className="form-grid" onSubmit={addOffer}>
                  <label className="field">
                    <span>Titel *</span>
                    <input
                      value={offerForm.title}
                      onChange={(event) => setOfferForm({ ...offerForm, title: event.target.value })}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Utmaning</span>
                    <select
                      value={offerForm.challenge_id}
                      onChange={(event) => setOfferForm({ ...offerForm, challenge_id: event.target.value })}
                    >
                      <option value="">Ingen koppling</option>
                      {challenges.map((challenge) => (
                        <option key={challenge.id} value={challenge.id}>
                          {challenge.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Listpris (kr) *</span>
                    <input
                      type="number"
                      min="0"
                      value={offerForm.list_price_sek}
                      onChange={(event) => setOfferForm({ ...offerForm, list_price_sek: event.target.value })}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Partnerpris (kr) *</span>
                    <input
                      type="number"
                      min="0"
                      value={offerForm.partner_price_sek}
                      onChange={(event) =>
                        setOfferForm({ ...offerForm, partner_price_sek: event.target.value })
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Medlemspris (kr) *</span>
                    <input
                      type="number"
                      min="0"
                      value={offerForm.member_price_sek}
                      onChange={(event) => setOfferForm({ ...offerForm, member_price_sek: event.target.value })}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Max bidrag (kr)</span>
                    <input
                      type="number"
                      min="0"
                      value={offerForm.max_subsidy_sek}
                      onChange={(event) => setOfferForm({ ...offerForm, max_subsidy_sek: event.target.value })}
                    />
                  </label>
                  <button className="btn primary" type="submit">
                    Spara erbjudande
                  </button>
                </form>
              )}
              {offers.length === 0 ? (
                <p className="muted">Inga erbjudanden för den här partnern ännu.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Titel</th>
                        <th>Medlemspris</th>
                        <th>Partnerpris</th>
                        <th>Max bidrag</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {offers.map((offer) => (
                        <tr key={offer.id} className={offer.is_active ? undefined : "row-muted"}>
                          <td>
                            <strong>{offer.title}</strong>
                            {offer.challenge_id && (
                              <>
                                <br />
                                <span className="muted small">
                                  {challenges.find((challenge) => challenge.id === offer.challenge_id)?.title ??
                                    offer.challenge_id}
                                </span>
                              </>
                            )}
                          </td>
                          <td>{formatSek(offer.member_price_sek)}</td>
                          <td>{formatSek(offer.partner_price_sek)}</td>
                          <td>{formatSek(offer.max_subsidy_sek)}</td>
                          <td>
                            <button className="btn small" onClick={() => void toggleOffer(offer)}>
                              {offer.is_active ? "Aktiv" : "Inaktiv"}
                            </button>
                          </td>
                          <td>
                            <button className="btn small danger" onClick={() => void removeOffer(offer)}>
                              Ta bort
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
