import { describe, expect, it } from "vitest";
import { createDemoReply, filterContacts, restoreProfile, serializeProfile, stateMessage } from "../shared/uiBehaviors";

const records = [
  { name: "Sofía Ramírez", handle: "@sofiaramirez", tags: ["INFO"], status: "Caliente" },
  { name: "Carlos Mendoza", handle: "+51 987", tags: ["web-lead"], status: "En seguimiento" },
];

describe("UI behavior contracts", () => {
  it("filters contacts by query and status", () => {
    expect(filterContacts(records, "sofia")).toHaveLength(1);
    expect(filterContacts(records, "", "En seguimiento")[0]?.name).toBe("Carlos Mendoza");
  });
  it("creates a safe local demo reply", () => {
    expect(createDemoReply("SMS", "  Hola  ")).toMatchObject({ sent: true, channel: "SMS", text: "Hola", mode: "demo" });
    expect(createDemoReply("Email", " ").sent).toBe(false);
  });
  it("round-trips the complete profile and falls back on invalid data", () => {
    const profile = { space: "Studio", industry: "Consultoría", timezone: "UTC", hours: "09–17" };
    expect(restoreProfile(serializeProfile(profile), profile)).toEqual(profile);
    expect(restoreProfile("{bad", profile)).toEqual(profile);
  });
  it("exposes accessible state copy", () => {
    expect(stateMessage("loading")).toContain("Cargando");
    expect(stateMessage("error")).toContain("No se pudieron");
    expect(stateMessage("empty")).toContain("No hay");
  });
});
