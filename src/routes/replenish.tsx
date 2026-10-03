import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { PackageX, Warehouse } from 'lucide-react'
import { useId, useState } from 'react'
import { planPullSource, planReplenishment } from '../lib/replenish'
import type { LocationStock } from '../lib/search'
import { Bone } from '../components/Bone'
import { EmptyState } from '../components/EmptyState'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Skeleton } from '../components/ui/skeleton'
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
  head: () => ({ meta: [{ title: 'Open-shelf replenishment · CoTa Warehouse' }] }),
  pendingComponent: ReplenishSkeleton,
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

      {shelf && <ShelfResult key={shelf.sku} shelf={shelf} />}

      {shelf && (
        <Link to="/interactive/replenish" search={{ sku }} className="mt-4 inline-block text-sm text-blue-700 underline">
          See it step by step →
        </Link>
      )}
    </main>
  )
}

type Shelf = {
  sku: string
  name: string
  unitsPerCase: number
  capacityUnits: number
  currentUnits: number
  locations: LocationStock[]
}

// Only plain digits count as a whole number. Empty or decimal input returns null.
function parseWhole(text: string): number | null {
  const trimmed = text.trim()
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null
}

// Inputs start from the DB values. This is a calculator only: nothing is saved.
// The parent keys this component on sku, so the inputs reset when the SKU changes.
function ShelfResult({ shelf }: { shelf: Shelf }) {
  const [capacityText, setCapacityText] = useState(String(shelf.capacityUnits))
  const [onShelfText, setOnShelfText] = useState(String(shelf.currentUnits))

  const capacity = parseWhole(capacityText)
  const onShelf = parseWhole(onShelfText)

  const capacityError =
    capacity === null ? 'Enter whole numbers' : capacity < 1 ? 'Capacity must be at least 1' : null
  const onShelfError =
    onShelf === null
      ? 'Enter whole numbers'
      : capacity !== null && onShelf > capacity
        ? "On shelf can't be more than capacity"
        : null

  return (
    <section className="mt-6 rounded-lg border border-gray-300 bg-white p-4">
      <div className="font-mono text-sm text-gray-600">{shelf.sku}</div>
      <div className="text-xl font-semibold">{shelf.name}</div>
      <div className="text-gray-700">{shelf.unitsPerCase} units per case</div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <NumberField
          label="Shelf capacity"
          min={1}
          value={capacityText}
          onChange={setCapacityText}
          error={capacityError}
        />
        <NumberField
          label="On shelf now"
          min={0}
          value={onShelfText}
          onChange={setOnShelfText}
          error={onShelfError}
        />
      </div>

      {capacity !== null && onShelf !== null && capacityError === null && onShelfError === null && (
        <ShelfPlan shelf={shelf} capacityUnits={capacity} currentUnits={onShelf} />
      )}
    </section>
  )
}

function NumberField({
  label,
  min,
  value,
  onChange,
  error,
}: {
  label: string
  min: number
  value: string
  onChange: (next: string) => void
  error: string | null
}) {
  const id = useId()

  return (
    <div>
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error !== null}
        className="mt-1 h-12 text-lg tabular-nums md:text-lg"
      />
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  )
}

