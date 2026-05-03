CREATE TABLE "import_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"file_name" varchar(512) NOT NULL,
	"status" varchar(32) NOT NULL,
	"inserted" integer DEFAULT 0 NOT NULL,
	"skipped" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
