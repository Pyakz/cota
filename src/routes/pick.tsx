import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ClipboardList, PackageSearch } from 'lucide-react'
import { useState } from 'react'
import { buildPickList, formatRequest, parseRequest, type PickRequest } from '../lib/picklist'
import { Bone } from '../components/Bone'
import { EmptyState } from '../components/EmptyState'
import { RouteDialog } from '../components/pick/RouteDialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Skeleton } from '../components/ui/skeleton'
import { aislesFromLocations } from '../lib/routePath'
import { searchInventoryFn } from '../server/inventory'
import { getPickDataFn, getProductOptionsFn } from '../server/picklist'

const DEFAULT_REQUEST = 'TURTLE-01:25,SHARK-02:2,ALIEN-04:1'

// The request is kept in the URL (?req=TURTLE-01:3,SHARK-02:2) so a pick list can be reopened or shared.
export const Route = createFileRoute('/pick')({
  validateSearch: (search: Record<string, unknown>) => ({
    req: typeof search.req === 'string' && search.req !== '' ? search.req : DEFAULT_REQUEST,
  }),
  loaderDeps: ({ search }) => ({ req: search.req }),
  loader: async ({ deps }) => {
    const requests: PickRequest[] = parseRequest(deps.req)
    const skus = [...new Set(requests.map((r) => r.sku))]
    const data = skus.length === 0 ? { products: [], inventory: [] } : await getPickDataFn({ data: { skus } })
    const options = await getProductOptionsFn()
    // A blank query returns every product with its locations, so the route map covers the whole warehouse.
    const stock = await searchInventoryFn({ data: { query: '' } })
    const locations = stock.flatMap((p) => p.locations.map((l) => l.location))
    return {
      requests,
      options,
      result: buildPickList(requests, data.products, data.inventory),
      aisles: aislesFromLocations(locations),
    }
  },
  head: () => ({ meta: [{ title: 'Pick list · CoTa Warehouse' }] }),
  pendingComponent: PickSkeleton,
  component: PickList,
})

type DraftLine = { sku: string; cases: string }

