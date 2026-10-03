import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { v7 as uuidv7 } from 'uuid'
import { inventory, products, shelves } from './schema'

// Same env files as drizzle.config.ts, since tsx does not load .env.local by itself.
config({ path: ['.env.local', '.env'] })

// Fixed assessment data. Re-running the seed replaces these rows, so it is safe to repeat.
const productRows = [
  { sku: 'TURTLE-01', name: 'Sea Turtle Plush', unitsPerCase: 12 },
  { sku: 'SHARK-02', name: 'Shark Plush', unitsPerCase: 8 },
  { sku: 'MOOSE-03', name: 'Moose Plush', unitsPerCase: 6 },
  { sku: 'ALIEN-04', name: 'Alien Plush', unitsPerCase: 12 },
  // Zero-stock product: no inventory rows and an empty open shelf, for testing out-of-stock cases.
  { sku: 'PANDA-05', name: 'Panda Plush', unitsPerCase: 6 },
]

// Location rows refer to products by SKU; the seed turns that into the product UUID.
const inventoryRows = [
  { sku: 'TURTLE-01', location: 'A1-R2-S1', cases: 18 },
  { sku: 'TURTLE-01', location: 'A4-R1-S2', cases: 7 },
  { sku: 'SHARK-02', location: 'A2-R3-S1', cases: 14 },
  { sku: 'MOOSE-03', location: 'A5-R1-S1', cases: 9 },
  { sku: 'ALIEN-04', location: 'A3-R4-S2', cases: 4 },
]

// Open-shelf (pick face) levels. TURTLE-01 is from the brief; the others (incl. PANDA-05) are invented
// demo values so the replenish page has more than one SKU to show. Each current level is <= capacity.
const openShelfRows = [
  { sku: 'TURTLE-01', capacityUnits: 60, currentUnits: 17 },
  { sku: 'SHARK-02', capacityUnits: 40, currentUnits: 13 },
  { sku: 'MOOSE-03', capacityUnits: 36, currentUnits: 30 },
  { sku: 'ALIEN-04', capacityUnits: 48, currentUnits: 12 },
  { sku: 'PANDA-05', capacityUnits: 24, currentUnits: 0 },
]

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = drizzle(pool)

  await db.transaction(async (tx) => {
    // Children first, then parents, so foreign keys never block the clear.
    await tx.delete(inventory)
    await tx.delete(shelves)
    await tx.delete(products)

    const productIds = new Map<string, string>()
    const insertedProducts = productRows.map((p) => {
      const id = uuidv7()
      productIds.set(p.sku, id)
      return { id, ...p }
    })
    await tx.insert(products).values(insertedProducts)

    const productId = (sku: string) => {
      const id = productIds.get(sku)
      if (!id) throw new Error(`Seed refers to unknown SKU ${sku}`)
      return id
    }

    await tx.insert(inventory).values(
      inventoryRows.map(({ sku, location, cases }) => ({
        id: uuidv7(),
        productId: productId(sku),
        location,
        cases,
      })),
    )
    await tx.insert(shelves).values(
      openShelfRows.map(({ sku, capacityUnits, currentUnits }) => ({
        id: uuidv7(),
        productId: productId(sku),
        capacityUnits,
        currentUnits,
      })),
    )
  })

  console.log(
    `Seeded ${productRows.length} products, ${inventoryRows.length} inventory rows, ${openShelfRows.length} open shelves.`,
  )
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
