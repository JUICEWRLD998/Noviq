CREATE TABLE "actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" text DEFAULT 'agent' NOT NULL,
	"status" text NOT NULL,
	"reasoning" text,
	"target" text,
	"value" text,
	"data" text,
	"asset" text,
	"recipient" text,
	"amount" text,
	"reason_code" integer,
	"reason_label" text,
	"action_hash" text,
	"tx_hash" text,
	"log_index" integer,
	"block" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"label" text,
	"goal" text NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"action_id" uuid,
	"narration" text NOT NULL,
	"severity" text NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommend_slash" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bonds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid,
	"agent_address" text,
	"amount" text,
	"status" text NOT NULL,
	"tx_hash" text,
	"block" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "covenant_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" text NOT NULL,
	"chain_id" integer NOT NULL,
	"owner_address" text NOT NULL,
	"agent_address" text NOT NULL,
	"deploy_tx" text,
	"deploy_block" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "covenant_accounts_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE "indexer_state" (
	"key" text PRIMARY KEY NOT NULL,
	"last_block" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"source_text" text,
	"policy_json" jsonb NOT NULL,
	"set_tx" text,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_address_unique" UNIQUE("address")
);
--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_account_id_covenant_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."covenant_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_account_id_covenant_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."covenant_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_notes" ADD CONSTRAINT "audit_notes_account_id_covenant_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."covenant_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_notes" ADD CONSTRAINT "audit_notes_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonds" ADD CONSTRAINT "bonds_account_id_covenant_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."covenant_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_account_id_covenant_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."covenant_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actions_account_idx" ON "actions" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "actions_tx_hash_key" ON "actions" USING btree ("tx_hash") WHERE "actions"."tx_hash" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "policies_account_version_key" ON "policies" USING btree ("account_id","version");