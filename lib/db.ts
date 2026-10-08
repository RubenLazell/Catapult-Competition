import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { Trial } from "./types";
import { normalizeDesign, type DesignSpace } from "./design";

// Server-only. DATABASE_URL is set automatically when Neon is added to the Vercel project.
type Sql = NeonQueryFunction<false, false>;

let sql: Sql | null = null;
let schemaReady: Promise<unknown> | null = null;

// Keep in sync with db/schema.sql.
async function createTables(db: Sql) {
  await db`
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
    )`;
  await db`
    create table if not exists design_config (
      id         int primary key default 1 check (id = 1),
      config     jsonb not null,
      updated_at timestamptz not null default now()
    )`;
}

function ensureSchema(db: Sql) {
  schemaReady ??= createTables(db).catch((e) => {
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

export async function getDesign(db: Sql): Promise<DesignSpace> {
  const rows = await db`select config from design_config where id = 1`;
  return normalizeDesign(rows[0]?.config);
}

export async function saveDesign(db: Sql, design: DesignSpace): Promise<void> {
  await db`
    insert into design_config (id, config) values (1, ${JSON.stringify(design)}::jsonb)
    on conflict (id) do update set config = excluded.config, updated_at = now()`;
}
