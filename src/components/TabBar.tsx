import { Link } from '@tanstack/react-router'
import { ClipboardList, PackageSearch, Warehouse, type LucideIcon } from 'lucide-react'

const TABS: { to: string; label: string; icon: LucideIcon; search?: Record<string, string> }[] = [
  { to: '/', label: 'Search', icon: PackageSearch, search: { q: '' } },
  { to: '/pick', label: 'Pick', icon: ClipboardList, search: { req: '' } },
  { to: '/replenish', label: 'Restock', icon: Warehouse, search: { sku: 'TURTLE-01' } },
]

// Bottom tab bar, the main navigation on a phone. Sits above the home indicator.
export function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-3">
        {TABS.map(({ to, label, icon: Icon, search }) => (
          <li key={to}>
            <Link
              to={to}
              search={search}
              className="flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold text-slate-500"
              activeProps={{ className: 'text-emerald-700' }}
              // Match on the path only. The tabs carry default search params, which would otherwise hide the active state.
              activeOptions={{ exact: true, includeSearch: false }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-7 w-14 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-emerald-100' : ''}`}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {label}
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
