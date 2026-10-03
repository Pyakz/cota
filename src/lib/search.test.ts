import { describe, expect, it } from 'vitest'
import { compareLocations } from './location'
import { searchInventory, type InventoryRow, type ProductRow } from './search'

const products: ProductRow[] = [
  { sku: 'TURTLE-01', name: 'Sea Turtle Plush', unitsPerCase: 12 },
  { sku: 'SHARK-02', name: 'Shark Plush', unitsPerCase: 8 },
  { sku: 'MOOSE-03', name: 'Moose Plush', unitsPerCase: 6 },
  { sku: 'ALIEN-04', name: 'Alien Plush', unitsPerCase: 12 },
]

const inventory: InventoryRow[] = [
  { sku: 'TURTLE-01', location: 'A4-R1-S2', cases: 7 },
  { sku: 'TURTLE-01', location: 'A1-R2-S1', cases: 18 },
  { sku: 'SHARK-02', location: 'A2-R3-S1', cases: 14 },
  { sku: 'MOOSE-03', location: 'A5-R1-S1', cases: 9 },
  { sku: 'ALIEN-04', location: 'A3-R4-S2', cases: 4 },
]

describe('searchInventory', () => {
  it('matches SKU case-insensitively and totals cases and units', () => {
    const [result] = searchInventory('turtle-01', products, inventory)

    expect(result.sku).toBe('TURTLE-01')
    expect(result.name).toBe('Sea Turtle Plush')
    expect(result.unitsPerCase).toBe(12)
    expect(result.totalCases).toBe(25)
    expect(result.totalUnits).toBe(300)
  })

  it('lists every location, sorted by aisle, rack, shelf', () => {
    const [result] = searchInventory('TURTLE-01', products, inventory)

    expect(result.locations).toEqual([
      { location: 'A1-R2-S1', cases: 18 },
      { location: 'A4-R1-S2', cases: 7 },
    ])
  })

  it('matches product name by partial text', () => {
    const results = searchInventory('plush', products, inventory)
    expect(results.map((r) => r.sku)).toEqual([
      'ALIEN-04',
      'MOOSE-03',
      'SHARK-02',
      'TURTLE-01',
    ])
  })

  it('returns every product, sorted by SKU, for a blank query', () => {
    const results = searchInventory('   ', products, inventory)
    expect(results.map((r) => r.sku)).toEqual([
      'ALIEN-04',
      'MOOSE-03',
      'SHARK-02',
      'TURTLE-01',
    ])
  })

  it('returns nothing when no SKU or name matches', () => {
    expect(searchInventory('zebra', products, inventory)).toEqual([])
  })

  it('reports zero totals for a product with no stock rows', () => {
    const [result] = searchInventory('moose', products, [])
    expect(result.locations).toEqual([])
    expect(result.totalCases).toBe(0)
    expect(result.totalUnits).toBe(0)
  })
})

describe('compareLocations', () => {
  it('sorts A2 before A10 numerically', () => {
    const sorted = ['A10-R1-S1', 'A2-R1-S1'].sort(compareLocations)
    expect(sorted).toEqual(['A2-R1-S1', 'A10-R1-S1'])
  })
})
