ALTER TABLE "items" DROP CONSTRAINT "items_url_unique";--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "url_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_url_key_unique" UNIQUE("url_key");