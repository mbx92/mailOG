CREATE TABLE IF NOT EXISTS "app_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "provider" varchar(32) DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE "template_surat" ADD COLUMN "kop_image" varchar(255);--> statement-breakpoint
ALTER TABLE "template_surat" ADD COLUMN "footer_image" varchar(255);
