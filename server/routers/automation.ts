import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { enforceCampaignRateLimit, rateLimitStatusMessage } from "../rateLimit";
import { classifyInboundMessage } from "../intentClassifier";

const workflowInput = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().max(2_000).optional(),
  trigger: z.string().trim().min(2).max(96),
  graphJson: z.string().min(2).max(100_000),
});

export const automationRouter = router({
  team: router({
    list: adminProcedure.query(() => db.listUsers()),
    setRole: adminProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(["user", "admin"]) })).mutation(async ({ input }) => {
      await db.updateUserRole(input.userId, input.role);
      return { success: true } as const;
    }),
  }),
  workflows: router({
    list: protectedProcedure.query(({ ctx }) => db.listWorkflows(ctx.user.id)),
    create: protectedProcedure.input(workflowInput).mutation(async ({ ctx, input }) => {
      await db.createWorkflow(ctx.user.id, input);
      return { success: true } as const;
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), patch: workflowInput.partial().extend({ isActive: z.boolean().optional() }) })).mutation(async ({ ctx, input }) => {
      await db.updateWorkflow(ctx.user.id, input.id, input.patch);
      return { success: true } as const;
    }),
    duplicate: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await db.duplicateWorkflow(ctx.user.id, input.id);
      return { success: true } as const;
    }),
    runDemo: protectedProcedure.input(z.object({ workflowId: z.number().int().positive(), channel: z.string().min(2).max(32), payloadJson: z.string().min(2).max(50_000) })).mutation(async ({ ctx, input }) => {
      const gate = await enforceCampaignRateLimit({ ownerId: ctx.user.id, channel: input.channel });
      if (!gate.success) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: rateLimitStatusMessage(gate) });
      await db.createExecution(ctx.user.id, { workflowId: input.workflowId, channel: input.channel, eventType: "demo_workflow_run", payloadJson: input.payloadJson, status: "delivered", durationMs: 150 });
      return { success: true, rateLimit: gate } as const;
    }),
  }),
  contacts: router({
    list: protectedProcedure.input(z.object({ query: z.string().max(180).optional(), leadStatus: z.string().max(32).optional() }).optional()).query(({ ctx, input }) => db.listContacts(ctx.user.id, input?.query, input?.leadStatus)),
    create: protectedProcedure.input(z.object({ name: z.string().min(2).max(180), handle: z.string().min(1).max(180), channel: z.string().min(2).max(32), leadStatus: z.string().max(32).optional(), tags: z.array(z.string().trim().min(1).max(40)).max(20) })).mutation(async ({ ctx, input }) => {
      await db.createContact(ctx.user.id, input);
      return { success: true } as const;
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), patch: z.object({ name: z.string().min(2).max(180).optional(), handle: z.string().min(1).max(180).optional(), channel: z.string().min(2).max(32).optional(), leadStatus: z.string().max(32).optional(), tags: z.array(z.string().trim().min(1).max(40)).max(20).optional() }) })).mutation(async ({ ctx, input }) => {
      const { tags, ...rest } = input.patch;
      await db.updateContact(ctx.user.id, input.id, { ...rest, ...(tags ? { tagsJson: JSON.stringify(tags) } : {}) });
      return { success: true } as const;
    }),
  }),
  inbox: router({
    list: protectedProcedure.query(({ ctx }) => db.listConversations(ctx.user.id)),
    reviewQueue: protectedProcedure.query(({ ctx }) => db.listReviewQueue(ctx.user.id)),
    resolveReview: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await db.resolveConversationReview(ctx.user.id, input.conversationId);
      return { success: true } as const;
    }),
    messages: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(({ ctx, input }) => db.listMessages(ctx.user.id, input.conversationId)),
    sendDemo: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), channel: z.string().min(2).max(32), content: z.string().trim().min(1).max(5_000) })).mutation(async ({ ctx, input }) => {
      const gate = await enforceCampaignRateLimit({ ownerId: ctx.user.id, channel: input.channel });
      if (!gate.success) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: rateLimitStatusMessage(gate) });
      await db.createMessage(ctx.user.id, { ...input, direction: "outbound" });
      return { success: true, rateLimit: gate } as const;
    }),
    classifyIncoming: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), contactId: z.number().int().positive(), channel: z.string().min(2).max(32), content: z.string().trim().min(1).max(5_000) })).mutation(async ({ ctx, input }) => {
      const classification = await classifyInboundMessage({ channel: input.channel, content: input.content });
      await db.createMessage(ctx.user.id, { conversationId: input.conversationId, channel: input.channel, direction: "inbound", content: input.content, intent: classification.intent, intentConfidence: classification.confidence, requiresReview: classification.shouldEscalate });
      await db.updateContact(ctx.user.id, input.contactId, { intent: classification.intent, intentConfidence: classification.confidence });
      return classification;
    }),
  }),
  executions: router({
    list: protectedProcedure.query(({ ctx }) => db.listExecutions(ctx.user.id)),
  }),
  dashboard: router({
    metrics: protectedProcedure.query(async ({ ctx }) => {
      const [workflowList, contactList, executionList, conversationList] = await Promise.all([
        db.listWorkflows(ctx.user.id),
        db.listContacts(ctx.user.id),
        db.listExecutions(ctx.user.id),
        db.listConversations(ctx.user.id),
      ]);
      return {
        workflows: workflowList.length,
        activeWorkflows: workflowList.filter((workflow) => workflow.isActive).length,
        contacts: contactList.length,
        executions: executionList.length,
        conversations: conversationList.length,
      };
    }),
  }),
});

export function assertOwnerOrAdmin(ownerId: number, actor: { id: number; role: string }) {
  if (actor.id !== ownerId && actor.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos sobre este recurso" });
}
