import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PackageSearch, Search, SearchX } from 'lucide-react'
import { useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { Bone } from '../components/Bone'
import { EmptyState } from '../components/EmptyState'
import { Skeleton } from '../components/ui/skeleton'
import { searchInventoryFn } from '../server/inventory'

// The query lives in the URL (?q=...) so a search can be bookmarked or shared.
export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : '',
  }),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ deps }) => searchInventoryFn({ data: { query: deps.q } }),
  head: () => ({ meta: [{ title: 'Inventory search · CoTa Warehouse' }] }),
  pendingComponent: SearchSkeleton,
  component: InventorySearch,
})

function InventorySearch() {
  const { q } = Route.useSearch()
  const results = Route.useLoaderData()
  const navigate = useNavigate({ from: '/' })
  const [draft, setDraft] = useState(q)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    navigate({ search: { q: draft.trim() } })
  }

  return (
    <>
      <AppHeader title="Inventory" />

      <main className="mx-auto max-w-xl px-4 pt-4 pb-28">
        <form onSubmit={submit} role="search" className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="SKU or product name"
            aria-label="SKU or product name"
            autoCapitalize="characters"
            autoComplete="off"
            enterKeyHint="search"
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pr-4 pl-11 text-base shadow-sm outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          />
        </form>

        {results.length === 0 && q !== '' && (
          <EmptyState icon={SearchX} title={`No products match “${q}”`}>
            Check the SKU, or try part of the product name.
          </EmptyState>
        )}

        {results.length === 0 && q === '' && (
          <EmptyState icon={PackageSearch} title="No products yet">
            Products show up here once they have been added to the system.
          </EmptyState>
        )}

        <ul className="mt-4 space-y-3">
          {results.map((r) => (
            <li key={r.sku} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-slate-500">{r.sku}</div>
                  <div className="truncate text-lg font-semibold text-slate-900">{r.name}</div>
                  <div className="text-sm text-slate-600">{r.unitsPerCase} units per case</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Stat label="Cases" value={r.totalCases} />
                <Stat label="Units" value={r.totalUnits} />
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Locations</div>
                {r.locations.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">No stock on record.</p>
                ) : (
                  <ul className="mt-1 divide-y divide-slate-100">
                    {r.locations.map((l) => (
                      <li key={l.location} className="flex items-center justify-between py-2.5">
                        <span className="font-mono text-sm text-slate-800">{l.location}</span>
                        <span className="num text-base font-semibold text-slate-900">
                          {l.cases} <span className="text-sm font-normal text-slate-500">cs</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-100 px-3 py-2.5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="num text-2xl font-bold text-slate-900">{value}</div>
    </div>
  )
}

// Same markup as the page, with text replaced by placeholders, so the layout doesn't move when data arrives.
function SearchSkeleton() {
  return (
    <>
      <AppHeader title={<Bone w="w-28" />} />
      <main aria-busy="true" className="mx-auto max-w-xl px-4 pt-4 pb-28">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-12 w-full rounded-xl bg-slate-200" />

        <ul className="mt-4 space-y-3">
          {[0, 1].map((i) => (
            <li key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="font-mono text-xs text-slate-500">
                <Bone w="w-20" />
              </div>
              <div className="text-lg font-semibold">
                <Bone w="w-48" />
              </div>
              <div className="text-sm text-slate-600">
                <Bone w="w-32" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Skeleton className="h-16 rounded-xl bg-slate-200" />
                <Skeleton className="h-16 rounded-xl bg-slate-200" />
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
