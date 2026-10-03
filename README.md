# CoTa warehouse app

A small mobile-first tool for warehouse staff: search stock, work out open-shelf
replenishment, and build a pick list in walking order.

Stack: TanStack Start (React, file routes, server functions), Postgres with Drizzle ORM,
Tailwind CSS, Vitest.

## Setup

Requirements: Node 22+, Docker (for local Postgres).

```bash
docker compose up -d                     # local Postgres 16 on port 5432
npm install
npm run db:migrate                       # apply the schema in drizzle/
npm run db:seed                          # load the assessment data (safe to re-run)
npm run dev                              # http://localhost:3000
npm test                                 # unit tests
```

Create `.env.local` in the project root. It needs one variable:

```bash
DATABASE_URL=postgres://cota:cota@localhost:5432/cota
```

Production build: `npm run build`, then `node .output/server/index.mjs` with `DATABASE_URL`
set. The app is a standard Nitro server, so it runs on any Node-compatible host.

**Deployed URL:** not deployed yet. See "Deployment status" below.

## Screens

| Route | What it does |
|---|---|
| `/` | Search by SKU or product name (case-insensitive, partial match). Shows every location, total cases, total units. A blank query lists all products. The query is in the URL. |
| `/replenish` | Pick a SKU with an open shelf. Shows capacity, units on shelf, units needed, complete cases to pull, and what to do with any leftover units. |
| `/pick` | Enter SKU and case lines. Shows a numbered walk order by aisle, rack, shelf. Insufficient stock is reported as an error, with no partial picks for that SKU. The request is in the URL. |

## Architecture

Business logic is pure TypeScript with no database or framework imports. Server functions
only read rows and pass them in.

```
src/lib/location.ts     parse "A10-R2-S1" and compare numerically (never sort strings)
src/lib/search.ts       search + totals                     (tests: search.test.ts)
src/lib/replenish.ts    open-shelf maths                    (tests: replenish.test.ts)
src/lib/picklist.ts     allocation, errors, walk order      (tests: picklist.test.ts)
src/server/*.ts         createServerFn: fetch rows, call lib
src/routes/*.tsx        UI: index (search), replenish, pick
src/db/schema.ts        Drizzle schema
src/db/seed.ts          assessment data
drizzle/                generated SQL migrations
```

Because the rules are pure functions, the 23 unit tests run without a database.

## Database schema

Three tables. Stock is always whole cases.

**`products`**: one row per SKU.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | UUID v7, generated in the app |
| `sku` | text | unique |
| `name` | text | |
| `units_per_case` | integer | must be > 0 |

**`inventory`**: one row per SKU per storage location.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `product_id` | uuid (FK → products, cascade delete) | |
| `location` | text | format `A{aisle}-R{rack}-S{shelf}`, checked by a constraint |
| `cases` | integer | ≥ 0. Unique on (`product_id`, `location`) |

**`shelves`**: open-shelf (pick face) levels, one row per SKU.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `product_id` | uuid (FK → products, cascade delete, unique) | |
| `capacity_units` | integer | > 0 |
| `current_units` | integer | 0 ≤ current ≤ capacity |

Seed data: the five SKUs from the brief (TURTLE-01 is the only one with stock in two locations), plus
PANDA-05 with no stock and an empty shelf, to show the out-of-stock path. The open-shelf levels for
SKUs other than TURTLE-01 are demo values, not from the brief.

## Assumptions and limitations

- **Replenishment rounds up to whole cases.** For TURTLE-01 (60 capacity, 17 on shelf, 12 per case)
  the app says pull 4 cases (48 units), leaving 5 units that won't fit. Those 5 go back to storage as
  a partial case. Pulling 3 cases would leave the shelf 7 units short. I chose 4 because a short
  shelf stops picking, and an extra 5 units is a smaller problem. The partial case is recorded by hand
  because storage only models full cases.
- **Pick lists are all-or-nothing per SKU.** If a SKU can't be filled, its lines are dropped and an
  error explains why. The other SKUs still get picks.
- **Repeated SKUs on one request are added together** before the stock check.
- **Stock is taken from the lowest aisle first**, and only locations with cases > 0 are used.
- **No login, no stock movements, no audit trail.** The brief didn't ask for them. Changing stock
  would need the Part 5 movement log.
- **Open-shelf levels for SHARK-02, MOOSE-03, ALIEN-04 and PANDA-05 are invented** for the demo.
  Only TURTLE-01's values come from the brief.
- **Input is loosely validated.** Text fields are length-limited, and counts are checked in the pure
  pick-list function. Good enough for the assessment, not for production.
- **Not yet done:** deployment, offline support (Part 5), and video (Part 4, written only).

## Deployment status

The app builds and runs locally. Deployment needs a Postgres database (Neon or Supabase) and a
Netlify or Vercel account, which I haven't set up. Steps:

1. Create a hosted Postgres database and set its URL as `DATABASE_URL` in the host's environment.
2. Run `npm run db:migrate` and `npm run db:seed` against that database.
3. Deploy the repo. Build command `npm run build`. Set the host's Nitro preset if it's not Node.
4. Put the live URL here.

## Part 4: AI video design (written answer)

The core rule: AI proposes, a human approves, and only approved results change inventory.

1. **Study and standardize the scanning process.** Watch workers first, then standardize one routine. Workers differ: one person films too fast, another films from far away. Consistent videos make the AI far more accurate.
2. **Capture and processing.** Upload the video, sample the sharpest frames, and let a vision model read SKUs and count cases in the background.
3. **Location context.** It comes from the scanned barcode, never from the AI. No barcode, no upload.
4. **Output structure.** Strict JSON per location: SKU, count, confidence, and evidence frames. Invalid output goes to review.
5. **Measuring accuracy.** Compare against hand counts, and measure SKU recognition and counting separately.
6. **Uncertain results.** Low confidence or a mismatch with the system goes to review. In the first version, a human approves everything.
7. **Protecting inventory.** The AI writes only to a staging table. Only a human approval changes inventory, so the reviewer's approve or reject is the gate.
8. **What to save.** Video, AI output, model version, corrections, and who approved what and when.
9. **Review and correction.** One card per location showing the AI count next to the system count, with Approve or Correct:

   ```
   ┌─────────────────────────────┐
   │ A4-R1-S2 · TURTLE-01        │
   │ AI saw: 6 cases             │
   │ System says: 7 cases        │
   │                             │
   │ [ Approve ]   [ Correct ]   │
   └─────────────────────────────┘
   ```

10. **Prototype first.** Start with photos of one aisle plus the review screen. Add video only once accuracy is good enough.

## Part 5: Offline reliability (written answer)

1. **Lost work.** Save every action on the phone first, then sync when the internet comes back.
2. **Duplicates.** Every action gets a unique ID, so if the phone sends it twice, the server applies it only once.
3. **Confusing results.** Record changes like "picked 3 cases," not "set to 15." Show what's still waiting to sync, and let a person resolve real conflicts. For example, Ana's phone saves "minus 3" and Ben's saves "minus 2." The server applies both: 18 − 3 − 2 = 13. The order doesn't matter, so the result is always correct.

---

Honestly, with this scale you can formulate solutions quickly, even with AI generating answers, but there are still edge cases to consider before building the whole app and infrastructure.
# cota
