import { describe, expect, it } from "vitest";
import { serializeRowsToCsv } from "../shared/csv";
import { intentCategories } from "./intentClassifier";
import { rateLimitStatusMessage } from "./rateLimit";
import { assertOwnerOrAdmin } from "./routers/automation";

describe("operational contracts", () => {
  it("protects tenant data unless the actor is an administrator", () => {
    expect(() => assertOwnerOrAdmin(8, { id: 8, role: "user" })).not.toThrow();
    expect(() => assertOwnerOrAdmin(8, { id: 1, role: "admin" })).not.toThrow();
    expect(() => assertOwnerOrAdmin(8, { id: 1, role: "user" })).toThrow("No tienes permisos");
  });

  it("provides an explicit anti-spam message when a distributed limit blocks an action", () => {
    expect(rateLimitStatusMessage({ success: false, limit: 3, remaining: 0, reset: 0, mode: "upstash" })).toContain("Límite anti-spam");
  });

  it("keeps the accepted omnichannel intent taxonomy bounded", () => {
    expect(intentCategories).toContain("precio");
    expect(intentCategories).toContain("reserva");
    expect(intentCategories).toContain("otro");
  });

  it("exports filtered rows as quote-safe CSV", () => {
    expect(serializeRowsToCsv([{ nombre: "Ana, S.A.", nota: 'Dice "hola"' }])).toBe('nombre,nota\n"Ana, S.A.","Dice ""hola"""');
  });
});
