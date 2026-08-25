import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const workflows = mysqlTable("workflows", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  trigger: varchar("trigger", { length: 96 }).notNull(),
  graphJson: text("graphJson").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("workflow_owner_idx").on(table.ownerId)]);

export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 180 }).notNull(),
  handle: varchar("handle", { length: 180 }).notNull(),
  channel: varchar("channel", { length: 32 }).notNull(),
  leadStatus: varchar("leadStatus", { length: 32 }).default("Nuevo").notNull(),
  tagsJson: text("tagsJson").notNull(),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  intent: varchar("intent", { length: 64 }),
  intentConfidence: int("intentConfidence"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("contact_owner_idx").on(table.ownerId), index("contact_status_idx").on(table.ownerId, table.leadStatus)]);

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  contactId: int("contactId").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 32 }).notNull(),
  lastMessage: text("lastMessage"),
  lastIntent: varchar("lastIntent", { length: 64 }),
  lastIntentConfidence: int("lastIntentConfidence"),
  lastRequiresReview: boolean("lastRequiresReview").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("conversation_owner_idx").on(table.ownerId), index("conversation_contact_idx").on(table.contactId)]);

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 32 }).notNull(),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  content: text("content").notNull(),
  intent: varchar("intent", { length: 64 }),
  intentConfidence: int("intentConfidence"),
  requiresReview: boolean("requiresReview").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("message_conversation_idx").on(table.conversationId), index("message_owner_idx").on(table.ownerId)]);

export const workflowExecutions = mysqlTable("workflowExecutions", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  workflowId: int("workflowId").notNull().references(() => workflows.id, { onDelete: "cascade" }),
  contactId: int("contactId").references(() => contacts.id, { onDelete: "set null" }),
  channel: varchar("channel", { length: 32 }).notNull(),
  eventType: varchar("eventType", { length: 96 }).notNull(),
  status: mysqlEnum("status", ["queued", "running", "delivered", "failed"]).default("queued").notNull(),
  payloadJson: text("payloadJson").notNull(),
  durationMs: int("durationMs"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("execution_owner_idx").on(table.ownerId), index("execution_workflow_idx").on(table.workflowId)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Workflow = typeof workflows.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
