CREATE TABLE "budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"category" varchar(128) NOT NULL,
	"monthly_limit" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debt_amortization" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"date" date NOT NULL,
	"capital_pending" numeric(12, 2) NOT NULL,
	"interest" numeric(12, 2) NOT NULL,
	"loan_name" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"date" date NOT NULL,
	"concept" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"category" varchar(128) NOT NULL,
	"type" varchar(16) NOT NULL,
	"source" varchar(32) NOT NULL,
	"transaction_hash" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_user_hash_idx" ON "transactions" USING btree ("user_id","transaction_hash");