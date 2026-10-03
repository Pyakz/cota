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
      <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Storage</h2>
      <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {caseLocations.map((location, i) => {
          const opened = i < openedCases
          const leftover = opened && leftoverUnits > 0 && i === caseLocations.length - 1

          return (
            <li
              key={i}
              className={cn(
                'flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl text-center',
                !opened && 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200',
                opened && !leftover && 'bg-slate-100 text-slate-500',
                leftover && 'bg-amber-50 text-amber-900 ring-1 ring-amber-300',
              )}
            >
              <Package className="size-5" aria-hidden />
              <span className="num text-base font-semibold">
                {!opened && unitsPerCase}
                {opened && !leftover && 'opened'}
                {leftover && `${leftoverUnits} left`}
              </span>
              <span className="font-mono text-[11px] leading-none text-slate-500">{location}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
