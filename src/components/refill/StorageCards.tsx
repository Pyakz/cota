import { Package } from 'lucide-react'
import { cn } from '../../lib/utils'

// One card per case to pull. The last card is the one that overflows, so it is the only one that can be leftover.
export function StorageCards({
  caseLocations,
  unitsPerCase,
  openedCases,
  leftoverUnits,
}: {
  caseLocations: string[]
  unitsPerCase: number
  openedCases: number
  leftoverUnits: number
}) {
  if (caseLocations.length === 0) return null

  return (
    <section aria-label="Storage cases">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Storage</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {caseLocations.map((location, i) => {
          const opened = i < openedCases
          const leftover = opened && leftoverUnits > 0 && i === caseLocations.length - 1

          return (
            <li
              key={i}
              className={cn(
                'flex h-20 w-20 flex-col items-center justify-center rounded-md border-2 text-center',
                !opened && 'border-gray-400 bg-white text-gray-900',
                opened && !leftover && 'border-dashed border-gray-300 bg-gray-50 text-gray-500',
                leftover && 'border-red-400 bg-red-50 text-red-800',
              )}
            >
              <Package className="size-5" aria-hidden />
              <span className="mt-1 font-mono text-lg font-semibold tabular-nums">
                {!opened && unitsPerCase}
                {opened && !leftover && 'opened'}
                {leftover && `${leftoverUnits} left`}
              </span>
              <span className="font-mono text-[11px] leading-none">{location}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
