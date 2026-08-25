export type ContactRecord = { name: string; handle: string; tags: string[]; status: string };
export type BusinessProfile = { space: string; industry: string; timezone: string; hours: string };
export type UiState = "ready" | "loading" | "error" | "empty";

export function filterContacts(records: ContactRecord[], query: string, status = "Todos") {
  const normalized = query.trim().toLowerCase();
  return records.filter((record) => {
    const matchesQuery = !normalized || `${record.name} ${record.handle} ${record.tags.join(" ")}`.toLowerCase().includes(normalized);
    return matchesQuery && (status === "Todos" || record.status === status);
  });
}

export function createDemoReply(channel: string, text: string) {
  const cleanText = text.trim();
  if (!cleanText) return { sent: false, channel, text: "" };
  return { sent: true, channel, text: cleanText, mode: "demo" as const };
}

export function serializeProfile(profile: BusinessProfile) { return JSON.stringify(profile); }
export function restoreProfile(raw: string | null, fallback: BusinessProfile): BusinessProfile {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<BusinessProfile>;
    if (["space", "industry", "timezone", "hours"].every((key) => typeof parsed[key as keyof BusinessProfile] === "string")) return parsed as BusinessProfile;
  } catch { /* demo fallback */ }
  return fallback;
}

export function stateMessage(state: UiState) {
  return { ready: "Datos demo listos", loading: "Cargando datos…", error: "No se pudieron cargar los datos", empty: "No hay resultados para mostrar" }[state];
}