function PickList() {
  const { requests, options, result, aisles } = Route.useLoaderData()
  const navigate = useNavigate({ from: '/pick' })

  const [draft, setDraft] = useState<DraftLine[]>(() =>
    requests.map((r) => ({ sku: r.sku, cases: Number.isNaN(r.cases) ? '' : String(r.cases) })),
  )

  function update(i: number, patch: Partial<DraftLine>) {
    setDraft((rows) => rows.map((row, j) => (j === i ? { ...row, ...patch } : row)))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const text = formatRequest(
      draft
        .filter((row) => row.sku.trim() !== '' || row.cases.trim() !== '')
        .map((row) => ({ sku: row.sku.trim().toUpperCase(), cases: Number(row.cases.trim()) })),
    )
    navigate({ search: { req: text } })
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6 font-sans">
      <nav className="text-base">
        <Link to="/" search={{ q: '' }} className="text-blue-700 underline">
          ← Inventory search
        </Link>
      </nav>

      <h1 className="mt-3 text-2xl font-bold">Pick list</h1>

      {options.length === 0 && (
        <EmptyState icon={PackageSearch} title="No products yet">
          Products show up here once they have been added to the system. Then you can build a pick list.
        </EmptyState>
      )}

      <form onSubmit={submit} className="mt-4 space-y-3">
        {draft.map((row, i) => (
          <div key={i} className="flex gap-2">
            <Select value={row.sku || undefined} onValueChange={(sku) => update(i, { sku })}>
              <SelectTrigger
                aria-label={`SKU, line ${i + 1}`}
                className="h-12 min-w-0 flex-1 rounded-md border-gray-400 bg-white px-3 font-mono text-lg data-[size=default]:h-12"
              >
                <SelectValue placeholder="Choose SKU" />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.sku} value={o.sku} className="py-2 text-base">
                    <span className="font-mono">{o.sku}</span> · {o.name}
                    {o.storedCases === 0 && <span className="ml-2 text-red-700">· out of stock</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              aria-label={`Cases, line ${i + 1}`}
              value={row.cases}
              onChange={(e) => update(i, { cases: e.target.value })}
              type="number"
              min={1}
              step={1}
              placeholder="Cases"
              inputMode="numeric"
              className="h-12 w-24 rounded-md border border-gray-400 bg-white px-3 text-right text-lg tabular-nums"
            />
            <button
              type="button"
              onClick={() => setDraft((rows) => rows.filter((_, j) => j !== i))}
              aria-label={`Remove line ${i + 1}`}
              className="h-12 w-12 rounded-md border border-gray-400 bg-white text-xl"
            >
              ×
            </button>
          </div>
        ))}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDraft((rows) => [...rows, { sku: '', cases: '' }])}
            className="h-12 flex-1 rounded-md border border-gray-400 bg-white text-lg font-semibold"
          >
            + Add line
          </button>
          <button
            type="submit"
            className="h-12 flex-1 rounded-md bg-gray-900 text-lg font-semibold text-white"
          >
            Build pick list
          </button>
        </div>
      </form>

      {requests.length === 0 && (
        <EmptyState icon={ClipboardList} title="No lines in this pick list">
          Add at least one SKU and case count, then build the list.
        </EmptyState>
      )}

      {result.errors.length > 0 && (
        <div role="alert" className="mt-6 rounded-md border border-red-600 bg-red-50 p-4">
          <p className="text-lg font-bold text-red-800">
            {result.errors.length} {result.errors.length === 1 ? 'line' : 'lines'} could not be picked in full
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-red-900">
            {result.errors.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
          <p className="mt-2 text-base text-red-900">
            No partial picks were added for these lines. Check stock before picking.
          </p>
        </div>
      )}

      {result.lines.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Walk order</h2>
          <ol className="mt-2 space-y-3">
            {result.lines.map((line) => (
              <li key={`${line.sequence}-${line.location}-${line.sku}`} className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-lg font-bold text-white tabular-nums">
                  {line.sequence}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-lg font-semibold">{line.location}</div>
                  <div className="text-base text-gray-700">
                    {line.sku} · {line.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold tabular-nums">{line.cases}</div>
                  <div className="text-sm text-gray-600">{line.cases === 1 ? 'case' : 'cases'}</div>
                </div>
              </li>
            ))}
          </ol>
          <RouteDialog picks={result.lines} aisles={aisles} />
        </section>
      )}

      {result.lines.length === 0 && result.errors.length === 0 && requests.length > 0 && (
        <p className="mt-6 text-gray-600">Nothing to pick.</p>
      )}
    </main>
  )
}

// Same markup as the page, with text replaced by placeholders, so the layout doesn't move when data arrives.
function PickSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto max-w-xl px-4 py-6 font-sans">
      <span className="sr-only">Loading</span>
      <nav className="text-base">
        <Bone w="w-40" />
      </nav>

      <h1 className="mt-3 text-2xl font-bold">
        <Bone w="w-36" />
      </h1>

      <div className="mt-4 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-12 min-w-0 flex-1 bg-gray-200" />
            <Skeleton className="h-12 w-24 bg-gray-200" />
            <Skeleton className="h-12 w-12 bg-gray-200" />
          </div>
        ))}

        <div className="flex gap-2">
          <Skeleton className="h-12 flex-1 bg-gray-200" />
          <Skeleton className="h-12 flex-1 bg-gray-200" />
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">
          <Bone w="w-32" />
        </h2>
        <ol className="mt-2 space-y-3">
          {[0, 1].map((i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white p-4">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full bg-gray-200" />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-lg font-semibold">
                  <Bone w="w-24" />
                </div>
                <div className="text-base text-gray-700">
                  <Bone w="w-56" />
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  <Bone w="w-6" />
                </div>
                <div className="text-sm text-gray-600">
                  <Bone w="w-12" />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
