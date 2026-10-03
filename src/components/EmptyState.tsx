import type { LucideIcon } from 'lucide-react'

// Shown when a page has nothing to display yet. Says why, and what to do next.
export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed border-gray-400 bg-white px-4 py-8 text-center">
      <Icon className="size-8 text-gray-500" aria-hidden />
      <p className="mt-3 text-lg font-semibold">{title}</p>
      {children && <p className="mt-1 max-w-sm text-base text-gray-600">{children}</p>}
    </div>
  )
}
