ALTER TABLE `rounds` ADD `device_id` text;--> statement-breakpoint
ALTER TABLE `rounds` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_rounds_device_version_score` ON `rounds` (`device_id`,`version`,`score`);