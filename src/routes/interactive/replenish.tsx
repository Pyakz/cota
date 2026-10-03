import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Warehouse, PackageX } from 'lucide-react'
import { Bone } from '../../components/Bone'
import { EmptyState } from '../../components/EmptyState'
import { RefillWalkthrough } from '../../components/refill/RefillWalkthrough'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Skeleton } from '../../components/ui/skeleton'
import { getShelfFn, getShelfOptionsFn } from '../../server/shelves'

// Optional animated walkthrough of /replenish. It reads the same data and uses the same math.
export const Route = createFileRoute('/interactive/replenish')({
  validateSearch: (search: Record<string, unknown>) => ({
    sku: typeof search.sku === 'string' && search.sku !== '' ? search.sku : 'TURTLE-01',
  }),
  loaderDeps: ({ search }) => ({ sku: search.sku }),
  loader: async ({ deps }) => {
    const [shelf, options] = await Promise.all([
      getShelfFn({ data: { sku: deps.sku } }),
      getShelfOptionsFn(),
    ])
    return { shelf, options }
  },
  head: () => ({ meta: [{ title: 'Replenishment, step by step · CoTa Warehouse' }] }),
  pendingComponent: InteractiveSkeleton,
  component: InteractiveReplenish,
})

function InteractiveReplenish() {
  const { sku } = Route.useSearch()
  const { shelf, options } = Route.useLoaderData()
  const navigate = useNavigate({ from: '/interactive/replenish' })

  return (
    <main className="mx-auto max-w-xl px-4 py-6 font-sans">
      <nav className="text-base">
        <Link to="/replenish" search={{ sku }} className="text-blue-700 underline">
          ← Calculator
        </Link>
      </nav>

      <h1 className="mt-3 text-2xl font-bold">Replenishment, step by step</h1>

      {options.length === 0 && (
        <EmptyState icon={Warehouse} title="No open shelves yet">
          Shelves show up here once they have been set up for a product.
        </EmptyState>
      )}

      {options.length > 0 && (
        <Select value={sku} onValueChange={(next) => navigate({ search: { sku: next } })}>
          <SelectTrigger
            aria-label="SKU"
            className="mt-4 h-12 w-full rounded-md border-gray-400 bg-white px-3 font-mono text-lg data-[size=default]:h-12"
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
      )}

      {!shelf && options.length > 0 && (
        <EmptyState icon={PackageX} title={`No open shelf for “${sku}”`}>
          Choose another SKU from the list.
        </EmptyState>
      )}

      {shelf && <RefillWalkthrough key={shelf.sku} shelf={shelf} />}
    </main>
  )
}

// Same markup as the walkthrough, with text and blocks replaced by placeholders, so the layout doesn't move when data arrives.
function InteractiveSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto max-w-xl px-4 py-6 font-sans">
      <span className="sr-only">Loading</span>
      <nav className="text-base">
        <Bone w="w-28" />
      </nav>

      <h1 className="mt-3 text-2xl font-bold">
        <Bone w="w-80" />
      </h1>

      <Skeleton className="mt-4 h-12 w-full bg-gray-200" />

      <section className="mt-6 space-y-5">
        <div>
          <div className="font-mono text-sm text-gray-600">
            <Bone w="w-24" />
          </div>
          <div className="text-xl font-semibold">
            <Bone w="w-48" />
          </div>
          <div className="text-gray-700">
            <Bone w="w-36" />
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-gray-600">
            <Bone w="w-16" />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-20 rounded-md bg-gray-200" />
            ))}
          </div>
        </div>

        <div className="flex items-baseline justify-between">
          <div className="font-mono text-3xl font-bold">
            <Bone w="w-28" />
          </div>
          <div className="text-sm text-gray-600">
            <Bone w="w-20" />
          </div>
        </div>

        <div className="grid grid-cols-10 gap-1.5">
          {Array.from({ length: 30 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-sm bg-gray-200" />
          ))}
        </div>

        <div className="min-h-20 rounded-md border border-gray-300 bg-gray-50 p-4 text-lg leading-snug">
          <div>
            <Bone w="w-11/12" />
          </div>
          <div>
            <Bone w="w-2/3" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-12 bg-gray-200" />
          <Skeleton className="h-12 bg-gray-200" />
        </div>
      </section>
    </main>
  )
}
