ALTER TABLE `conversations` ADD `lastRequiresReview` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `requiresReview` boolean DEFAULT false NOT NULL;