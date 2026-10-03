import { describe, expect, it } from 'vitest'
import { planReplenishment } from './replenish'

describe('planReplenishment', () => {
  it('TURTLE-01 example: 60 capacity, 17 current, 12 per case → 4 cases, 5 leftover', () => {
    const plan = planReplenishment({ capacityUnits: 60, currentUnits: 17, unitsPerCase: 12 })

    expect(plan.neededUnits).toBe(43)
    expect(plan.casesToPull).toBe(4)
    expect(plan.unitsPulled).toBe(48)
    expect(plan.leftoverUnits).toBe(5)
    expect(plan.unitsShortIfRoundedDown).toBe(7)
  })

  it('no leftover when the shortfall is an exact number of cases', () => {
    const plan = planReplenishment({ capacityUnits: 60, currentUnits: 24, unitsPerCase: 12 })

    expect(plan.neededUnits).toBe(36)
    expect(plan.casesToPull).toBe(3)
    expect(plan.leftoverUnits).toBe(0)
  })

  it('pulls nothing when the shelf is already full', () => {
    const plan = planReplenishment({ capacityUnits: 60, currentUnits: 60, unitsPerCase: 12 })

    expect(plan.neededUnits).toBe(0)
    expect(plan.casesToPull).toBe(0)
    expect(plan.leftoverUnits).toBe(0)
  })

  it('rounds up a single missing unit to one whole case', () => {
    const plan = planReplenishment({ capacityUnits: 60, currentUnits: 59, unitsPerCase: 12 })

    expect(plan.casesToPull).toBe(1)
    expect(plan.leftoverUnits).toBe(11)
  })

  it('rejects current units above capacity', () => {
    expect(() =>
      planReplenishment({ capacityUnits: 60, currentUnits: 61, unitsPerCase: 12 }),
    ).toThrow()
  })

  it('rejects a non-positive case size', () => {
    expect(() =>
      planReplenishment({ capacityUnits: 60, currentUnits: 17, unitsPerCase: 0 }),
    ).toThrow()
  })
})
