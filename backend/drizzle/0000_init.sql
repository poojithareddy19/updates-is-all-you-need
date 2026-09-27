CREATE TYPE "public"."item_type" AS ENUM('news', 'article', 'paper', 'community');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('running', 'success', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."run_trigger" AS ENUM('cron', 'manual', 'script');--> statement-breakpoint
CREATE TABLE "fetch_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"trigger" "run_trigger" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" "run_status" DEFAULT 'running' NOT NULL,
	"stats" jsonb
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"external_id" text,
	"source_id" text NOT NULL,
	"source_name" text NOT NULL,
	"type" "item_type" NOT NULL,
	"summary" text,
	"ai_summary" text,
	"authors" text[] DEFAULT '{}'::text[] NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"image_url" text,
	"discussion_url" text,
	"score" integer,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce("items"."title", '')), 'A') || setweight(to_tsvector('english', coalesce("items"."summary", '') || ' ' || coalesce("items"."ai_summary", '')), 'B')) STORED,
	CONSTRAINT "items_url_unique" UNIQUE("url"),
	CONSTRAINT "items_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE INDEX "fetch_runs_started_at_idx" ON "fetch_runs" USING btree ("started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "items_published_at_idx" ON "items" USING btree ("published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "items_type_published_at_idx" ON "items" USING btree ("type","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "items_tags_idx" ON "items" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "items_search_idx" ON "items" USING gin ("search_vector");