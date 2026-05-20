CREATE TABLE `deck_vote` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`presenter_participant_id` text NOT NULL,
	`candidate_deck_ids` text NOT NULL,
	`winner_deck_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`closed_at` integer,
	FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`presenter_participant_id`) REFERENCES `participant`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`winner_deck_id`) REFERENCES `deck`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `deck_vote_room_idx` ON `deck_vote` (`room_id`);--> statement-breakpoint
CREATE TABLE `deck_vote_ballot` (
	`vote_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`deck_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`vote_id`, `participant_id`),
	FOREIGN KEY (`vote_id`) REFERENCES `deck_vote`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant_id`) REFERENCES `participant`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deck_id`) REFERENCES `deck`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `room` ADD `current_deck_vote_id` text;