import { compareLocations } from './location'

export type ProductRow = { sku: string; name: string; unitsPerCase: number }
export type InventoryRow = { sku: string; location: string; cases: number }

export type LocationStock = { location: string; cases: number }

export type SearchResult = {
  sku: string
  name: string
  unitsPerCase: number
  locations: LocationStock[]
  totalCases: number
  totalUnits: number
}

// Case-insensitive partial match on SKU or product name.
// A blank query matches nothing, so the screen starts empty instead of listing everything.
export function searchInventory(
  query: string,
  products: ProductRow[],
  inventory: InventoryRow[],
): SearchResult[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return []

  return products
    .filter(
      (p) =>
        p.sku.toLowerCase().includes(needle) ||
        p.name.toLowerCase().includes(needle),
    )
    .map((p) => {
      const locations = inventory
        .filter((row) => row.sku === p.sku)
        .map((row) => ({ location: row.location, cases: row.cases }))
        .sort((a, b) => compareLocations(a.location, b.location))

      const totalCases = locations.reduce((sum, l) => sum + l.cases, 0)

      return {
        sku: p.sku,
        name: p.name,
        unitsPerCase: p.unitsPerCase,
        locations,
        totalCases,
        totalUnits: totalCases * p.unitsPerCase,
      }
    })
    .sort((a, b) => a.sku.localeCompare(b.sku))
}
