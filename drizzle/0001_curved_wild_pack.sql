CREATE TABLE `api_token` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`hash` text NOT NULL,
	`prefix` text NOT NULL,
	`suffix` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_used_at` integer,
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_token_hash_unique` ON `api_token` (`hash`);--> statement-breakpoint
CREATE INDEX `api_token_user_idx` ON `api_token` (`user_id`);