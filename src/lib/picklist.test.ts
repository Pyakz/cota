import { describe, expect, it } from 'vitest'
import { buildPickList, formatRequest, parseRequest } from './picklist'
import type { InventoryRow, ProductRow } from './search'

const products: ProductRow[] = [
  { sku: 'TURTLE-01', name: 'Sea Turtle Plush', unitsPerCase: 12 },
  { sku: 'SHARK-02', name: 'Shark Plush', unitsPerCase: 8 },
  { sku: 'MOOSE-03', name: 'Moose Plush', unitsPerCase: 6 },
  { sku: 'ALIEN-04', name: 'Alien Plush', unitsPerCase: 12 },
]

const inventory: InventoryRow[] = [
  { sku: 'TURTLE-01', location: 'A1-R2-S1', cases: 18 },
  { sku: 'TURTLE-01', location: 'A4-R1-S2', cases: 7 },
  { sku: 'SHARK-02', location: 'A2-R3-S1', cases: 14 },
  { sku: 'MOOSE-03', location: 'A5-R1-S1', cases: 9 },
  { sku: 'ALIEN-04', location: 'A3-R4-S2', cases: 4 },
]

const picks = (result: ReturnType<typeof buildPickList>) =>
  result.lines.map((l) => [l.sequence, l.location, l.sku, l.cases])

describe('buildPickList', () => {
  it('example request: A1 TURTLE-01 ×3, A2 SHARK-02 ×2, A3 ALIEN-04 ×1 in walking order', () => {
    const result = buildPickList(
      [
        { sku: 'TURTLE-01', cases: 3 },
        { sku: 'SHARK-02', cases: 2 },
        { sku: 'ALIEN-04', cases: 1 },
      ],
      products,
      inventory,
    )

    expect(result.errors).toEqual([])
    expect(picks(result)).toEqual([
      [1, 'A1-R2-S1', 'TURTLE-01', 3],
      [2, 'A2-R3-S1', 'SHARK-02', 2],
      [3, 'A3-R4-S2', 'ALIEN-04', 1],
    ])
  })

  it('takes from the lowest aisle first and spills into the next location', () => {
    const result = buildPickList([{ sku: 'TURTLE-01', cases: 20 }], products, inventory)

    expect(result.errors).toEqual([])
    expect(picks(result)).toEqual([
      [1, 'A1-R2-S1', 'TURTLE-01', 18],
      [2, 'A4-R1-S2', 'TURTLE-01', 2],
    ])
  })

  it('reports an insufficient SKU clearly and adds no partial pick for it', () => {
    const result = buildPickList(
      [
        { sku: 'ALIEN-04', cases: 5 },
        { sku: 'SHARK-02', cases: 2 },
      ],
      products,
      inventory,
    )

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].sku).toBe('ALIEN-04')
    expect(result.errors[0].message).toContain('requested 5, only 4 in stock')
    expect(picks(result)).toEqual([[1, 'A2-R3-S1', 'SHARK-02', 2]])
  })

  it('reports an unknown SKU', () => {
    const result = buildPickList([{ sku: 'ZEBRA-09', cases: 1 }], products, inventory)

    expect(result.lines).toEqual([])
    expect(result.errors[0].message).toContain('unknown SKU')
  })

  it('rejects zero, negative and fractional case counts', () => {
    const result = buildPickList(
      [
        { sku: 'SHARK-02', cases: 0 },
        { sku: 'SHARK-02', cases: -1 },
        { sku: 'SHARK-02', cases: 1.5 },
        { sku: 'SHARK-02', cases: NaN },
      ],
      products,
      inventory,
    )

    expect(result.lines).toEqual([])
    expect(result.errors).toHaveLength(4)
  })

  it('checks repeated SKUs against their combined total', () => {
    const result = buildPickList(
      [
        { sku: 'ALIEN-04', cases: 3 },
        { sku: 'ALIEN-04', cases: 2 },
      ],
      products,
      inventory,
    )

    expect(result.lines).toEqual([])
    expect(result.errors[0].message).toContain('requested 5, only 4 in stock')
  })

  it('sorts lines by numeric aisle, so A2 comes before A10', () => {
    const extraProducts: ProductRow[] = [
      { sku: 'FAR-10', name: 'Far Plush', unitsPerCase: 1 },
      { sku: 'NEAR-02', name: 'Near Plush', unitsPerCase: 1 },
    ]
    const extraInventory: InventoryRow[] = [
      { sku: 'FAR-10', location: 'A10-R1-S1', cases: 5 },
      { sku: 'NEAR-02', location: 'A2-R1-S1', cases: 5 },
    ]

    const result = buildPickList(
      [
        { sku: 'FAR-10', cases: 1 },
        { sku: 'NEAR-02', cases: 1 },
      ],
      extraProducts,
      extraInventory,
    )

    expect(picks(result)).toEqual([
      [1, 'A2-R1-S1', 'NEAR-02', 1],
      [2, 'A10-R1-S1', 'FAR-10', 1],
    ])
  })
})

describe('parseRequest / formatRequest', () => {
  it('parses the URL form and normalises SKU case and spaces', () => {
    expect(parseRequest(' turtle-01:3 , SHARK-02:2 ')).toEqual([
      { sku: 'TURTLE-01', cases: 3 },
      { sku: 'SHARK-02', cases: 2 },
    ])
  })

  it('keeps a bad count as NaN so buildPickList can report it', () => {
    const [bad] = parseRequest('SHARK-02:abc')
    expect(Number.isNaN(bad.cases)).toBe(true)
  })

  it('round-trips through formatRequest', () => {
    const text = 'TURTLE-01:3,SHARK-02:2,ALIEN-04:1'
    expect(formatRequest(parseRequest(text))).toBe(text)
  })
})
