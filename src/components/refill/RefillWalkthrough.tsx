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
    <section className="mt-4 space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="font-mono text-xs text-slate-500">{shelf.sku}</div>
        <div className="text-lg font-semibold text-slate-900">{shelf.name}</div>
        <div className="text-sm text-slate-600">{shelf.unitsPerCase} units per case</div>

        <div className="mt-4">
          <StorageCards
            caseLocations={caseLocations}
            unitsPerCase={shelf.unitsPerCase}
            openedCases={step.openedCases}
            leftoverUnits={leftoverUnits}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <p className="num text-3xl font-bold text-slate-900">
            {shelfUnits} <span className="text-lg font-medium text-slate-400">/ {shelf.capacityUnits}</span>
          </p>
          <p className="num text-sm font-medium text-slate-500">
            Step {index + 1} of {steps.length}
          </p>
        </div>

        <div className="mt-3">
          <ShelfGrid
            capacityUnits={shelf.capacityUnits}
            startUnits={shelf.currentUnits}
            shelfUnits={shelfUnits}
            leftoverUnits={leftoverUnits}
            highlightEmpty={step.highlightEmpty}
          />
        </div>
      </div>

      <p
        aria-live="polite"
        className="min-h-20 rounded-2xl bg-white p-4 text-base leading-relaxed text-slate-800 shadow-sm ring-1 ring-slate-200"
      >
        {step.caption}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-12 rounded-xl border-slate-300 bg-white text-base font-semibold text-slate-800 active:scale-[0.98]"
          onClick={startOver}
        >
          Start over
        </Button>
        <Button
          className="h-12 rounded-xl bg-slate-900 text-base font-semibold text-white hover:bg-slate-800 active:scale-[0.98] disabled:bg-slate-300"
          onClick={next}
          disabled={animating}
        >
          {isLast ? 'Play again' : 'Next step'}
        </Button>
      </div>
    </section>
  )
}