function ShelfPlan({
  shelf,
  capacityUnits,
  currentUnits,
}: {
  shelf: Shelf
  capacityUnits: number
  currentUnits: number
}) {
  const storedCases = shelf.locations.reduce((sum, row) => sum + row.cases, 0)
  const plan = planReplenishment({
    capacityUnits,
    currentUnits,
    unitsPerCase: shelf.unitsPerCase,
    storedCases,
  })
  const alreadyFull = plan.neededUnits === 0
  const nothingInStorage = !alreadyFull && storedCases === 0
  const source = planPullSource(shelf.locations, plan.casesToPull)
  const addedUnits = plan.unitsAfter - currentUnits

  return (
    <>
      <div className="mt-4">
        <div
          role="img"
          aria-label={`${currentUnits} of ${capacityUnits} units on shelf, ${addedUnits} units added`}
          className="flex h-6 w-full overflow-hidden rounded-md bg-gray-200"
        >
          <div className="bg-gray-500" style={{ width: `${(currentUnits / capacityUnits) * 100}%` }} />
          <div className="bg-blue-600" style={{ width: `${(addedUnits / capacityUnits) * 100}%` }} />
        </div>
        <p className="mt-1 font-mono text-lg tabular-nums">
          {currentUnits} / {capacityUnits} → {plan.unitsAfter} · {plan.neededUnits} needed
        </p>
      </div>

      {alreadyFull ? (
        <p className="mt-4 text-lg font-semibold">The shelf is full. Pull nothing.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {nothingInStorage ? (
            <p className="text-2xl font-bold">Nothing in storage to pull.</p>
          ) : (
            <p className="text-2xl font-bold">
              Pull {plan.casesToPull} {plan.casesToPull === 1 ? 'case' : 'cases'} ({plan.unitsPulled} units).
            </p>
          )}

          {source.length === 1 && (
            <p className="text-lg">
              From <span className="font-mono">{source[0].location}</span>
            </p>
          )}
          {source.length > 1 && (
            <div className="text-base">
              <p>No single location has enough. Split pull:</p>
              <ul className="mt-1 space-y-1">
                {source.map((s) => (
                  <li key={s.location}>
                    <span className="font-mono">{s.location}</span>: {s.cases} {s.cases === 1 ? 'case' : 'cases'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plan.shortOfStock && (
            <p className="font-semibold text-red-700">
              Only {storedCases} cases in storage. The shelf will reach {plan.unitsAfter} / {capacityUnits}.
            </p>
          )}

          {plan.leftoverUnits > 0 && (
            <div className="rounded-md border border-amber-500 bg-amber-50 p-3 text-base">
              <p className="font-semibold">
                {plan.leftoverUnits} units won’t fit. Return them to storage as a partial case.
              </p>
              <p className="mt-2 text-gray-800">
                Storage is recorded in full cases only, so the system can’t track that partial case.
                Label it and note it by hand.
              </p>
            </div>
          )}

          {!plan.shortOfStock && plan.leftoverUnits === 0 && (
            <p className="text-base text-gray-800">The shelf will be exactly full. No partial case.</p>
          )}

          {plan.leftoverUnits > 0 && plan.casesIfRoundedDown >= 1 && (
            <p className="text-base text-gray-600">
              Pulling only {plan.casesIfRoundedDown} complete cases would leave the shelf{' '}
              {plan.unitsShortIfRoundedDown} units short.
            </p>
          )}
        </div>
      )}
    </>
  )
}

// Same markup as the page, with text replaced by placeholders, so the layout doesn't move when data arrives.
function ReplenishSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto max-w-xl px-4 py-6 font-sans">
      <span className="sr-only">Loading</span>
      <nav className="text-base">
        <Bone w="w-40" />
      </nav>

      <h1 className="mt-3 text-2xl font-bold">
        <Bone w="w-80" />
      </h1>

      <Skeleton className="mt-4 h-12 w-full bg-gray-200" />

      <section className="mt-6 rounded-lg border border-gray-300 bg-white p-4">
        <div className="font-mono text-sm text-gray-600">
          <Bone w="w-24" />
        </div>
        <div className="text-xl font-semibold">
          <Bone w="w-48" />
        </div>
        <div className="text-gray-700">
          <Bone w="w-36" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i}>
              <div className="text-base">
                <Bone w="w-28" />
              </div>
              <Skeleton className="mt-1 h-12 w-full bg-gray-200" />
            </div>
          ))}
        </div>

        <Skeleton className="mt-4 h-6 w-full bg-gray-200" />
        <div className="mt-1 font-mono text-lg">
          <Bone w="w-64" />
        </div>
        <div className="mt-4 text-2xl font-bold">
          <Bone w="w-72" />
        </div>
      </section>
    </main>
  )
}
