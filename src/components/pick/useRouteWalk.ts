import { useEffect, useMemo, useState } from 'react'
import { cumulativeDistances, routeDistance, type Waypoint } from '../../lib/routePath'

const UNITS_PER_MS = 0.25
const PAUSE_MS = 500

export type WalkStatus = 'idle' | 'walking' | 'done'

// Walks the picker along the route at a constant speed, pausing at each stop.
// Walk restarts from the beginning. Changing the route or unmounting cancels the frame loop.
export function useRouteWalk(waypoints: Waypoint[]) {
  const total = useMemo(() => routeDistance(waypoints), [waypoints])
  const stops = useMemo(() => {
    const cum = cumulativeDistances(waypoints)
    return waypoints.flatMap((w, i) => (w.pick === undefined ? [] : [cum[i]]))
  }, [waypoints])

  const [runId, setRunId] = useState(0)
  const [progress, setProgress] = useState({ distance: 0, reached: 0 })

  useEffect(() => {
    if (runId === 0) return

    if (prefersReducedMotion()) {
      setProgress({ distance: total, reached: stops.length })
      return
    }

    let frame = 0
    let last = performance.now()
    let pauseUntil = 0
    let distance = 0
    let reached = 0
    setProgress({ distance: 0, reached: 0 })

    const tick = (now: number) => {
      if (now >= pauseUntil) {
        distance = Math.min(total, distance + (now - last) * UNITS_PER_MS)
        const nextStop = stops[reached]
        if (nextStop !== undefined && distance >= nextStop) {
          distance = nextStop
          reached += 1
          pauseUntil = now + PAUSE_MS
        }
        setProgress({ distance, reached })
      }
      last = now
      if (distance < total) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [runId, total, stops])

  const status: WalkStatus = runId === 0 ? 'idle' : progress.distance >= total ? 'done' : 'walking'

  return {
    ...progress,
    total,
    status,
    walk: () => setRunId((id) => id + 1),
  }
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
