import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  listUsers: vi.fn(), updateUserRole: vi.fn(),
  listWorkflows: vi.fn(), createWorkflow: vi.fn(), updateWorkflow: vi.fn(), duplicateWorkflow: vi.fn(), createExecution: vi.fn(),
  listContacts: vi.fn(), createContact: vi.fn(), updateContact: vi.fn(),
  listConversations: vi.fn(), listReviewQueue: vi.fn(), resolveConversationReview: vi.fn(), listMessages: vi.fn(), createMessage: vi.fn(), listExecutions: vi.fn(),
}));
vi.mock("./intentClassifier", () => ({ classifyInboundMessage: vi.fn() }));
vi.mock("./rateLimit", () => ({
  enforceCampaignRateLimit: vi.fn().mockResolvedValue({ success: true, limit: 20, remaining: 19, reset: 0, mode: "upstash" }),
  rateLimitStatusMessage: vi.fn(() => "limit"),
}));

import * as db from "./db";
import { classifyInboundMessage } from "./intentClassifier";
import { automationRouter } from "./routers/automation";

const ctx = { user: { id: 42, role: "user" } } as never;

describe("automation router persistence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes a workflow under the authenticated owner", async () => {
    const caller = automationRouter.createCaller(ctx);
    await caller.workflows.create({ name: "Bienvenida", trigger: "Instagram", graphJson: '{"nodes":[],"edges":[]}' });
    expect(db.createWorkflow).toHaveBeenCalledWith(42, expect.objectContaining({ name: "Bienvenida", trigger: "Instagram" }));
  });

  it("updates and duplicates only the workflow requested by the authenticated owner", async () => {
    const caller = automationRouter.createCaller(ctx);
    await caller.workflows.update({ id: 9, patch: { isActive: false, name: "Pausado" } });
    await caller.workflows.duplicate({ id: 9 });
    expect(db.updateWorkflow).toHaveBeenCalledWith(42, 9, { isActive: false, name: "Pausado" });
    expect(db.duplicateWorkflow).toHaveBeenCalledWith(42, 9);
  });

  it("scopes CRM queries to the authenticated owner", async () => {
    vi.mocked(db.listContacts).mockResolvedValue([] as never);
    const caller = automationRouter.createCaller(ctx);
    await caller.contacts.list({ query: "Ana", leadStatus: "Nuevo" });
    expect(db.listContacts).toHaveBeenCalledWith(42, "Ana", "Nuevo");
  });

  it("persists an escalated inbound classification for manual review", async () => {
    vi.mocked(classifyInboundMessage).mockResolvedValue({ intent: "queja", confidence: 91, summary: "Cliente inconforme", shouldEscalate: true });
    const caller = automationRouter.createCaller(ctx);
    const result = await caller.inbox.classifyIncoming({ conversationId: 4, contactId: 8, channel: "WhatsApp", content: "No estoy conforme" });
    expect(result).toMatchObject({ intent: "queja", shouldEscalate: true });
    expect(db.createMessage).toHaveBeenCalledWith(42, expect.objectContaining({ conversationId: 4, requiresReview: true, intent: "queja" }));
    expect(db.updateContact).toHaveBeenCalledWith(42, 8, { intent: "queja", intentConfidence: 91 });
  });

  it("stores outbound messages and test executions after the campaign gate accepts them", async () => {
    const caller = automationRouter.createCaller(ctx);
    await caller.inbox.sendDemo({ conversationId: 4, channel: "WhatsApp", content: "Mensaje seguro" });
    await caller.workflows.runDemo({ workflowId: 9, channel: "Instagram", payloadJson: "{}" });
    expect(db.createMessage).toHaveBeenCalledWith(42, expect.objectContaining({ conversationId: 4, direction: "outbound", content: "Mensaje seguro" }));
    expect(db.createExecution).toHaveBeenCalledWith(42, expect.objectContaining({ workflowId: 9, eventType: "demo_workflow_run", status: "delivered" }));
  });

  it("lists and resolves manual review items within the authenticated workspace", async () => {
    vi.mocked(db.listReviewQueue).mockResolvedValue([] as never);
    const caller = automationRouter.createCaller(ctx);
    await caller.inbox.reviewQueue();
    await caller.inbox.resolveReview({ conversationId: 4 });
    expect(db.listReviewQueue).toHaveBeenCalledWith(42);
    expect(db.resolveConversationReview).toHaveBeenCalledWith(42, 4);
  });
});
