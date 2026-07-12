CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'cash' NOT NULL,
	`initial_balance_cents` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`icon` text DEFAULT '',
	`color` text DEFAULT '',
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fund_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fund_code` text NOT NULL,
	`date` text NOT NULL,
	`market_value_cents` integer NOT NULL,
	`shares` real,
	`day_change_pct` real,
	`holding_profit_cents` integer,
	`source` text DEFAULT 'manual' NOT NULL,
	`image_path` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`fund_code`) REFERENCES `funds`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fund_records_code_date_unique` ON `fund_records` (`fund_code`,`date`);--> statement-breakpoint
CREATE TABLE `funds` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `merchant_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`keyword` text NOT NULL,
	`category_id` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `merchant_rules_keyword_unique` ON `merchant_rules` (`keyword`);--> statement-breakpoint
CREATE TABLE `ocr_import_batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`images` text NOT NULL,
	`items` text NOT NULL,
	`status` text DEFAULT 'recognizing' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`category_id` integer,
	`account_id` integer,
	`date` text NOT NULL,
	`time` text,
	`merchant` text,
	`note` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`image_path` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
