CREATE TABLE "rate_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"window_end" timestamp with time zone NOT NULL
);
