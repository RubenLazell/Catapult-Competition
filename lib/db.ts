import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { Trial } from "./types";

// Server-only. DATABASE_URL is set automatically when Neon is added to the Vercel project.
type Sql = NeonQueryFunction<false, false>;

let sql: Sql | null = null;
let schemaReady: Promise<unknown> | null = null;

// Keep in sync with db/schema.sql.
function ensureSchema(db: Sql) {
  schemaReady ??= db`
    create table if not exists trials (
      id          bigint generated always as identity primary key,
      created_at  timestamptz not null default now(),
      session     text,
      shooter     text,
      draw_angle  numeric not null,
      front_pin   smallint not null,
      stop_pin    smallint not null,
      distance_in numeric not null,
      surface     text not null default 'hard',
      notes       text
    )`.catch((e) => {
    schemaReady = null;
    throw e;
  });
  return schemaReady;
}

export async function getDb(): Promise<Sql | null> {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  sql ??= neon(url);
  await ensureSchema(sql);
  return sql;
}

export const NOT_CONFIGURED = "Database is not configured. Set DATABASE_URL (add Neon from the Vercel Storage tab).";

export async function listTrials(db: Sql): Promise<Trial[]> {
  const rows = await db`
    select id::int as id, to_json(created_at) #>> '{}' as created_at, session, shooter,
           draw_angle::float8 as draw_angle, front_pin::int as front_pin, stop_pin::int as stop_pin,
           distance_in::float8 as distance_in, surface, notes
    from trials
    order by created_at desc, id desc`;
  return rows as Trial[];
}
