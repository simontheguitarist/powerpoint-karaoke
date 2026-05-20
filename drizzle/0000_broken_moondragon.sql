CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `deck` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '',
	`source` text NOT NULL,
	`topic` text,
	`spice_level` text DEFAULT 'mild' NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`error_message` text,
	`slide_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `deck_owner_idx` ON `deck` (`owner_id`);--> statement-breakpoint
CREATE INDEX `deck_status_idx` ON `deck` (`status`);--> statement-breakpoint
CREATE TABLE `deck_tag` (
	`deck_id` text NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`deck_id`, `tag`),
	FOREIGN KEY (`deck_id`) REFERENCES `deck`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `participant` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`user_id` text,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'player' NOT NULL,
	`joined_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `participant_room_idx` ON `participant` (`room_id`);--> statement-breakpoint
CREATE TABLE `rating` (
	`id` text PRIMARY KEY NOT NULL,
	`round_id` text NOT NULL,
	`judge_participant_id` text NOT NULL,
	`criterion` text NOT NULL,
	`score` integer NOT NULL,
	`comment` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `round`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`judge_participant_id`) REFERENCES `participant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rating_round_idx` ON `rating` (`round_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `rating_round_judge_criterion_unique` ON `rating` (`round_id`,`judge_participant_id`,`criterion`);--> statement-breakpoint
CREATE TABLE `room` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`host_user_id` text NOT NULL,
	`state` text DEFAULT 'lobby' NOT NULL,
	`current_round_id` text,
	`config` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`host_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `room_code_unique` ON `room` (`code`);--> statement-breakpoint
CREATE INDEX `room_code_idx` ON `room` (`code`);--> statement-breakpoint
CREATE TABLE `round` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`presenter_participant_id` text NOT NULL,
	`deck_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`state` text DEFAULT 'queued' NOT NULL,
	`current_slide_index` integer DEFAULT 0 NOT NULL,
	`started_at` integer,
	`ended_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`presenter_participant_id`) REFERENCES `participant`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deck_id`) REFERENCES `deck`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `round_room_idx` ON `round` (`room_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `round_slide` (
	`id` text PRIMARY KEY NOT NULL,
	`round_id` text NOT NULL,
	`slide_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`skipped` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `round`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`slide_id`) REFERENCES `slide`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `round_slide_round_idx` ON `round_slide` (`round_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `slide` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`index` integer NOT NULL,
	`kind` text NOT NULL,
	`src` text NOT NULL,
	`width` integer,
	`height` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `deck`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `slide_deck_idx` ON `slide` (`deck_id`,`index`);--> statement-breakpoint
CREATE UNIQUE INDEX `slide_deck_index_unique` ON `slide` (`deck_id`,`index`);--> statement-breakpoint
CREATE TABLE `slide_skip_vote` (
	`round_slide_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`round_slide_id`, `participant_id`),
	FOREIGN KEY (`round_slide_id`) REFERENCES `round_slide`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant_id`) REFERENCES `participant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `slide_skip_vote_rs_idx` ON `slide_skip_vote` (`round_slide_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
