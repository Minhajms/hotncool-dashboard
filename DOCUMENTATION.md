# Hot N Cool — App Growth Dashboard: Full Documentation

> A complete, self-contained record of what this project is, how it was built, every
> account/service involved, every problem hit and how it was solved, and what remains.
> Written so that a new person (or a new AI with no prior context) can fully understand
> and continue the work.

---

## 1. What this is

An **automated growth dashboard** for **Hot N Cool**, a 60+ outlet restaurant chain in
Qatar with a food‑delivery app competing against aggregators (Talabat, Snoonu, Keeta,
Rafeeq). It pulls marketing/app data from many sources **automatically every day** and
shows it in one simple website, so a non‑technical manager can answer:

- What happened (yesterday, this week, or any custom date range)?
- What did we spend and what did we get?
- How is it trending?

**Live site:** https://hotncool-dashboard-6kvx.vercel.app
**Code:** https://github.com/Minhajms/hotncool-dashboard

The owner is **not a developer**. All code was written by the assistant; the owner only
performs account logins / authorizations that cannot be delegated.

---

## 2. Tech stack (plain English)

| Piece | What it is | Why |
|------|------------|-----|
| **Next.js 16** (React, TypeScript, Tailwind) | The website itself | Pages + built‑in API routes in one app |
| **Supabase** (Postgres) | The database | Stores all numbers; browsable like a spreadsheet |
| **Vercel** | Hosting + daily timer (cron) | Auto‑deploys from GitHub; runs the daily refresh |
| **GitHub** | Code storage | Every push auto‑deploys to the live site |
| **Service account "robot"** | A Google identity that reads data without a human | Lets the dashboard fetch Google data unattended |

Data flow: **external APIs → `/api/fetch/*` routes → Supabase tables → dashboard pages**.
A daily Vercel cron (`/api/cron`, 08:00 Qatar) runs every fetch.

> ⚠️ **Next.js 16 note** (see `AGENTS.md`): this version has breaking changes vs older
> Next. `params`/`searchParams` are **Promises** (must be `await`ed). Docs are bundled at
> `node_modules/next/dist/docs/`. Read them before editing.

---

## 3. Accounts & services (what exists, who owns it)

**No new email/Gmail account was created.** The assistant authenticated using the owner's
existing accounts and created *project‑scoped* resources inside them.

- **GitHub:** repo `Minhajms/hotncool-dashboard` (owner authorized via device code).
- **Vercel:** account `minhajms` / team scope `minhaj003`, project `hotncool-dashboard-6kvx`
  (a duplicate empty `hotncool-dashboard` project also exists — ignore it).
- **Supabase:** project ref `gwqfohcncrrsohcacihl` (region Tokyo), free tier.
- **Google Cloud:** project `hotncool-dash-35909`, created via `gcloud`, signed in as
  `minhajminnu580@gmail.com`. Inside it:
  - **APIs enabled:** Search Console, GA4 Data + Admin, Play Developer Reporting, Cloud
    Storage, Analytics Data.
  - **Service account ("the robot"):** `dashboard-fetcher@hotncool-dash-35909.iam.gserviceaccount.com`
    with a JSON key. This robot is added as a *user* on the various Google properties so it
    can read their data unattended. **This is not a Gmail account** — it's a machine identity.
- **Meta Business:** business `HOT N COOL` (id `2386002491660215`), ad account
  `act_561606594634055`. A **System User** named "Dashboard Bot" was created with a
  **permanent token** (`ads_read`) tied to the app "HOTNCOOL Food Delivery".
- **Microsoft Clarity:** project "HotNCool Qatar" (id `x71ydgcic1`), a Data Export API token.
- **App Store Connect:** an **API key** (`.p8` + Key ID `4WBFMQTQZX`) — *Issuer ID and
  Vendor Number still pending*.
- **Google Play Console:** developer account "HOTNCOOL Food Delivery" (id `7309818288803614384`).

**Key people:** *Arif* (WhatsApp "Hncapp Arif") is the admin who grants access on Google
Play / App Store / Clarity. Meta admins: Justin James, HNC GROUP (`info@hnccafe.com`).

---

## 4. Local machine setup (all installed to `~/.local`, no admin password needed)

- **Node.js v24.18.0** → `~/.local/node/bin` (system had none). Installed by extracting the
  official macOS arm64 tarball (avoids the sudo `.pkg` installer).
- **GitHub CLI (`gh`)** and **Vercel CLI** → `~/.local/bin`.
- **Google Cloud SDK (`gcloud`)** → `~/.local/google-cloud-sdk`.
- **Standalone Python 3.12** → `~/.local/python312` (gcloud refused to run on the system's
  Python 3.9). `gcloud` is pointed at it via `CLOUDSDK_PYTHON`.
- PATH + `CLOUDSDK_PYTHON` are persisted in `~/.zshrc`.

---

