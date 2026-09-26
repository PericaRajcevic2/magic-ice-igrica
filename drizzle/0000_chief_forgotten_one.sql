CREATE TABLE `rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`seed` integer NOT NULL,
	`started` integer NOT NULL,
	`finished` integer,
	`name` text,
	`score` integer,
	`scoops` integer,
	`day` text,
	`week` text
);
--> statement-breakpoint
CREATE INDEX `idx_rounds_day_score` ON `rounds` (`day`,`score`);--> statement-breakpoint
CREATE INDEX `idx_rounds_week_score` ON `rounds` (`week`,`score`);--> statement-breakpoint
CREATE INDEX `idx_rounds_score` ON `rounds` (`score`);