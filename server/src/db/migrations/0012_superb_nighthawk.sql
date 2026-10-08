ALTER TABLE "pr_intent" ADD COLUMN "head_sha" text;--> statement-breakpoint
ALTER TABLE "pr_intent" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "pr_intent" ADD COLUMN "cost_usd" double precision;--> statement-breakpoint
ALTER TABLE "pr_intent" ADD COLUMN "created_at" timestamp with time zone DEFAULT now();