## 5. Database tables (Supabase)

All timestamps stored UTC; displayed in Qatar time (UTC+3). Weeks run **Thursday→Wednesday**,
anchored `2026-06-18`. All tables have Row‑Level Security **on with no public policies** — the
app only reads/writes server‑side with the **secret key** (which bypasses RLS), so the browser
never touches the database directly.

| Table | Holds | Filled by |
|-------|-------|-----------|
| `weekly_metrics` | Verified weekly baseline (installs/orders/spend) | Seeded once (manual history) |
| `daily_metrics` | Daily installs/orders/spend | Manual upload / form (later App Store + Play + Orders) |
| `search_console_daily` | Clicks, impressions, CTR, position | Search Console API |
| `ga4_daily` | Users, sessions per channel | GA4 Data API |
| `meta_spend_daily` | Spend + link clicks per campaign per day | Meta Marketing API |
| `clarity_daily` | Sessions, users, iOS/Android, engagement, dead/rage taps | Clarity Export API |
| `orders` | Order‑level rows (for ARR) | *Backend Orders API (pending)* |
| `upload_log` | Record of manual uploads | Upload page |
| `app_meta` | Lifetime figures (iOS downloads 22,710; Android base 1,594) | Seeded |

Schema files: `supabase/schema.sql` (initial), `supabase/002_clarity.sql`.

**Baseline seeded** (Thu→Wed weeks): W1 Jun 18–24 = 169 installs / 77 orders / QAR 0;
W2 Jun 25–Jul 1 = 312 / 112 / 164.28; W3 Jul 2–8 = 445 / 128 / 397.47.

---

## 6. Integrations — status, how they work, and gotchas

Each integration has a route `GET /api/fetch/<name>?key=CRON_SECRET` and is also run by the
daily aggregator `GET /api/cron`. All are guarded by the `CRON_SECRET` (Vercel Cron sends it
automatically as a Bearer header).

