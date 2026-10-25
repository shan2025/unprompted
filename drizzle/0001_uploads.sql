CREATE TABLE `uploads` (
	`name` text PRIMARY KEY NOT NULL,
	`content_type` text NOT NULL,
	`bytes` blob NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
