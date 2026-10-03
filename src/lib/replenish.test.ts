import { describe, expect, it } from 'vitest'
import { planPullSource, planReplenishment } from './replenish'

describe('planReplenishment', () => {
  it('TURTLE-01 example: 60 capacity, 17 current, 25 stored, 12 per case → 4 cases, 5 leftover', () => {
    const plan = planReplenishment({ capacityUnits: 60, currentUnits: 17, unitsPerCase: 12, storedCases: 25 })

    expect(plan.neededUnits).toBe(43)
    expect(plan.casesToPull).toBe(4)
    expect(plan.unitsPulled).toBe(48)
    expect(plan.unitsAfter).toBe(60)
    expect(plan.leftoverUnits).toBe(5)
    expect(plan.shortOfStock).toBe(false)
    expect(plan.casesIfRoundedDown).toBe(3)
    expect(plan.unitsShortIfRoundedDown).toBe(7)
  })

  it('exact fit: 60 capacity, 12 current, 12 per case → 4 cases, no leftover, no shortfall', () => {
    const plan = planReplenishment({ capacityUnits: 60, currentUnits: 12, unitsPerCase: 12, storedCases: 25 })

    expect(plan.neededUnits).toBe(48)
    expect(plan.casesToPull).toBe(4)
    expect(plan.leftoverUnits).toBe(0)
    expect(plan.casesIfRoundedDown).toBe(4)
    expect(plan.unitsShortIfRoundedDown).toBe(0)
  })

  it('insufficient storage: pulls only what exists and reports short of stock', () => {
    const plan = planReplenishment({ capacityUnits: 600, currentUnits: 17, unitsPerCase: 12, storedCases: 25 })

    expect(plan.idealCases).toBe(49)
    expect(plan.casesToPull).toBe(25)
    expect(plan.unitsPulled).toBe(300)
    expect(plan.unitsAfter).toBe(317)
    expect(plan.leftoverUnits).toBe(0)
    expect(plan.shortOfStock).toBe(true)
  })

  it('zero stock: pulls nothing and reports short of stock', () => {
    const plan = planReplenishment({ capacityUnits: 60, currentUnits: 17, unitsPerCase: 12, storedCases: 0 })

    expect(plan.casesToPull).toBe(0)
    expect(plan.unitsAfter).toBe(17)
    expect(plan.shortOfStock).toBe(true)
  })

  it('pulls nothing when the shelf is already full', () => {
    const plan = planReplenishment({ capacityUnits: 60, currentUnits: 60, unitsPerCase: 12, storedCases: 25 })

    expect(plan.neededUnits).toBe(0)
    expect(plan.casesToPull).toBe(0)
    expect(plan.leftoverUnits).toBe(0)
    expect(plan.shortOfStock).toBe(false)
  })

  it('rounds up a single missing unit to one whole case', () => {
    const plan = planReplenishment({ capacityUnits: 60, currentUnits: 59, unitsPerCase: 12, storedCases: 25 })

    expect(plan.casesToPull).toBe(1)
    expect(plan.leftoverUnits).toBe(11)
  })

  it('rejects current units above capacity', () => {
    expect(() =>
      planReplenishment({ capacityUnits: 60, currentUnits: 61, unitsPerCase: 12, storedCases: 25 }),
    ).toThrow('currentUnits must be between 0 and capacityUnits')
  })

  it('rejects a non-positive case size', () => {
    expect(() =>
      planReplenishment({ capacityUnits: 60, currentUnits: 17, unitsPerCase: 0, storedCases: 25 }),
    ).toThrow()
  })
})

describe('planPullSource', () => {
  it('pulls nothing when no cases are needed', () => {
    expect(planPullSource([{ location: 'A1-R1-S1', cases: 9 }], 0)).toEqual([])
  })

  it('uses the lowest-aisle location that has enough cases on its own', () => {
    const stock = [
      { location: 'A4-R1-S2', cases: 7 },
      { location: 'A9-R1-S1', cases: 9 },
      { location: 'A2-R3-S1', cases: 3 },
    ]

    expect(planPullSource(stock, 4)).toEqual([{ location: 'A4-R1-S2', cases: 4 }])
  })

  it('A1 has 2, A4 has 10, request 4 → only A4', () => {
    const stock = [
      { location: 'A1-R1-S1', cases: 2 },
      { location: 'A4-R1-S1', cases: 10 },
    ]

    expect(planPullSource(stock, 4)).toEqual([{ location: 'A4-R1-S1', cases: 4 }])
  })

  it('A1 has 2, A4 has 3, request 4 → split A1 2 + A4 2', () => {
    const stock = [
      { location: 'A1-R1-S1', cases: 2 },
      { location: 'A4-R1-S1', cases: 3 },
    ]

    expect(planPullSource(stock, 4)).toEqual([
      { location: 'A1-R1-S1', cases: 2 },
      { location: 'A4-R1-S1', cases: 2 },
    ])
  })

  it('returns what is available when the request exceeds total stock', () => {
    const stock = [
      { location: 'A1-R1-S1', cases: 2 },
      { location: 'A4-R1-S1', cases: 3 },
    ]

    expect(planPullSource(stock, 10)).toEqual([
      { location: 'A1-R1-S1', cases: 2 },
      { location: 'A4-R1-S1', cases: 3 },
    ])
  })

  it('sorts A2 before A10 by aisle number, not by string', () => {
    const stock = [
      { location: 'A10-R1-S1', cases: 5 },
      { location: 'A2-R1-S1', cases: 5 },
    ]

    expect(planPullSource(stock, 3)).toEqual([{ location: 'A2-R1-S1', cases: 3 }])
  })
})
