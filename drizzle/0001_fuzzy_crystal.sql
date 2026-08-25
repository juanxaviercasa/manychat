CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`handle` varchar(180) NOT NULL,
	`channel` varchar(32) NOT NULL,
	`leadStatus` varchar(32) NOT NULL DEFAULT 'Nuevo',
	`tagsJson` text NOT NULL,
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()),
	`intent` varchar(64),
	`intentConfidence` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`contactId` int NOT NULL,
	`channel` varchar(32) NOT NULL,
	`lastMessage` text,
	`lastIntent` varchar(64),
	`lastIntentConfidence` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`conversationId` int NOT NULL,
	`channel` varchar(32) NOT NULL,
	`direction` enum('inbound','outbound') NOT NULL,
	`content` text NOT NULL,
	`intent` varchar(64),
	`intentConfidence` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflowExecutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`workflowId` int NOT NULL,
	`contactId` int,
	`channel` varchar(32) NOT NULL,
	`eventType` varchar(96) NOT NULL,
	`status` enum('queued','running','delivered','failed') NOT NULL DEFAULT 'queued',
	`payloadJson` text NOT NULL,
	`durationMs` int,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workflowExecutions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text,
	`trigger` varchar(96) NOT NULL,
	`graphJson` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_contactId_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflowExecutions` ADD CONSTRAINT `workflowExecutions_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflowExecutions` ADD CONSTRAINT `workflowExecutions_workflowId_workflows_id_fk` FOREIGN KEY (`workflowId`) REFERENCES `workflows`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflowExecutions` ADD CONSTRAINT `workflowExecutions_contactId_contacts_id_fk` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflows` ADD CONSTRAINT `workflows_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `contact_owner_idx` ON `contacts` (`ownerId`);--> statement-breakpoint
CREATE INDEX `contact_status_idx` ON `contacts` (`ownerId`,`leadStatus`);--> statement-breakpoint
CREATE INDEX `conversation_owner_idx` ON `conversations` (`ownerId`);--> statement-breakpoint
CREATE INDEX `conversation_contact_idx` ON `conversations` (`contactId`);--> statement-breakpoint
CREATE INDEX `message_conversation_idx` ON `messages` (`conversationId`);--> statement-breakpoint
CREATE INDEX `message_owner_idx` ON `messages` (`ownerId`);--> statement-breakpoint
CREATE INDEX `execution_owner_idx` ON `workflowExecutions` (`ownerId`);--> statement-breakpoint
CREATE INDEX `execution_workflow_idx` ON `workflowExecutions` (`workflowId`);--> statement-breakpoint
CREATE INDEX `workflow_owner_idx` ON `workflows` (`ownerId`);