CREATE TYPE "public"."target_mode_enum" AS ENUM('all', 'premium', 'non_premium', 'custom');--> statement-breakpoint
CREATE TABLE "app_feature_flag_target" (
	"id" serial PRIMARY KEY NOT NULL,
	"flag_key" text NOT NULL,
	"target_mode" "target_mode_enum" DEFAULT 'all' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_feature_flag_target_flag_key_unique" UNIQUE("flag_key")
);
--> statement-breakpoint
CREATE TABLE "app_feature_flag_user" (
	"id" serial PRIMARY KEY NOT NULL,
	"flag_key" text NOT NULL,
	"user_id" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_feature_flag_user" ADD CONSTRAINT "app_feature_flag_user_flag_key_app_feature_flag_target_flag_key_fk" FOREIGN KEY ("flag_key") REFERENCES "public"."app_feature_flag_target"("flag_key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_feature_flag_user" ADD CONSTRAINT "app_feature_flag_user_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flag_user_unique_idx" ON "app_feature_flag_user" USING btree ("flag_key","user_id");--> statement-breakpoint
CREATE INDEX "feature_flag_user_key_idx" ON "app_feature_flag_user" USING btree ("flag_key");