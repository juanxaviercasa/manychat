import { and, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  contacts,
  conversations,
  InsertUser,
  messages,
  users,
  workflowExecutions,
  workflows,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export function setDbForTesting(db: ReturnType<typeof drizzle> | null) {
  if (process.env.NODE_ENV === "production") throw new Error("La inyección de base de datos está bloqueada en producción");
  _db = db;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod"] as const).forEach((field) => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listUsers() {
  const db = requireDb(await getDb());
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, lastSignedIn: users.lastSignedIn }).from(users).orderBy(desc(users.lastSignedIn));
}

export async function updateUserRole(id: number, role: "user" | "admin") {
  const db = requireDb(await getDb());
  await db.update(users).set({ role }).where(eq(users.id, id));
}

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new Error("La base de datos no está disponible");
  return db;
}

export async function listWorkflows(ownerId: number) {
  const db = requireDb(await getDb());
  return db.select().from(workflows).where(eq(workflows.ownerId, ownerId)).orderBy(desc(workflows.updatedAt));
}

export async function createWorkflow(ownerId: number, input: { name: string; description?: string; trigger: string; graphJson: string }) {
  const db = requireDb(await getDb());
  await db.insert(workflows).values({ ownerId, name: input.name, description: input.description ?? null, trigger: input.trigger, graphJson: input.graphJson });
}

export async function updateWorkflow(ownerId: number, id: number, input: Partial<{ name: string; description: string; trigger: string; graphJson: string; isActive: boolean }>) {
  const db = requireDb(await getDb());
  await db.update(workflows).set(input).where(and(eq(workflows.id, id), eq(workflows.ownerId, ownerId)));
}

export async function duplicateWorkflow(ownerId: number, id: number) {
  const db = requireDb(await getDb());
  const [source] = await db.select().from(workflows).where(and(eq(workflows.id, id), eq(workflows.ownerId, ownerId))).limit(1);
  if (!source) throw new Error("Workflow no encontrado");
  await db.insert(workflows).values({
    ownerId,
    name: `${source.name} (copia)`,
    description: source.description,
    trigger: source.trigger,
    graphJson: source.graphJson,
    isActive: false,
  });
}

export async function listContacts(ownerId: number, query?: string, leadStatus?: string) {
  const db = requireDb(await getDb());
  const where = [eq(contacts.ownerId, ownerId)];
  if (leadStatus && leadStatus !== "Todos") where.push(eq(contacts.leadStatus, leadStatus));
  if (query?.trim()) {
    const pattern = `%${query.trim()}%`;
    where.push(or(like(contacts.name, pattern), like(contacts.handle, pattern), like(contacts.tagsJson, pattern))!);
  }
  return db.select().from(contacts).where(and(...where)).orderBy(desc(contacts.lastActivityAt));
}

export async function createContact(ownerId: number, input: { name: string; handle: string; channel: string; leadStatus?: string; tags: string[] }) {
  const db = requireDb(await getDb());
  const result = await db.insert(contacts).values({
    ownerId,
    name: input.name,
    handle: input.handle,
    channel: input.channel,
    leadStatus: input.leadStatus ?? "Nuevo",
    tagsJson: JSON.stringify(input.tags),
  });
  const contactId = Number(result[0].insertId);
  await db.insert(conversations).values({ ownerId, contactId, channel: input.channel, lastMessage: "Contacto registrado en CRM" });
}

export async function updateContact(ownerId: number, id: number, input: Partial<{ name: string; handle: string; channel: string; leadStatus: string; tagsJson: string; intent: string; intentConfidence: number }>) {
  const db = requireDb(await getDb());
  await db.update(contacts).set(input).where(and(eq(contacts.id, id), eq(contacts.ownerId, ownerId)));
}

export async function listConversations(ownerId: number) {
  const db = requireDb(await getDb());
  return db.select({ conversation: conversations, contact: contacts })
    .from(conversations)
    .innerJoin(contacts, eq(conversations.contactId, contacts.id))
    .where(eq(conversations.ownerId, ownerId))
    .orderBy(desc(conversations.updatedAt));
}

export async function listReviewQueue(ownerId: number) {
  const db = requireDb(await getDb());
  return db.select({ conversation: conversations, contact: contacts })
    .from(conversations)
    .innerJoin(contacts, eq(conversations.contactId, contacts.id))
    .where(and(eq(conversations.ownerId, ownerId), eq(conversations.lastRequiresReview, true)))
    .orderBy(desc(conversations.updatedAt));
}

export async function resolveConversationReview(ownerId: number, conversationId: number) {
  const db = requireDb(await getDb());
  await db.update(conversations).set({ lastRequiresReview: false }).where(and(eq(conversations.ownerId, ownerId), eq(conversations.id, conversationId)));
}

export async function listMessages(ownerId: number, conversationId: number) {
  const db = requireDb(await getDb());
  return db.select().from(messages).where(and(eq(messages.ownerId, ownerId), eq(messages.conversationId, conversationId))).orderBy(messages.createdAt);
}

export async function createMessage(ownerId: number, input: { conversationId: number; channel: string; direction: "inbound" | "outbound"; content: string; intent?: string; intentConfidence?: number; requiresReview?: boolean }) {
  const db = requireDb(await getDb());
  await db.insert(messages).values({ ownerId, ...input });
  await db.update(conversations).set({ lastMessage: input.content, lastIntent: input.intent ?? null, lastIntentConfidence: input.intentConfidence ?? null, lastRequiresReview: input.requiresReview ?? false }).where(and(eq(conversations.id, input.conversationId), eq(conversations.ownerId, ownerId)));
}

export async function listExecutions(ownerId: number) {
  const db = requireDb(await getDb());
  return db.select({ execution: workflowExecutions, workflow: workflows })
    .from(workflowExecutions)
    .innerJoin(workflows, eq(workflowExecutions.workflowId, workflows.id))
    .where(eq(workflowExecutions.ownerId, ownerId))
    .orderBy(desc(workflowExecutions.createdAt));
}

export async function createExecution(ownerId: number, input: { workflowId: number; contactId?: number; channel: string; eventType: string; status?: "queued" | "running" | "delivered" | "failed"; payloadJson: string; durationMs?: number; errorMessage?: string }) {
  const db = requireDb(await getDb());
  await db.insert(workflowExecutions).values({ ownerId, ...input, contactId: input.contactId ?? null, status: input.status ?? "queued", durationMs: input.durationMs ?? null, errorMessage: input.errorMessage ?? null });
}
