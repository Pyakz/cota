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
    <section className="mt-4 grid gap-5 md:grid-cols-2 md:items-start">
      <div className="space-y-3">
        <RouteMap
          aisles={aisles}
          pickedAisles={pickedAisles}
          waypoints={waypoints}
          distance={walk.distance}
          reached={walk.reached}
        />

        <p
          aria-live="polite"
          className="min-h-16 rounded-2xl bg-white p-4 text-base leading-snug text-slate-800 shadow-sm ring-1 ring-slate-200"
        >
          {caption(walk.status, picks, walk.reached, casesInCart)}
        </p>

        <Button
          className="h-12 w-full rounded-xl bg-slate-900 text-base font-semibold text-white hover:bg-slate-800 active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500"
          onClick={walk.walk}
          disabled={walk.status === 'walking'}
        >
          {walk.status === 'idle' ? 'Walk the route' : 'Walk again'}
        </Button>
      </div>

      <div className="space-y-3">
        <StatCard label="Cases in cart" value={String(casesInCart)} />

        <ol className="space-y-2">
          {picks.map((line, i) => {
            const done = i < walk.reached
            return (
              <li
                key={`${line.location}-${line.sku}`}
                className={`flex items-center gap-3 rounded-2xl p-3 shadow-sm ring-1 ${done ? 'bg-emerald-50 ring-emerald-300' : 'bg-white ring-slate-200'}`}
              >
                <span
                  className={`num flex size-9 shrink-0 items-center justify-center rounded-full font-bold text-white ${done ? 'bg-emerald-600' : 'bg-slate-900'}`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono font-semibold text-slate-900">{line.location}</div>
                  <div className="truncate text-sm text-slate-600">
                    {line.sku} · {line.name}
                  </div>
                </div>
                <div className="num text-right text-lg font-bold text-slate-900">
                  {line.cases}
                  <span className="ml-1 text-xs font-normal text-slate-500">{line.cases === 1 ? 'case' : 'cases'}</span>
                </div>
                {done && <Check aria-label="Picked" className="size-5 shrink-0 text-emerald-700" />}
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
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="num text-3xl font-bold text-slate-900">{value}</div>
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
