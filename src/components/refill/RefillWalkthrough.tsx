import { useMemo } from 'react'
import { planPullSource, planReplenishment } from '../../lib/replenish'
import { buildRefillSteps, visibleCounts } from '../../lib/refillSteps'
import type { LocationStock } from '../../lib/search'
import { Button } from '../ui/button'
import { ShelfGrid } from './ShelfGrid'
import { StorageCards } from './StorageCards'
import { useRefillPlayer } from './useRefillPlayer'

export type WalkthroughShelf = {
  sku: string
  name: string
  unitsPerCase: number
  capacityUnits: number
  currentUnits: number
  locations: LocationStock[]
}

// The parent keys this on sku, so playback starts fresh for each SKU.
export function RefillWalkthrough({ shelf }: { shelf: WalkthroughShelf }) {
  const storedCases = shelf.locations.reduce((sum, row) => sum + row.cases, 0)

  const plan = useMemo(
    () =>
      planReplenishment({
        capacityUnits: shelf.capacityUnits,
        currentUnits: shelf.currentUnits,
        unitsPerCase: shelf.unitsPerCase,
        storedCases,
      }),
    [shelf, storedCases],
  )
  const steps = useMemo(() => buildRefillSteps(plan, shelf), [plan, shelf])
  const { index, placed, animating, next, startOver } = useRefillPlayer(steps, shelf.unitsPerCase)

  const step = steps[index]
  const previous = steps[Math.max(index - 1, 0)]
  const { shelfUnits, leftoverUnits } = visibleCounts(previous, step, placed)

  // Location for each case, in the order they are opened.
  const caseLocations = planPullSource(shelf.locations, plan.casesToPull).flatMap((s) =>
    Array.from({ length: s.cases }, () => s.location),
  )
  const isLast = index === steps.length - 1

  return (
    <section className="mt-6 space-y-5">
      <div>
        <div className="font-mono text-sm text-gray-600">{shelf.sku}</div>
        <div className="text-xl font-semibold">{shelf.name}</div>
        <div className="text-gray-700">{shelf.unitsPerCase} units per case</div>
      </div>

      <StorageCards
        caseLocations={caseLocations}
        unitsPerCase={shelf.unitsPerCase}
        openedCases={step.openedCases}
        leftoverUnits={leftoverUnits}
      />

      <div className="flex items-baseline justify-between">
        <p className="font-mono text-3xl font-bold tabular-nums">
          {shelfUnits} / {shelf.capacityUnits}
        </p>
        <p className="text-sm text-gray-600">
          Step {index + 1} of {steps.length}
        </p>
      </div>

      <ShelfGrid
        capacityUnits={shelf.capacityUnits}
        startUnits={shelf.currentUnits}
        shelfUnits={shelfUnits}
        leftoverUnits={leftoverUnits}
        highlightEmpty={step.highlightEmpty}
      />

      <p
        aria-live="polite"
        className="min-h-20 rounded-md border border-gray-300 bg-gray-50 p-4 text-lg leading-snug"
      >
        {step.caption}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-12 text-base" onClick={startOver}>
          Start over
        </Button>
        <Button className="h-12 text-base" onClick={next} disabled={animating}>
          {isLast ? 'Play again' : 'Next step'}
        </Button>
      </div>
    </section>
  )
}
