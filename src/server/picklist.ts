import { createServerFn } from '@tanstack/react-start'
import { eq, inArray, sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { inventory, products } from '../db/schema.ts'

// Fetches the product and stock rows for the requested SKUs. The allocation logic lives in src/lib/picklist.ts.
export const getPickDataFn = createServerFn({ method: 'GET' })
  .validator((data: { skus: string[] }) => ({
    skus: (Array.isArray(data.skus) ? data.skus : []).map((s) => String(s).slice(0, 50)).slice(0, 50),
  }))
  .handler(async ({ data }) => {
    if (data.skus.length === 0) return { products: [], inventory: [] }

    const [productRows, inventoryRows] = await Promise.all([
      db
        .select({ sku: products.sku, name: products.name, unitsPerCase: products.unitsPerCase })
        .from(products)
        .where(inArray(products.sku, data.skus)),
      db
        .select({ sku: products.sku, location: inventory.location, cases: inventory.cases })
        .from(inventory)
        .innerJoin(products, eq(inventory.productId, products.id))
        .where(inArray(products.sku, data.skus)),
    ])

    return { products: productRows, inventory: inventoryRows }
  })

// All SKUs for the pick-list dropdown, sorted by SKU.
// storedCases is the total cases in storage for that SKU (0 when it has no locations).
export const getProductOptionsFn = createServerFn({ method: 'GET' }).handler(async () => {
  return db
    .select({
      sku: products.sku,
      name: products.name,
      storedCases: sql<number>`coalesce(sum(${inventory.cases}), 0)::int`,
    })
    .from(products)
    .leftJoin(inventory, eq(inventory.productId, products.id))
    .groupBy(products.sku, products.name)
    .orderBy(products.sku)
})
