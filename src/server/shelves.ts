import { createServerFn } from '@tanstack/react-start'
import { eq, sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { inventory, products, shelves } from '../db/schema.ts'

// Returns the open-shelf row for one SKU, or null if the SKU has no shelf.
// Only fetches rows; the replenishment maths lives in src/lib/replenish.ts.
export const getShelfFn = createServerFn({ method: 'GET' })
  .validator((data: { sku: string }) => ({
    sku: String(data.sku ?? '').trim().slice(0, 50),
  }))
  .handler(async ({ data }) => {
    const [row] = await db
      .select({
        sku: products.sku,
        name: products.name,
        unitsPerCase: products.unitsPerCase,
        capacityUnits: shelves.capacityUnits,
        currentUnits: shelves.currentUnits,
      })
      .from(shelves)
      .innerJoin(products, eq(shelves.productId, products.id))
      .where(eq(products.sku, data.sku))

    return row ?? null
  })

// SKUs that have an open shelf, for the replenish dropdown.
export const getShelfOptionsFn = createServerFn({ method: 'GET' }).handler(async () => {
  return db
    .select({
      sku: products.sku,
      name: products.name,
      storedCases: sql<number>`coalesce(sum(${inventory.cases}), 0)::int`,
    })
    .from(shelves)
    .innerJoin(products, eq(shelves.productId, products.id))
    .leftJoin(inventory, eq(inventory.productId, products.id))
    .groupBy(products.sku, products.name)
    .orderBy(products.sku)
})
