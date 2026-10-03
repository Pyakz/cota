import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { inventory, products } from '../db/schema.ts'
import { searchInventory } from '../lib/search.ts'

// Only fetches rows and passes them to the pure search function in src/lib/.
export const searchInventoryFn = createServerFn({ method: 'GET' })
  .validator((data: { query: string }) => ({
    query: String(data.query ?? '').slice(0, 100),
  }))
  .handler(async ({ data }) => {
    const [productRows, inventoryRows] = await Promise.all([
      db.select({ sku: products.sku, name: products.name, unitsPerCase: products.unitsPerCase }).from(products),
      db.select({ sku: products.sku, location: inventory.location, cases: inventory.cases })
        .from(inventory)
        .innerJoin(products, eq(inventory.productId, products.id)),
    ])

    return searchInventory(data.query, productRows, inventoryRows)
  })
