-- Run this once in the Supabase SQL Editor.
create table if not exists public.trials (
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

create index if not exists trials_settings_idx on public.trials (front_pin, stop_pin, draw_angle);

-- RLS on with no policies: only the server (secret/service key) can read or write.
alter table public.trials enable row level security;
