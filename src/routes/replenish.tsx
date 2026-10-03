import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { planReplenishment } from '../lib/replenish'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { getShelfFn, getShelfOptionsFn } from '../server/shelves'

export const Route = createFileRoute('/replenish')({
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
  component: Replenish,
})

function Replenish() {
  const { sku } = Route.useSearch()
  const { shelf, options } = Route.useLoaderData()
  const navigate = useNavigate({ from: '/replenish' })

  return (
    <main className="mx-auto max-w-xl px-4 py-6 font-sans">
      <nav className="text-base">
        <Link to="/" search={{ q: '' }} className="text-blue-700 underline">
          ← Inventory search
        </Link>
      </nav>

      <h1 className="mt-3 text-2xl font-bold">Open-shelf replenishment</h1>

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

      {!shelf && (
        <p className="mt-6 text-gray-600">No open shelf found for “{sku}”.</p>
      )}

      {shelf && <ShelfResult shelf={shelf} />}
    </main>
  )
}

function ShelfResult({
  shelf,
}: {
  shelf: { sku: string; name: string; unitsPerCase: number; capacityUnits: number; currentUnits: number }
}) {
  const plan = planReplenishment(shelf)
  const alreadyFull = plan.neededUnits === 0

  return (
    <section className="mt-6 rounded-lg border border-gray-300 bg-white p-4">
      <div className="font-mono text-sm text-gray-600">{shelf.sku}</div>
      <div className="text-xl font-semibold">{shelf.name}</div>
      <div className="text-gray-700">{shelf.unitsPerCase} units per case</div>

      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-md bg-gray-100 p-3 text-center">
        <Stat label="Capacity" value={shelf.capacityUnits} />
        <Stat label="On shelf" value={shelf.currentUnits} />
        <Stat label="Needed" value={plan.neededUnits} />
      </dl>

      {alreadyFull ? (
        <p className="mt-4 text-lg font-semibold">The shelf is full. Pull nothing.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-2xl font-bold">
            Pull {plan.casesToPull} {plan.casesToPull === 1 ? 'case' : 'cases'} ({plan.unitsPulled} units).
          </p>

          {plan.leftoverUnits > 0 ? (
            <div className="rounded-md border border-amber-500 bg-amber-50 p-3 text-base">
              <p className="font-semibold">
                {plan.leftoverUnits} units won’t fit. Return them to storage as a partial case.
              </p>
              <p className="mt-2 text-gray-800">
                Storage is recorded in full cases only, so the system can’t track that partial case.
                Label it and note it by hand.
              </p>
            </div>
          ) : (
            <p className="text-base text-gray-800">The shelf will be exactly full. No partial case.</p>
          )}

          {plan.neededUnits >= shelf.unitsPerCase && (
            <p className="text-base text-gray-600">
              Pulling only {Math.floor(plan.neededUnits / shelf.unitsPerCase)} complete cases would leave the shelf{' '}
              {plan.unitsShortIfRoundedDown} units short.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className="text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  )
}
