import { describe, expect, it } from "vitest";
import { antiSpamLimits, demoWorkflow, duplicateWorkflow, isDemoSafe } from "../shared/demoWorkflow";

describe("demo workflow", () => {
  it("defines nodes and conditional edges", () => {
    expect(demoWorkflow.nodes.map((node) => node.kind)).toEqual(["trigger", "condition", "wait", "message", "tag"]);
    expect(demoWorkflow.edges).toContainEqual(["condition_1", "message_1", "No"]);
  });
  it("duplicates a workflow into an editable copy", () => {
    const copy = duplicateWorkflow({ id: "flow_1", name: "Consulta" });
    expect(copy).toEqual({ id: "flow_1_copy", name: "Consulta · copia" });
  });
  it("keeps demo mode isolated", () => {
    expect(antiSpamLimits.instagramDaily).toBe(200);
    expect(antiSpamLimits.whatsappMinSeconds).toBeLessThan(antiSpamLimits.whatsappMaxSeconds);
    expect(isDemoSafe("demo")).toBe(true);
    expect(isDemoSafe(undefined)).toBe(true);
    expect(isDemoSafe("production")).toBe(false);
  });
});
