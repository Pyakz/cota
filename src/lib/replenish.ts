import { allocateCases } from './picklist'
import { compareLocations } from './location'
import type { LocationStock } from './search'

// Open-shelf replenishment. Storage is modeled in full cases only, so we pull whole cases.

export type ShelfInput = {
  capacityUnits: number
  currentUnits: number
  unitsPerCase: number
  // Total cases across all storage locations for this SKU.
  storedCases: number
}

export type ReplenishPlan = {
  neededUnits: number
  // Cases the shelf would need if storage had enough.
  idealCases: number
  // Cases actually pullable: min(idealCases, storedCases).
  casesToPull: number
  unitsPulled: number
  // Shelf level after the pull, capped at capacity.
  unitsAfter: number
  // Pulled units that won't fit on the shelf.
  leftoverUnits: number
  shortOfStock: boolean
  // Complete cases only, and the shortfall that leaves.
  casesIfRoundedDown: number
  unitsShortIfRoundedDown: number
}

export function planReplenishment(input: ShelfInput): ReplenishPlan {
  const { capacityUnits, currentUnits, unitsPerCase, storedCases } = input

  if (unitsPerCase <= 0) throw new Error('unitsPerCase must be positive')
  if (currentUnits < 0 || currentUnits > capacityUnits) {
    throw new Error('currentUnits must be between 0 and capacityUnits')
  }
  if (storedCases < 0) throw new Error('storedCases must not be negative')

  const neededUnits = capacityUnits - currentUnits
  // Round up: a shelf that is short by any amount still needs the next whole case.
  const idealCases = Math.ceil(neededUnits / unitsPerCase)
  const casesToPull = Math.min(idealCases, storedCases)
  const unitsPulled = casesToPull * unitsPerCase
  const unitsAfter = Math.min(currentUnits + unitsPulled, capacityUnits)
  const leftoverUnits = unitsPulled - (unitsAfter - currentUnits)
  const casesIfRoundedDown = Math.floor(neededUnits / unitsPerCase)

  return {
    neededUnits,
    idealCases,
    casesToPull,
    unitsPulled,
    unitsAfter,
    leftoverUnits,
    shortOfStock: storedCases < idealCases,
    casesIfRoundedDown,
    unitsShortIfRoundedDown: neededUnits - casesIfRoundedDown * unitsPerCase,
  }
}

// Where to pull the cases from. If any single location has enough, use the lowest-aisle one that qualifies.
// Otherwise split across locations from the lowest aisle up. If stock is short, this returns what is available.
export function planPullSource(stock: LocationStock[], casesToPull: number): LocationStock[] {
  if (casesToPull === 0) return []

  const single = stock
    .filter((row) => row.cases >= casesToPull)
    .sort((a, b) => compareLocations(a.location, b.location))[0]

  if (single) return [{ location: single.location, cases: casesToPull }]
  return allocateCases(stock, casesToPull)
}
