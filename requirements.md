# CoTa warehouse assessment — project context

Take-home for "AI Automation & Applications Developer". About 3 hours total.
The graders value simplicity, correctness, and clear explanation over features or design.
Do not over-engineer. I must be able to explain every line in an interview.

## Deliverables
- Working app URL (deployed, opens on a phone)
- Git repo
- README: setup steps, schema description, short architecture explanation,
  assumptions and known limitations, Part 4 and Part 5 written answers

## Stack
- TanStack Start (React, file-based routing, `createServerFn` for server functions)
- Hosted DB: Neon or Supabase Postgres with Drizzle (NOT a local SQLite file; serverless hosts don't persist files)
- Tailwind for styling, mobile-first (~375px), large tap targets
- Vitest for unit tests
- Deploy on Netlify (`@netlify/vite-plugin-tanstack-start`) or Vercel (Nitro plugin). Deploy early.

## Seed data
| SKU | Product | Units/case | Location | Cases |
|---|---|---|---|---|
| TURTLE-01 | Sea Turtle Plush | 12 | A1-R2-S1 | 18 |
| TURTLE-01 | Sea Turtle Plush | 12 | A4-R1-S2 | 7 |
| SHARK-02 | Shark Plush | 8 | A2-R3-S1 | 14 |
| MOOSE-03 | Moose Plush | 6 | A5-R1-S1 | 9 |
| ALIEN-04 | Alien Plush | 12 | A3-R4-S2 | 4 |

Open shelf: TURTLE-01, capacity 60 units, current 17 units.

Location format: `A{aisle}-R{rack}-S{shelf}`. Aisle number = physical walking order.

## Schema (Drizzle)
- `products` (sku PK, name, units_per_case)
- `inventory` (id, sku FK, location, cases) — one row per SKU per location
- `shelves` (sku PK/FK, capacity_units, current_units)

## Architecture rule
Business logic lives in pure TypeScript functions in `src/lib/` with no DB or framework code.
Server functions only fetch rows and pass them in. This keeps logic testable and easy to explain.

```
src/lib/replenish.ts   src/lib/picklist.ts   src/lib/*.test.ts
src/server/inventory.ts
src/routes/index.tsx (search)  replenish.tsx  pick.tsx
db/schema.ts  db/seed.ts
```

## Part 1 — Search
Case-insensitive partial match on SKU or product name.
Show: SKU, name, units/case, every location with cases, total cases, total units.
Example: TURTLE-01 → 25 cases, 300 units.

## Part 2 — Replenishment (the trick question)
Needed = 60 − 17 = 43 units. 43 / 12 = 3.58 cases. Whole cases can't hit 43 exactly.
- 4 cases = 48 units → shelf full at 60, 5 units left over from the opened case
- 3 cases = 36 units → shelf at 53, 7 units short, no opened case

Decision: pull 4 cases (ceil) and clearly tell the employee:
"Pull 4 cases. 5 units won't fit. Return them to storage as a partial case."
The consequence: storage is modeled in full cases only, so a partial case breaks the model.
Document this choice in README assumptions. (Change here if I pick 3 cases instead.)

## Part 3 — Pick list
Request example: TURTLE-01 × 3, SHARK-02 × 2, ALIEN-04 × 1.
1. Allocate per SKU: take from locations sorted by aisle, lowest first, until satisfied.
2. If total available < requested: add an explicit error, do NOT add partial picks for that SKU.
3. Sort all pick lines by aisle, then rack, then shelf. Parse numbers; never sort strings ("A10" vs "A2").
Expected output for the example: A1 TURTLE-01 3 → A2 SHARK-02 2 → A3 ALIEN-04 1.

## Required tests
- Replenish: 60/17/12 → 4 cases, 5 leftover
- Pick list example → order A1, A2, A3
- TURTLE-01 × 20 → A1 18 + A4 2
- ALIEN-04 × 5 → error "requested 5, only 4 in stock", no pick line
- Sort puts A2 before A10

## Part 4 — AI video design (written only, ≤750 words, NO code)
Core message: AI proposes, a human approves, only approved results change inventory.
Answer each of the 10 questions in the brief with a short paragraph:
1. Study and standardize scanning: observe workers; routine = scan location barcode, then slow pan.
2. Capture and processing: phone video upload, sample frames, run a vision model.
3. Location context: from the scanned location barcode, not guessed by AI.
4. Output: JSON per location — sku, case_count, confidence, evidence frame ids.
5. Accuracy: compare against hand-counted ground truth; measure SKU recognition and count accuracy separately.
6. Uncertainty: confidence thresholds; low confidence or mismatch vs system → review queue.
7. Protection: AI output goes to a staging table, never directly to inventory.
8. Save: video, raw AI output, corrections, approver, timestamps (audit log + future eval data).
9. Review UI: per-location cards showing AI vs system count, Approve / Correct.
10. Prototype first: still photos of one aisle + review screen.
Optional mention: evaluate a decision model like TypeSafe's Jev (typed outputs, calibrated confidence, early access, text/JSON input only) for routing proposals, vs a standard LLM with structured outputs. Vision model still needed.

## Part 5 — Offline reliability (written only, ≤250 words)
- Lost work → save actions locally first (IndexedDB), sync in background.
- Duplicates → client-generated UUID per action; server ignores already-processed IDs (idempotency).
- Confusing results → show sync status and data age; record movements ("picked 3") not overwritten totals;
  flag real conflicts for a person instead of guessing.

## Time budget
Setup/DB/deploy 30m · Part 1 30m · Part 2 20m · Part 3 45m · README + writing 45m · buffer 10m