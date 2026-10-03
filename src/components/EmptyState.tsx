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
    <div className="mt-6 flex flex-col items-center rounded-2xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-slate-200">
      <span className="flex size-14 items-center justify-center rounded-full bg-slate-100">
        <Icon className="size-7 text-slate-500" aria-hidden />
      </span>
      <p className="mt-4 text-lg font-semibold text-slate-900">{title}</p>
      {children && <p className="mt-1 max-w-xs text-sm leading-relaxed text-slate-600">{children}</p>}
    </div>
  )
}
