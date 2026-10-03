import { cn } from '../../lib/utils'

// Above this many units, each square stands for a block of units so the grid stays readable.
const MAX_SQUARES = 120

type Square = 'existing' | 'added' | 'empty'

export function ShelfGrid({
  capacityUnits,
  startUnits,
  shelfUnits,
  leftoverUnits,
  highlightEmpty,
}: {
  capacityUnits: number
  startUnits: number
  shelfUnits: number
  leftoverUnits: number
  highlightEmpty: boolean
}) {
  const unitsPerSquare = Math.ceil(capacityUnits / MAX_SQUARES)
  const squareCount = Math.ceil(capacityUnits / unitsPerSquare)
  const addedUnits = shelfUnits - startUnits
  const emptyUnits = capacityUnits - shelfUnits

  const squares: Square[] = Array.from({ length: squareCount }, (_, i) => {
    const lowUnit = i * unitsPerSquare
    if (lowUnit < startUnits) return 'existing'
    if (lowUnit < shelfUnits) return 'added'
    return 'empty'
  })

  const label = `${shelfUnits} of ${capacityUnits} units on shelf. ${startUnits} already there, ${addedUnits} added, ${emptyUnits} empty.`

  return (
    <div>
      <div role="img" aria-label={label} className="grid grid-cols-10 gap-1.5">
        {squares.map((state, i) => (
          <div
            key={i}
            className={cn(
              'aspect-square rounded-[5px]',
              state === 'existing' && 'bg-slate-500',
              state === 'added' && 'bg-emerald-500',
              state === 'empty' && 'bg-slate-200',
              state === 'empty' && highlightEmpty && 'ring-2 ring-amber-500',
            )}
          />
        ))}
      </div>

      {unitsPerSquare > 1 && (
        <p className="mt-2 text-sm text-slate-600">1 square = {unitsPerSquare} units</p>
      )}

      {leftoverUnits > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-red-800">
            Leftover tray · {leftoverUnits} {leftoverUnits === 1 ? 'unit' : 'units'}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Array.from({ length: Math.ceil(leftoverUnits / unitsPerSquare) }, (_, i) => (
              <div key={i} className="size-6 rounded-[5px] bg-red-600" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
