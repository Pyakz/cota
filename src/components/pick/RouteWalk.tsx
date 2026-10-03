import { Check } from 'lucide-react'
import { useMemo } from 'react'
import { buildRoutePath, type MapAisle } from '../../lib/routePath'
import { parseLocation } from '../../lib/location'
import type { PickLine } from '../../lib/picklist'
import { Button } from '../ui/button'
import { RouteMap } from './RouteMap'
import { useRouteWalk } from './useRouteWalk'

type Props = {
  // Pick lines in the order the picker visits them. Stop numbers follow this order.
  picks: PickLine[]
  aisles: MapAisle[]
}

// Owns the walk animation. Left: the live map. Right: cases in cart and the pick list. Stacks on phones.
export function RouteWalk({ picks, aisles }: Props) {
  const waypoints = useMemo(() => buildRoutePath(picks, aisles), [picks, aisles])
  const walk = useRouteWalk(waypoints)
  const pickedAisles = useMemo(
    () => new Set(picks.map((p) => parseLocation(p.location).aisle)),
    [picks],
  )

  const casesInCart = picks.slice(0, walk.reached).reduce((sum, line) => sum + line.cases, 0)

  return (
    <section className="mt-4 grid gap-4 md:grid-cols-2 md:items-start">
      <div className="space-y-4">
        <RouteMap
          aisles={aisles}
          pickedAisles={pickedAisles}
          waypoints={waypoints}
          distance={walk.distance}
          reached={walk.reached}
        />

        <p
          aria-live="polite"
          className="min-h-16 rounded-md border border-gray-300 bg-gray-50 p-4 text-lg leading-snug"
        >
          {caption(walk.status, picks, walk.reached, casesInCart)}
        </p>

        <Button
          className="h-10 rounded-md border border-gray-900 bg-white px-4 text-base font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50"
          onClick={walk.walk}
          disabled={walk.status === 'walking'}
        >
          {walk.status === 'idle' ? 'Walk' : 'Walk again'}
        </Button>
      </div>

      <div className="space-y-4">
        <StatCard label="Cases in cart" value={String(casesInCart)} />

        <ol className="space-y-2">
          {picks.map((line, i) => {
            const done = i < walk.reached
            return (
              <li
                key={`${line.location}-${line.sku}`}
                className={`flex items-center gap-3 rounded-lg border p-3 ${done ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-white'}`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 font-bold text-white tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono font-semibold">{line.location}</div>
                  <div className="text-sm text-gray-700">
                    {line.sku} · {line.name}
                  </div>
                </div>
                <div className="text-right text-lg font-bold tabular-nums">
                  {line.cases}
                  <span className="ml-1 text-sm font-normal text-gray-600">{line.cases === 1 ? 'case' : 'cases'}</span>
                </div>
                {done && <Check aria-label="Picked" className="h-6 w-6 shrink-0 text-green-700" />}
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-300 bg-white p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-3xl font-bold tabular-nums">{value}</div>
    </div>
  )
}

function caption(
  status: 'idle' | 'walking' | 'done',
  picks: PickLine[],
  reached: number,
  casesInCart: number,
) {
  if (status === 'idle') return 'Start at the bottom corridor. Press Walk to follow the route.'
  if (status === 'done') {
    const stops = picks.length === 1 ? '1 stop' : `${picks.length} stops`
    return `Done: ${stops}, ${casesInCart} ${casesInCart === 1 ? 'case' : 'cases'}.`
  }
  if (reached === 0) return 'Walking to stop 1…'

  const line = picks[reached - 1]
  return `Stop ${reached}: pick ${line.cases} × ${line.sku} at ${line.location}.`
}
