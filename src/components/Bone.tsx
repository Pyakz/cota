import { cn } from '../lib/utils'

// Placeholder for a piece of text in a skeleton. Its box is exactly one line tall (1lh), so a
// skeleton row takes the same space as the real text it stands in for and nothing shifts on load.
export function Bone({ w, className }: { w: string; className?: string }) {
  return (
    <span aria-hidden className={cn('inline-flex h-[1lh] items-center align-middle', className)}>
      <span className={cn('block h-[0.8em] animate-pulse rounded bg-gray-200', w)} />
    </span>
  )
}
