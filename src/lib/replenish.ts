// Open-shelf replenishment. Storage is modeled in full cases only, so we pull whole cases.

export type ShelfInput = {
  capacityUnits: number
  currentUnits: number
  unitsPerCase: number
}

export type ReplenishPlan = {
  neededUnits: number
  casesToPull: number
  unitsPulled: number
  leftoverUnits: number
  // Shortfall if we rounded down to complete cases only instead.
  unitsShortIfRoundedDown: number
}

export function planReplenishment(input: ShelfInput): ReplenishPlan {
  const { capacityUnits, currentUnits, unitsPerCase } = input

  if (unitsPerCase <= 0) throw new Error('unitsPerCase must be positive')
  if (currentUnits < 0 || currentUnits > capacityUnits) {
    throw new Error('currentUnits must be between 0 and capacityUnits')
  }

  const neededUnits = capacityUnits - currentUnits
  // Round up: a shelf that is short by any amount still needs the next whole case.
  const casesToPull = Math.ceil(neededUnits / unitsPerCase)
  const unitsPulled = casesToPull * unitsPerCase
  const leftoverUnits = unitsPulled - neededUnits

  return {
    neededUnits,
    casesToPull,
    unitsPulled,
    leftoverUnits,
    unitsShortIfRoundedDown:
      neededUnits - Math.floor(neededUnits / unitsPerCase) * unitsPerCase,
  }
}
