# Request: Daily Orders API for the Hot N Cool growth dashboard

Hi team 👋 — for our automated growth dashboard we need a **read‑only Orders API**. This
unlocks live orders, revenue, and customer‑retention (ARR) reporting. Below is exactly what
we need. Happy to jump on a call if useful.

## What we need
A secure HTTPS endpoint that returns order‑level data, filterable by date, so a server can
pull it once a day.

## Endpoint (suggested)
```
GET  https://<your-domain>/api/orders?from=YYYY-MM-DD&to=YYYY-MM-DD
```
- Support a **single day** (`?date=YYYY-MM-DD`) and a **date range** (`from` & `to`).
- Dates are **Qatar time (UTC+3)**.

## Authentication
- Protect it with an **API key** we send in a header, e.g. `x-api-key: <key>`.
- Please generate the key and share it with us securely.

## Fields per order (JSON)
| Field | Type | Notes |
|-------|------|-------|
| `order_id` | string | Unique per order |
| `order_datetime` | string | ISO 8601 with timezone, e.g. `2026-07-13T20:15:00+03:00` |
| `order_value` | number | In **QAR** (net order value) |
| `customer_id` | string | A stable customer id **or** a hashed phone number (so we can track repeat customers **without** exposing personal data) |
| `platform` | string | `ios` or `android` |
| `status` | string | *(optional but useful)* e.g. `completed`, `cancelled` |
| `outlet` | string | *(optional)* branch/outlet name or id |

## Example response
```json
[
  {
    "order_id": "A1234",
    "order_datetime": "2026-07-13T20:15:00+03:00",
    "order_value": 84.50,
    "customer_id": "c_9981",
    "platform": "ios",
    "status": "completed",
    "outlet": "West Bay"
  }
]
```

## Also please confirm
1. **Historical data**: can we fetch back to **8 June 2026** (or earlier)?
2. **Pagination**: if a day can exceed a few thousand orders, how is paging handled
   (e.g. `?page=` / `?cursor=` / `next` link)?
3. **Rate limits**: any limits we should respect (we'll call ~once/day).
4. **Customer privacy**: a hashed/anonymised `customer_id` is perfect — we do **not** need
   names, emails, or raw phone numbers.

## Why we need it
- **Revenue & orders** automation on the dashboard (today / this week / any date range).
- **ARR customer health**: Active (ordered in last 30 days), Retained (ordered this month AND
  last month), Recovered (ordered again after a 30+ day gap) — all computed from
  `customer_id` + `order_datetime`.

Once you share the **endpoint URL + API key + one example response**, we'll integrate it and
it will update automatically every day. Thank you! 🙏
