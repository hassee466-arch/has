import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BUSINESS_HINT,
  fetchNameMap,
  formatDateTime,
  formatSek,
  isMissingTableError,
  nameOf,
  requireSupabase,
} from "./api";
import type { BookingRow } from "./types";

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Alla" },
  { key: "proposed", label: "Väntar på svar" },
  { key: "confirmed", label: "Bekräftade" },
  { key: "paid", label: "Betalda" },
  { key: "completed", label: "Genomförda" },
  { key: "cancelled", label: "Avbokade" },
  { key: "no_show", label: "Uteblev" },
];

const STATUS_BADGE: Record<BookingRow["status"], string> = {
  proposed: "amber",
  confirmed: "blue",
  paid: "blue",
  completed: "green",
  cancelled: "gray",
  no_show: "red",
};

export default function BookingsView() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [challengeTitles, setChallengeTitles] = useState<Map<string, string>>(new Map());
  const [partnerNames, setPartnerNames] = useState<Map<string, string>>(new Map());
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const client = requireSupabase();
    const [bookingResult, challengeResult, partnerResult] = await Promise.all([
      client.from("bookings").select("*").order("created_at", { ascending: false }).limit(200),
      client.from("challenges").select("id, title"),
      client.from("partners").select("id, name"),
    ]);
    if (bookingResult.error) {
      setError(isMissingTableError(bookingResult.error) ? BUSINESS_HINT : bookingResult.error.message);
      setLoading(false);
      return;
    }
    const rows = (bookingResult.data ?? []) as BookingRow[];
    setBookings(rows);
    setNames(await fetchNameMap(rows.flatMap((row) => [row.member_a, row.member_b])));

    const challengeMap = new Map<string, string>();
    for (const row of challengeResult.data ?? []) {
      challengeMap.set(row.id as string, row.title as string);
    }
    setChallengeTitles(challengeMap);

    const partnerMap = new Map<string, string>();
    for (const row of partnerResult.data ?? []) {
      partnerMap.set(row.id as string, row.name as string);
    }
    setPartnerNames(partnerMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => (statusFilter === "all" ? bookings : bookings.filter((row) => row.status === statusFilter)),
    [bookings, statusFilter]
  );

  if (loading) {
    return <p className="muted">Laddar…</p>;
  }

  return (
    <section className="stack">
      {error && <p className="error-text">{error}</p>}
      <div className="chip-row">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.key}
            className={`chip chip-btn${statusFilter === filter.key ? " chip-active" : ""}`}
            onClick={() => setStatusFilter(filter.key)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      {!error && filtered.length === 0 ? (
        <div className="card empty-state">
          <p>Inga bokningar med vald status.</p>
        </div>
      ) : (
        !error && (
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Utmaning</th>
                  <th>Medlemmar</th>
                  <th>Partner</th>
                  <th>Datum</th>
                  <th>Status</th>
                  <th>Medlem betalade</th>
                  <th>Bidrag</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <strong>{challengeTitles.get(booking.challenge_id) ?? booking.challenge_id}</strong>
                    </td>
                    <td>
                      {nameOf(booking.member_a, names)}
                      {booking.member_b ? ` × ${nameOf(booking.member_b, names)}` : ""}
                    </td>
                    <td>{booking.partner_id ? partnerNames.get(booking.partner_id) ?? "–" : "–"}</td>
                    <td>{formatDateTime(booking.scheduled_for)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[booking.status]}`}>
                        {STATUS_FILTERS.find((filter) => filter.key === booking.status)?.label ??
                          booking.status}
                      </span>
                    </td>
                    <td>{formatSek(booking.member_paid_sek)}</td>
                    <td>{formatSek(booking.subsidy_sek)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </section>
  );
}
