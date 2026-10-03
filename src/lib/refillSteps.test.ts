import { describe, expect, it } from 'vitest'
import { planReplenishment } from './replenish'
import { buildRefillSteps, visibleCounts } from './refillSteps'

const turtle = { capacityUnits: 60, currentUnits: 17, unitsPerCase: 12 }

function stepsFor(shelf: typeof turtle, storedCases: number) {
  const plan = planReplenishment({ ...shelf, storedCases })
  return { plan, steps: buildRefillSteps(plan, shelf) }
}

describe('buildRefillSteps', () => {
  it('TURTLE-01 (60, 17, 12) runs 7 steps and ends with 5 leftover', () => {
    const { steps } = stepsFor(turtle, 25)

    expect(steps).toHaveLength(7)
    expect(steps[0].caption).toBe('The open shelf holds 60. It has 17.')
    expect(steps[1]).toMatchObject({ highlightEmpty: true, shelfUnits: 17 })
    expect(steps[1].caption).toBe('43 spots are empty. Units only come in sealed cases of 12.')
    expect(steps.slice(2, 6).map((s) => s.shelfUnits)).toEqual([29, 41, 53, 60])
    expect(steps[6].leftoverUnits).toBe(5)
    expect(steps[6].caption).toBe(
      'Those 5 go back to storage as an opened case. Storage only tracks full cases, so it must be labeled by hand.',
    )
  })

  it('warns about empty spots on the second-to-last case when there is leftover', () => {
    const { steps } = stepsFor(turtle, 25)

    expect(steps[4].caption).toBe('Case 3 opened: +12. Shelf now has 53. If you stop here, 7 spots stay empty.')
    expect(steps[5].caption).toBe('Only 7 fit. The shelf is full, but 5 are left over.')
    expect(steps[5].leftoverUnits).toBe(5)
  })

  it('exact fit ends with 0 leftover', () => {
    const { steps } = stepsFor({ ...turtle, currentUnits: 12 }, 25)

    expect(steps.at(-1)).toMatchObject({ shelfUnits: 60, leftoverUnits: 0 })
    expect(steps.at(-1)?.caption).toBe('The shelf is exactly full. No leftover.')
  })

  it('short of stock ends below capacity', () => {
    const { steps } = stepsFor({ ...turtle, capacityUnits: 600 }, 25)

    expect(steps.at(-1)?.shelfUnits).toBe(317)
    expect(steps.at(-1)?.shelfUnits).toBeLessThan(600)
    expect(steps.at(-1)?.caption).toBe('Storage ran out. The shelf ends at 317 / 600.')
    expect(steps.at(-1)?.leftoverUnits).toBe(0)
  })

  it('zero stock shows the gap, then that storage ran out', () => {
    const { steps } = stepsFor(turtle, 0)

    expect(steps).toHaveLength(3)
    expect(steps.at(-1)?.caption).toBe('Storage ran out. The shelf ends at 17 / 60.')
  })

  it('a full shelf gets a single step and nothing to pull', () => {
    const { steps } = stepsFor({ ...turtle, currentUnits: 60 }, 25)

    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({ shelfUnits: 60, openedCases: 0, highlightEmpty: false })
    expect(steps[0].caption).toBe('The shelf is already full. Nothing to pull.')
  })
})

describe('visibleCounts', () => {
  const previous = { shelfUnits: 41, leftoverUnits: 0, openedCases: 2, highlightEmpty: false, caption: '' }
  const step = { shelfUnits: 60, leftoverUnits: 5, openedCases: 3, highlightEmpty: false, caption: '' }

  it('fills the shelf first, then the leftover tray, one unit at a time', () => {
    expect(visibleCounts(previous, step, 0)).toEqual({ shelfUnits: 41, leftoverUnits: 0 })
    expect(visibleCounts(previous, step, 19)).toEqual({ shelfUnits: 60, leftoverUnits: 0 })
    expect(visibleCounts(previous, step, 21)).toEqual({ shelfUnits: 60, leftoverUnits: 2 })
  })

  it('shows the settled step when no animation is running', () => {
    expect(visibleCounts(previous, step, null)).toEqual({ shelfUnits: 60, leftoverUnits: 5 })
  })
})
