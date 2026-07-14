create table if not exists clarity_daily (
  date                date primary key,
  sessions            int default 0,
  distinct_users      int default 0,
  bot_sessions        int default 0,
  screens_per_session numeric(8,2) default 0,
  engagement_total    int default 0,
  engagement_active   int default 0,
  dead_taps           int default 0,
  rage_taps           int default 0,
  errors              int default 0,
  ios_sessions        int default 0,
  android_sessions    int default 0,
  top_country         text,
  updated_at          timestamptz default now()
);
alter table clarity_daily enable row level security;
