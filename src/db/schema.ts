import { relations, sql } from 'drizzle-orm'
import { check, integer, pgTable, text, uuid, unique } from 'drizzle-orm/pg-core'
import { v7 as uuidv7 } from 'uuid'

// Primary keys are UUID v7 (time-ordered), generated in the app.
const id = () => uuid().primaryKey().$defaultFn(() => uuidv7())

export const products = pgTable(
  'products',
  {
    id: id(),
    sku: text().notNull().unique(),
    name: text().notNull(),
    unitsPerCase: integer('units_per_case').notNull(),
  },
  (t) => [check('products_units_per_case_positive', sql`${t.unitsPerCase} > 0`)],
)

// One row per product per storage location. Stock is always whole cases.
export const inventory = pgTable(
  'inventory',
  {
    id: id(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    location: text().notNull(), // format A{aisle}-R{rack}-S{shelf}
    cases: integer().notNull(),
  },
  (t) => [
    unique().on(t.productId, t.location),
    check('inventory_cases_non_negative', sql`${t.cases} >= 0`),
    check(
      'inventory_location_format',
      sql`${t.location} ~ '^A[0-9]+-R[0-9]+-S[0-9]+$'`,
    ),
  ],
)

// Open-shelf (pick face) capacity and current level, one row per product.
export const shelves = pgTable(
  'shelves',
  {
    id: id(),
    productId: uuid('product_id')
      .notNull()
      .unique()
      .references(() => products.id, { onDelete: 'cascade' }),
    capacityUnits: integer('capacity_units').notNull(),
    currentUnits: integer('current_units').notNull(),
  },
  (t) => [
    check('shelves_capacity_positive', sql`${t.capacityUnits} > 0`),
    check(
      'shelves_current_within_capacity',
      sql`${t.currentUnits} >= 0 AND ${t.currentUnits} <= ${t.capacityUnits}`,
    ),
  ],
)

export const productsRelations = relations(products, ({ many, one }) => ({
  inventory: many(inventory),
  shelf: one(shelves),
}))

export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
}))

export const shelvesRelations = relations(shelves, ({ one }) => ({
  product: one(products, {
    fields: [shelves.productId],
    references: [products.id],
  }),
}))
