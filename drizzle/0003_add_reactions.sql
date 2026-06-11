CREATE TABLE IF NOT EXISTS "reactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "post_slug" varchar(255) NOT NULL,
  "type" varchar(20) NOT NULL DEFAULT 'like',
  "count" integer NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS "reactions_slug_type_idx" ON "reactions" ("post_slug", "type");
