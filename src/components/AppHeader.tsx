import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  title: ReactNode
  // Where the back button goes. Omit on top-level tabs.
  back?: { to: string; search?: Record<string, string>; label: string }
}

// Sticky top bar, like a native app. Stays put while the content scrolls underneath.
export function AppHeader({ title, back }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-xl items-center gap-2 px-4">
        {back && (
          <Link
            to={back.to}
            search={back.search}
            aria-label={back.label}
            className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-slate-700 active:bg-slate-100"
          >
            <ChevronLeft className="size-6" aria-hidden />
          </Link>
        )}
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight text-slate-900">{title}</h1>
      </div>
    </header>
  )
}