| # | Source | Status | Auth | Key gotcha solved |
|---|--------|--------|------|-------------------|
| 1 | **Google Search Console** | ✅ Live | Robot added as *Full* user | Property is a **Domain** property `sc-domain:hotncool.qa`, **not** the URL‑prefix `https://hotncool.qa/` — using the wrong one gives 403 |
| 2 | **GA4** | ✅ Live | Robot added as *Viewer* | Needs the **numeric Property ID** (`402884012`), not the `G-XXXX` measurement id |
| 3 | **Meta Ads** | ✅ Live | System‑user permanent token (`ads_read`) | Token generation needed a **second‑admin approval**; the app had to be **assigned to the system user** first; "Results" were actually **link clicks** (app‑install conversions aren't tracked) so they're labeled honestly |
| 4 | **Microsoft Clarity** | ✅ Live | Data Export API token (Bearer) | API only returns the **last 1–3 days aggregated** (max ~10 calls/day) → we snapshot one day each morning and build history. Token must be an **admin**‑generated one |
| 5 | **Google Play (Android installs)** | ⏳ Pending | Robot needs account‑level *"View app info and download bulk reports"* | Install data = **UTF‑16 CSVs** in Google Cloud Storage bucket `pubsite_prod_7309818288803614384` at `stats/installs/`. Currently **403** — Google can take up to ~24h to apply bucket access. Code not yet written |
| 6 | **App Store Connect (iOS installs)** | ⏳ Pending | `.p8` API key + Issuer ID + Vendor Number | Apple, not Google — needs a `.p8` key (have it), plus **Issuer ID** and **Vendor Number** (or the app's numeric Apple ID). Free apps still have a Vendor Number (it's an account report id, not payment) |
| 7 | **Backend Orders API** | ⏳ Pending | API key (to be provided) | Powers the **ARR** page. Tech team must build it — see `docs/orders-api-request.md` |

---

## 7. Environment variables

Stored in `.env.local` (git‑ignored) **and** in Vercel (production/preview/development).
Never committed. `NEXT_PUBLIC_*` are browser‑safe; everything else is server‑only.

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public Supabase key (unused client‑side currently) |
| `SUPABASE_SECRET_KEY` | Server‑only DB key (bypasses RLS) |
| `CRON_SECRET` | Guards `/api/fetch/*` and `/api/cron` |
| `GSC_SA_KEY_B64` | Base64 of the robot's service‑account JSON |
| `GSC_SITE_URL` | `sc-domain:hotncool.qa` |
| `GA4_PROPERTY_ID` | `402884012` |
| `META_ACCESS_TOKEN` | Meta system‑user token |
| `META_AD_ACCOUNT_ID` | `act_561606594634055` |
| `CLARITY_TOKEN` | Clarity Data Export token |
| `APPSTORE_P8_B64` / `APPSTORE_KEY_ID` | App Store key (Issuer ID/Vendor still needed) |

---

## 8. Dashboard pages

- **Overview** (`/`) — the main view. A **global date picker** (Yesterday / Last 7 / Last 30 /
  This month / All time / custom range) drives every number and chart. Shows a plain‑English
  summary, headline results (installs, orders, spend, cost/install), audience & reach
  (visitors, sessions, search clicks, app sessions), and per‑day line charts.
- **Trends** — week‑over‑week history table + charts from the verified weekly baseline.
- **Meta Ads** — spend, link clicks, cost/click, daily spend chart, per‑campaign table (also
  respects the date picker).
- **ARR** — Active / Retained / Recovered customers. Shows a "waiting for data" state until the
  backend Orders API is delivered; includes the exact request to send the tech team.
- **Upload** — manual fallback: a daily‑figures form **and** an Excel/CSV importer (writes to
  `daily_metrics`).

Every page is server‑rendered fresh (`dynamic = "force-dynamic"`) and shows a "last updated"
timestamp in Qatar time.

---

## 9. Problems encountered and how they were solved

1. **No Node / no admin rights** → installed Node, gh, vercel, gcloud, Python to `~/.local`
   from tarballs; PATH via `~/.zshrc`. No sudo used.
2. **gcloud wouldn't run** (system Python 3.9 unsupported) → installed standalone Python 3.12
   and set `CLOUDSDK_PYTHON`.
3. **Search Console 403** despite access → the robot was on the **Domain** property, but the
   code queried the **URL‑prefix** one. Fixed `GSC_SITE_URL` to `sc-domain:hotncool.qa`.
4. **Owner isn't admin** on GA4 / Search Console / Play / App Store / Clarity → those grants
   were routed to **Arif** (admin) via ready‑to‑send messages.
5. **Meta token** → required creating a **System User**, assigning the **app** to it, then a
   **second admin's approval**. Also relabeled "results" → "link clicks" for honesty.
6. **Long tokens mis‑typed** → a 700‑char token transcribed by hand introduced errors (an
   invalid non‑hex character in the JWT). Fixed by reading exact bytes from files / the macOS
   clipboard (`pbpaste`) instead of retyping.
7. **Vercel env changes not taking effect** → env vars apply at **build time**; a redeploy is
   required after changing them.
8. **Play Console bucket 403** → needs the account‑level bulk‑reports permission; Google's
   propagation to the storage bucket can take hours. Still pending.

---

## 10. How to operate

- **See data for any period:** open the site → use the 📅 date picker (top right).
- **Add data manually:** Upload page → daily form, or drag a CSV/XLSX with columns
  `date, ios_installs, android_installs, orders, spend_qar`.
- **Force a refresh now:** `GET /api/cron?key=<CRON_SECRET>` (or a specific
  `/api/fetch/<source>?key=<CRON_SECRET>`).
- **Daily auto‑refresh:** Vercel Cron hits `/api/cron` at 05:00 UTC (08:00 Qatar) — see
  `vercel.json`.
- **Local dev:** `npm run dev` (needs `.env.local`). **Deploy:** push to `main`.

---

## 10b. Agency-POC layer (added later)

- **Global date engine** (`src/lib/range.ts`): presets Yesterday / Last 7 / Last 30 / This month /
  All time / custom, via URL params. Every data page respects it; it hides itself on pages where
  dates have no meaning (ARR, Upload, Sources). Pages state exactly which days their numbers cover,
  and ranges ending today are marked "today is partial".
- **Insights engine** (`src/lib/insights.ts`): plain-English problems + recommendations, rendered
  on Overview ("What this means") and App Insights (e.g. dead-taps severity naming the worst
  screen; iOS/Android priority; branded vs non-brand search advice).
- **/sources** — coverage map: per-source status (Live / Connecting / Not connected), what it
  tracks, and "Data through <date>" freshness.
- **/app-insights** — full Clarity mirror (sessions, engagement, dead/rage taps, screens chart,
  countries, per-day trend), range-aware, honest about how many days of saved history exist.
- **QA audit fixes worth knowing:** footer "Last updated" now checks ALL source tables (was only
  2 → could show stale time); CSV/Excel upload only writes the columns present in the file (was
  zeroing API-fetched installs when uploading partial files); "Active campaigns" → "Campaigns
  with spend"; multi-day "People" shown as avg/day (summing daily uniques double-counts).
- **Known gap:** Firebase (app DAU/WAU/MAU, retention, crash-free) not connected — needs the
  app's Firebase/GA4 property ID + robot Viewer access. Website GA4 (402884012) is separate and live.

## 11. What's left

1. **Play Console** — wait for Google to apply bucket access, then write the install‑CSV parser.
2. **App Store** — get **Issuer ID + Vendor Number** (or app Apple ID); then write the iOS fetch.
3. **Backend Orders API** — tech team builds it → integrate → **ARR page goes live** (Active /
   Retained / Recovered + real orders & revenue). Request spec: `docs/orders-api-request.md`.
