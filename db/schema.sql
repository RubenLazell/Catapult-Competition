-- Reference only: the app creates this table automatically on first use (lib/db.ts).
create table if not exists trials (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  session     text,                          -- e.g. "Oct 12 basement DOE"
  shooter     text,                          -- who released the arm
  draw_angle  numeric not null,              -- how far back the arm is drawn (degrees, side scale)
  front_pin   smallint not null,             -- front pin hole position
  stop_pin    smallint not null,             -- stop pin hole position
  distance_in numeric not null,              -- measured landing distance, inches
  surface     text not null default 'hard',  -- floor type
  notes       text
);

-- Design space for the next-shot recommender (single shared row).
create table if not exists design_config (
  id         int primary key default 1 check (id = 1),
  config     jsonb not null,
  updated_at timestamptz not null default now()
);
