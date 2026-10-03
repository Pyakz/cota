import type { ReplenishPlan } from './replenish'

// Step-by-step story of one open-shelf replenishment. The math comes from planReplenishment;
// this only turns its result into the frames the explainer plays.

export type RefillShelf = {
  capacityUnits: number
  currentUnits: number
  unitsPerCase: number
}

export type RefillStep = {
  // Units on the shelf after this step.
  shelfUnits: number
  // Pulled units that have overflowed the shelf and sit in the leftover tray.
  leftoverUnits: number
  // Cases opened so far.
  openedCases: number
  highlightEmpty: boolean
  caption: string
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export function buildRefillSteps(plan: ReplenishPlan, shelf: RefillShelf): RefillStep[] {
  const { capacityUnits, currentUnits, unitsPerCase } = shelf

  if (plan.neededUnits === 0) {
    return [
      {
        shelfUnits: currentUnits,
        leftoverUnits: 0,
        openedCases: 0,
        highlightEmpty: false,
        caption: 'The shelf is already full. Nothing to pull.',
      },
    ]
  }

  const steps: RefillStep[] = [
    {
      shelfUnits: currentUnits,
      leftoverUnits: 0,
      openedCases: 0,
      highlightEmpty: false,
      caption: `The open shelf holds ${capacityUnits}. It has ${currentUnits}.`,
    },
    {
      shelfUnits: currentUnits,
      leftoverUnits: 0,
      openedCases: 0,
      highlightEmpty: true,
      caption: `${plan.neededUnits} ${plural(plan.neededUnits, 'spot is', 'spots are')} empty. Units only come in sealed cases of ${unitsPerCase}.`,
    },
  ]

  let shelfUnits = currentUnits
  const hasLeftover = plan.leftoverUnits > 0

  for (let n = 1; n <= plan.casesToPull; n++) {
    const isLast = n === plan.casesToPull
    const previousShelf = shelfUnits
    shelfUnits = Math.min(shelfUnits + unitsPerCase, capacityUnits)
    const leftoverUnits = isLast ? plan.leftoverUnits : 0
    const addedUnits = shelfUnits - previousShelf

    let caption: string
    if (isLast && hasLeftover) {
      caption = `Only ${addedUnits} fit. The shelf is full, but ${leftoverUnits} are left over.`
    } else {
      caption = `Case ${n} opened: +${addedUnits}. Shelf now has ${shelfUnits}.`
      if (hasLeftover && n === plan.casesToPull - 1) {
        const emptySpots = capacityUnits - shelfUnits
        caption += ` If you stop here, ${emptySpots} ${plural(emptySpots, 'spot stays', 'spots stay')} empty.`
      }
    }

    steps.push({ shelfUnits, leftoverUnits, openedCases: n, highlightEmpty: false, caption })
  }

  steps.push({
    shelfUnits,
    leftoverUnits: plan.leftoverUnits,
    openedCases: plan.casesToPull,
    highlightEmpty: false,
    caption: finalCaption(plan, shelfUnits, capacityUnits),
  })

  return steps
}

function finalCaption(plan: ReplenishPlan, shelfUnits: number, capacityUnits: number): string {
  if (plan.leftoverUnits > 0) {
    return `Those ${plan.leftoverUnits} go back to storage as an opened case. Storage only tracks full cases, so it must be labeled by hand.`
  }
  if (plan.shortOfStock) {
    return `Storage ran out. The shelf ends at ${shelfUnits} / ${capacityUnits}.`
  }
  return 'The shelf is exactly full. No leftover.'
}

// The numbers to draw partway through a case step. `placed` counts units of that case that have
// landed so far (0..unitsPerCase); null means the step is settled and its final numbers apply.
// Units fill the shelf first, and any overflow goes to the leftover tray.
export function visibleCounts(
  previous: RefillStep,
  step: RefillStep,
  placed: number | null,
): { shelfUnits: number; leftoverUnits: number } {
  if (placed === null) return { shelfUnits: step.shelfUnits, leftoverUnits: step.leftoverUnits }

  const shelfDelta = step.shelfUnits - previous.shelfUnits
  const onShelf = Math.min(placed, shelfDelta)
  return {
    shelfUnits: previous.shelfUnits + onShelf,
    leftoverUnits: previous.leftoverUnits + (placed - onShelf),
  }
}
