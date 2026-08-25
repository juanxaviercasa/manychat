import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
  return { ...actual, eq: vi.fn(actual.eq), and: vi.fn(actual.and), desc: vi.fn(actual.desc), like: vi.fn(actual.like), or: vi.fn(actual.or) };
});
import {
  createContact,
  createExecution,
  createMessage,
  listContacts,
  listConversations,
  listExecutions,
  listReviewQueue,
  listWorkflows,
  resolveConversationReview,
  setDbForTesting,
} from "./db";
import { eq } from "drizzle-orm";

function fakeDatabase() {
  const where = vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue([]) }));
  const from = vi.fn(() => ({ where, innerJoin: vi.fn(() => ({ where })) }));
  const insertValues = vi.fn().mockResolvedValue([{ insertId: 99 }]);
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const db = {
    select: vi.fn(() => ({ from })),
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateWhere })) })),
  };
  return { db, where, insertValues, updateWhere };
}

afterEach(() => setDbForTesting(null));

describe("database helper ownership", () => {
  it("routes owner-scoped reads through their respective filters", async () => {
    const fake = fakeDatabase();
    setDbForTesting(fake.db as never);
    await Promise.all([listWorkflows(17), listContacts(17, "Ana", "Nuevo"), listConversations(17), listExecutions(17), listReviewQueue(17)]);
    expect(fake.where).toHaveBeenCalledTimes(5);
    expect(vi.mocked(eq).mock.calls.filter(([, value]) => value === 17)).toHaveLength(5);
  });

  it("writes ownerId when creating contacts, messages and executions", async () => {
    const fake = fakeDatabase();
    setDbForTesting(fake.db as never);
    await createContact(17, { name: "Ana", handle: "@ana", channel: "Instagram", tags: ["nuevo"] });
    await createMessage(17, { conversationId: 99, channel: "Instagram", direction: "inbound", content: "Hola", requiresReview: true });
    await createExecution(17, { workflowId: 5, channel: "Instagram", eventType: "test", payloadJson: "{}" });
    const serialized = JSON.stringify(fake.insertValues.mock.calls);
    expect(serialized).toContain('"ownerId":17');
    expect(serialized).toContain('"requiresReview":true');
  });

  it("updates a review state through an owner-scoped conversation update", async () => {
    const fake = fakeDatabase();
    setDbForTesting(fake.db as never);
    await resolveConversationReview(17, 99);
    expect(fake.updateWhere).toHaveBeenCalledTimes(1);
    expect(vi.mocked(eq).mock.calls.some(([, value]) => value === 17)).toBe(true);
  });
});
