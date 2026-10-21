import { supabase } from "../lib/supabase";

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase är inte konfigurerat");
  }
  return supabase;
}

export function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const text = `${error.code ?? ""} ${error.message ?? ""}`;
  return (
    text.includes("42P01") ||
    text.includes("PGRST205") ||
    text.includes("does not exist") ||
    text.includes("schema cache")
  );
}

export const BUSINESS_HINT =
  "Databastabellen saknas. Kör supabase/mobile-business.sql och supabase/admin-panel.sql i Supabase SQL Editor först.";

export function formatSek(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "–";
  return `${amount.toLocaleString("sv-SE")} kr`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "–";
  return new Date(value).toLocaleString("sv-SE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function nameOf(id: string | null | undefined, names: Map<string, string>): string {
  if (!id) return "–";
  return names.get(id) ?? `${id.slice(0, 8)}…`;
}

export async function fetchNameMap(userIds: (string | null)[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data } = await requireSupabase().from("profiles").select("id, display_name").in("id", unique);
  for (const row of data ?? []) {
    map.set(row.id as string, (row.display_name as string | null) ?? "Namnlös");
  }
  return map;
}
