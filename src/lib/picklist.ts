import { compareLocations } from './location'
import type { InventoryRow, ProductRow } from './search'

export type PickRequest = { sku: string; cases: number }

export type PickLine = {
  sequence: number
  sku: string
  name: string
  location: string
  cases: number
}

export type PickError = { sku: string; message: string }

export type PickListResult = {
  lines: PickLine[]
  errors: PickError[]
}

// Requests are typed as "TURTLE-01:3,SHARK-02:2" in the URL. Bad counts stay NaN so they are reported as errors.
export function parseRequest(text: string): PickRequest[] {
  return text
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token !== '')
    .map((token) => {
      const [sku = '', cases = ''] = token.split(':')
      return { sku: sku.trim().toUpperCase(), cases: Number(cases.trim()) }
    })
}

export function formatRequest(requests: PickRequest[]): string {
  return requests.map((r) => `${r.sku}:${r.cases}`).join(',')
}

// Builds the pick list for all requests. A SKU that cannot be filled in full gets an error and no lines.
export function buildPickList(
  requests: PickRequest[],
  products: ProductRow[],
  inventory: InventoryRow[],
): PickListResult {
  const errors: PickError[] = []

  // Combine repeated SKUs so "TURTLE-01 × 2" and "TURTLE-01 × 3" are checked as 5.
  const requested = new Map<string, number>()
  for (const { sku, cases } of requests) {
    if (!Number.isInteger(cases) || cases <= 0) {
      errors.push({ sku, message: `${sku}: case count must be a whole number above 0` })
      continue
    }
    requested.set(sku, (requested.get(sku) ?? 0) + cases)
  }

  const unsorted: Omit<PickLine, 'sequence'>[] = []

  for (const [sku, wanted] of requested) {
    const product = products.find((p) => p.sku === sku)
    if (!product) {
      errors.push({ sku, message: `${sku}: unknown SKU` })
      continue
    }

    // Lowest aisle first, so the picker walks the warehouse in one direction.
    const stock = inventory
      .filter((row) => row.sku === sku && row.cases > 0)
      .sort((a, b) => compareLocations(a.location, b.location))

    const available = stock.reduce((sum, row) => sum + row.cases, 0)
    if (available < wanted) {
      errors.push({
        sku,
        message: `${sku}: requested ${wanted}, only ${available} in stock`,
      })
      continue
    }

    let remaining = wanted
    for (const row of stock) {
      if (remaining === 0) break
      const take = Math.min(row.cases, remaining)
      unsorted.push({ sku, name: product.name, location: row.location, cases: take })
      remaining -= take
    }
  }

  // Sort by parsed aisle, rack, shelf (never by string), then number the stops in walking order.
  const lines = unsorted
    .sort((a, b) => compareLocations(a.location, b.location) || a.sku.localeCompare(b.sku))
    .map((line, i) => ({ sequence: i + 1, ...line }))

  return { lines, errors }
}
