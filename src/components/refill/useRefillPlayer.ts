import { useEffect, useState } from 'react'
import type { RefillStep } from '../../lib/refillSteps'

const UNIT_MS = 80

// Playback for the explainer. `placed` counts the units of the case being opened that have
// landed so far, and is null when nothing is animating. The interval exists only while animating,
// so it is cleared on Start over, on unmount, and when the step settles.
export function useRefillPlayer(steps: RefillStep[], unitsPerCase: number) {
  const [index, setIndex] = useState(0)
  const [placed, setPlaced] = useState<number | null>(null)
  const animating = placed !== null

  useEffect(() => {
    if (!animating) return
    const id = setInterval(() => {
      setPlaced((p) => (p === null || p + 1 >= unitsPerCase ? null : p + 1))
    }, UNIT_MS)
    return () => clearInterval(id)
  }, [animating, unitsPerCase])

  const lastIndex = steps.length - 1

  function next() {
    if (animating) return
    if (index === lastIndex) {
      setIndex(0)
      return
    }

    const nextIndex = index + 1
    setIndex(nextIndex)

    const opensCase = steps[nextIndex].openedCases > steps[index].openedCases
    if (opensCase && !prefersReducedMotion()) setPlaced(0)
  }

  function startOver() {
    setIndex(0)
    setPlaced(null)
  }

  return { index, placed, animating, next, startOver }
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
