import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PackageX, Warehouse } from 'lucide-react'
import { AppHeader } from '../../components/AppHeader'
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
    <>
      <AppHeader
        title="Step by step"
        back={{ to: '/replenish', search: { sku }, label: 'Back to replenishment' }}
      />

      <main className="mx-auto max-w-xl px-4 pt-4 pb-28">
        {options.length === 0 && (
          <EmptyState icon={Warehouse} title="No open shelves yet">
            Shelves show up here once they have been set up for a product.
          </EmptyState>
        )}

        {options.length > 0 && (
          <Select value={sku} onValueChange={(next) => navigate({ search: { sku: next } })}>
            <SelectTrigger
              aria-label="SKU"
              className="h-12 w-full rounded-xl border-transparent bg-white px-4 font-mono text-base text-slate-900 shadow-sm data-[size=default]:h-12"
            >
              <SelectValue placeholder="Choose SKU" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.sku} value={o.sku} className="py-2.5 text-base">
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
    </>
  )
}

// Same markup as the walkthrough, with text and blocks replaced by placeholders, so the layout doesn't move when data arrives.
function InteractiveSkeleton() {
  return (
    <>
      <AppHeader title={<Bone w="w-40" />} back={{ to: '/replenish', label: 'Back to replenishment' }} />
      <main aria-busy="true" className="mx-auto max-w-xl px-4 pt-4 pb-28">
        <span className="sr-only">Loading</span>

        <Skeleton className="h-12 w-full rounded-xl bg-white" />

        <section className="mt-5 space-y-5">
          <div>
            <div className="font-mono text-xs text-slate-500">
              <Bone w="w-24" />
            </div>
            <div className="text-lg font-semibold">
              <Bone w="w-48" />
            </div>
            <div className="text-sm text-slate-600">
              <Bone w="w-36" />
            </div>
          </div>

          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="size-20 rounded-xl bg-slate-200" />
            ))}
          </div>

          <Skeleton className="h-10 w-40 bg-slate-200" />

          <div className="grid grid-cols-10 gap-1.5">
            {Array.from({ length: 30 }, (_, i) => (
              <Skeleton key={i} className="aspect-square rounded-sm bg-slate-200" />
            ))}
          </div>

          <div className="min-h-20 rounded-2xl bg-white p-4">
            <div>
              <Bone w="w-11/12" />
            </div>
            <div>
              <Bone w="w-2/3" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-12 rounded-xl bg-slate-200" />
            <Skeleton className="h-12 rounded-xl bg-slate-200" />
          </div>
        </section>
      </main>
    </>
  )
}
