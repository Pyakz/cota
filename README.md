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
| `/` | Search by SKU or product name (case-insensitive, partial match). Shows every location, total cases, total units. The query is in the URL. |
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

**1. Study and standardize scanning.** Before building anything I'd watch several workers count one
aisle and time each step. I'd then standardize one routine: scan the location barcode, then film a
slow, steady pan of the shelf face at a fixed height. Workers get a short checklist, and we measure
how often the routine is followed.

**2. Capture and processing.** The phone uploads the video to object storage with the location
attached. A background job samples frames, for example one per second, and keeps the sharpest. A
vision model reads SKU labels and counts visible cases. Processing runs asynchronously, so the
worker isn't blocked while it runs.

**3. Location context.** The location comes from the barcode the worker scanned, never from the AI.
Uploads without a location are rejected, so the model never has to guess where the shelf is.

**4. Output structure.** For each location the model returns strict JSON: `sku`, `case_count`,
a confidence value for each field, and the IDs of the frames it used as evidence. The server
validates this against a schema. Output that doesn't validate goes to review and isn't dropped.

**5. Measuring accuracy.** I'd hand-count a labelled set of videos to get ground truth. Then I'd
measure SKU recognition (precision and recall) and count accuracy (exact-match rate and average
error in cases) separately, since they fail differently. I'd break the results down by SKU, lighting,
and camera angle.

**6. Uncertain results.** Each field has a confidence threshold. A result goes to a review queue if
its confidence is low, if its SKU doesn't match the system record, or if its count differs from the
system by more than a set tolerance. In the first version nothing is accepted automatically.

**7. Protecting inventory.** AI output is written to a staging table, separate from inventory. Only
an approval action can change inventory, and it writes a movement record. The AI has no write path
to inventory tables.

**8. What to save.** The original video, the sampled frames, the raw model output and model version,
the system count at the time, the human's correction, the approver, and timestamps for each step.
This gives an audit trail and labelled data for future evaluation.

**9. Review and correction.** The review screen is phone-first, with one card per location. Each card
shows the scanned location, the AI's SKU and count with evidence frames, and the system count side by
side, with Approve and Correct buttons. Correct opens a SKU picker and a number input. Each decision
is recorded.

**10. Prototype first.** I'd start with still photos of one aisle (about 10 locations) and the review
screen, with no video and no inventory writes. That tests the riskiest parts, model accuracy and the
review workflow, at a fraction of the cost. Video upload comes only after accuracy meets an agreed
target.

## Part 5: Offline reliability (written answer)

**Lost work.** Every action (count, pick, correction) is saved to IndexedDB on the device first, then
synced to the server in the background. The screen shows "saved on this device" until the server
confirms, so closing the page or losing signal doesn't lose anything.

**Duplicate changes.** Each action gets a UUID v7 generated on the device when it's created. The
server stores the IDs it has processed. A retry with an ID it has already seen returns the original
result without applying the change again, so the sync is safe to repeat.

**Confusing results.** Stock changes are recorded as movements, such as "picked 3 cases from
A1-R2-S1", not as overwritten totals. Replaying or reordering the same movements gives the same
result. The app shows how many changes are waiting to sync and how old the data on screen is. When two
offline changes truly conflict, such as two people taking the last cases, the app flags the line for
a person to resolve instead of guessing.
