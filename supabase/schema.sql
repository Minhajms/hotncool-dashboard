-- Hot N Cool — App Growth Dashboard schema + baseline seed
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT).
-- Timezone rule: store timestamps in UTC; weeks run Thursday→Wednesday, anchored 2026-06-18.

-- =========================================================
-- TABLES
-- =========================================================

-- Weekly rollups (Thu–Wed). Holds the verified baseline history and future weekly totals.
create table if not exists weekly_metrics (
  week_start       date primary key,          -- Thursday
  week_end         date not null,             -- Wednesday
  week_number      int,                        -- 1 = week of 2026-06-18
  installs         int,                        -- total installs (iOS + Android)
  ios_installs     int,
  android_installs int,
  orders           int,
  spend_qar        numeric(12,2),
  source           text default 'manual',      -- 'manual' | 'api'
  updated_at       timestamptz default now()
);

-- Daily granular metrics (filled by the API integrations going forward).
create table if not exists daily_metrics (
  metric_date      date primary key,
  ios_installs     int default 0,
  android_installs int default 0,
  orders           int default 0,
  spend_qar        numeric(12,2) default 0,
  source           text default 'api',
  updated_at       timestamptz default now()
);

-- Google Search Console daily (hotncool.qa)
create table if not exists search_console_daily (
  date        date primary key,
  clicks      int default 0,
  impressions int default 0,
  ctr         numeric(6,4) default 0,
  position    numeric(6,2) default 0,
  updated_at  timestamptz default now()
);

-- GA4 daily (per channel)
create table if not exists ga4_daily (
  date       date not null,
  channel    text not null,
  users      int default 0,
  sessions   int default 0,
  updated_at timestamptz default now(),
  primary key (date, channel)
);

-- Meta (Facebook/Instagram) ad spend daily, per campaign
create table if not exists meta_spend_daily (
  date          date not null,
  campaign_id   text not null,
  campaign_name text,
  spend_qar     numeric(12,2) default 0,
  results       int default 0,
  updated_at    timestamptz default now(),
  primary key (date, campaign_id)
);

-- Orders (fed by the Hot N Cool backend orders API later; powers the ARR page)
create table if not exists orders (
  order_id        text primary key,
  ordered_at      timestamptz not null,
  order_value_qar numeric(12,2),
  customer_id     text,
  platform        text,                        -- 'ios' | 'android'
  updated_at      timestamptz default now()
);

-- Log of manual uploads
create table if not exists upload_log (
  id          bigint generated always as identity primary key,
  filename    text,
  uploaded_at timestamptz default now(),
  rows        int,
  note        text
);

-- Single-value app facts (lifetime downloads, active base, etc.)
create table if not exists app_meta (
  key        text primary key,
  value      numeric,
  updated_at timestamptz default now()
);

-- =========================================================
-- SECURITY: enable row-level security with NO public policies.
-- The app talks to the DB only from the server with the secret key,
-- which bypasses RLS. The public/publishable key therefore sees nothing.
-- =========================================================
alter table weekly_metrics       enable row level security;
alter table daily_metrics        enable row level security;
alter table search_console_daily enable row level security;
alter table ga4_daily            enable row level security;
alter table meta_spend_daily     enable row level security;
alter table orders               enable row level security;
alter table upload_log           enable row level security;
alter table app_meta             enable row level security;

-- =========================================================
-- SEED: verified baseline (Jun 18 – Jul 8, 2026). Weeks are Thu→Wed.
-- =========================================================
insert into weekly_metrics
  (week_start, week_end, week_number, installs, ios_installs, android_installs, orders, spend_qar, source)
values
  ('2026-06-18','2026-06-24',1,169, 69, 100, 77,   0.00, 'manual'),
  ('2026-06-25','2026-07-01',2,312, null, null,112, 164.28,'manual'),
  ('2026-07-02','2026-07-08',3,445, null, null,128, 397.47,'manual')
on conflict (week_start) do update set
  week_end         = excluded.week_end,
  week_number      = excluded.week_number,
  installs         = excluded.installs,
  ios_installs     = excluded.ios_installs,
  android_installs = excluded.android_installs,
  orders           = excluded.orders,
  spend_qar        = excluded.spend_qar,
  source           = excluded.source,
  updated_at       = now();

insert into app_meta (key, value) values
  ('lifetime_ios_downloads', 22710),
  ('android_active_base',      1594)
on conflict (key) do update set value = excluded.value, updated_at = now();
