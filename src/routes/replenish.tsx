import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, ChevronRight, PackageX, Warehouse } from 'lucide-react'
import { useId, useState } from 'react'
import { planPullSource, planReplenishment } from '../lib/replenish'
import type { LocationStock } from '../lib/search'
import { AppHeader } from '../components/AppHeader'
import { Bone } from '../components/Bone'
import { EmptyState } from '../components/EmptyState'
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
    <>
      <AppHeader title="Replenishment" />

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

        {shelf && <ShelfResult key={shelf.sku} shelf={shelf} />}

        {shelf && (
          <Link
            to="/interactive/replenish"
            search={{ sku }}
            className="mt-4 flex h-12 items-center justify-between rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold text-slate-800 active:scale-[0.98]"
          >
            See it step by step
            <ChevronRight className="size-5 text-slate-400" aria-hidden />
          </Link>
        )}
      </main>
    </>
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
    <section className="mt-4 space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="font-mono text-xs text-slate-500">{shelf.sku}</div>
        <div className="text-lg font-semibold text-slate-900">{shelf.name}</div>
        <div className="text-sm text-slate-600">{shelf.unitsPerCase} units per case</div>

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
      <Label htmlFor={id} className="text-sm font-medium text-slate-600">
        {label}
      </Label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error !== null}
        className="num mt-1.5 h-12 w-full rounded-xl bg-slate-100 px-3 text-lg font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-emerald-100 aria-invalid:bg-red-50 aria-invalid:ring-2 aria-invalid:ring-red-300"
      />
      {error && <p className="mt-1 text-xs font-medium text-red-700">{error}</p>}
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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div
          role="img"
          aria-label={`${currentUnits} of ${capacityUnits} units on shelf, ${addedUnits} units added`}
          className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200"
        >
          <div className="bg-slate-500" style={{ width: `${(currentUnits / capacityUnits) * 100}%` }} />
          <div className="bg-emerald-500" style={{ width: `${(addedUnits / capacityUnits) * 100}%` }} />
        </div>
        <p className="num mt-2 text-sm text-slate-600">
          {currentUnits} / {capacityUnits} → <span className="font-semibold text-slate-900">{plan.unitsAfter}</span> ·{' '}
          {plan.neededUnits} needed
        </p>
      </div>

      {alreadyFull ? (
        <div className="rounded-2xl bg-emerald-600 p-5 text-white shadow-sm">
          <p className="text-xl font-bold">The shelf is full</p>
          <p className="mt-1 text-sm text-emerald-50">Pull nothing.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
            {nothingInStorage ? (
              <p className="text-xl font-bold">Nothing in storage to pull</p>
            ) : (
              <>
                <p className="text-sm text-slate-300">Pull</p>
                <p className="num text-3xl font-bold">
                  {plan.casesToPull} {plan.casesToPull === 1 ? 'case' : 'cases'}
                  <span className="ml-2 text-base font-medium text-slate-300">({plan.unitsPulled} units)</span>
                </p>
                {source.length === 1 && (
                  <p className="mt-2 text-base">
                    From <span className="font-mono font-semibold">{source[0].location}</span>
                  </p>
                )}
              </>
            )}
          </div>

          {source.length > 1 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-base font-semibold text-slate-900">No single location has enough. Split the pull:</p>
              <ul className="mt-2 divide-y divide-slate-100">
                {source.map((s) => (
                  <li key={s.location} className="flex justify-between py-2 text-base">
                    <span className="font-mono">{s.location}</span>
                    <span className="num font-semibold">
                      {s.cases} {s.cases === 1 ? 'case' : 'cases'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plan.shortOfStock && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              Only {storedCases} cases in storage. The shelf will reach {plan.unitsAfter} / {capacityUnits}.
            </p>
          )}

          {plan.leftoverUnits > 0 && (
            <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-300">
              <div className="flex items-start gap-2 text-base font-semibold text-amber-900">
                <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                {plan.leftoverUnits} units won’t fit. Return them to storage as a partial case.
              </div>
              <p className="mt-2 text-sm text-amber-900">
                Storage is recorded in full cases only, so the system can’t track that partial case. Label it and note it by
                hand.
              </p>
            </div>
          )}

          {!plan.shortOfStock && plan.leftoverUnits === 0 && (
            <p className="px-1 text-sm text-slate-600">The shelf will be exactly full. No partial case.</p>
          )}

          {plan.leftoverUnits > 0 && plan.casesIfRoundedDown >= 1 && (
            <p className="px-1 text-sm text-slate-600">
              Pulling only {plan.casesIfRoundedDown} complete cases would leave the shelf {plan.unitsShortIfRoundedDown} units
              short.
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
    <>
      <AppHeader title={<Bone w="w-36" />} />
      <main aria-busy="true" className="mx-auto max-w-xl px-4 pt-4 pb-28">
        <span className="sr-only">Loading</span>

        <Skeleton className="h-12 w-full rounded-xl bg-white" />

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="font-mono text-xs text-slate-500">
            <Bone w="w-20" />
          </div>
          <div className="text-lg font-semibold">
            <Bone w="w-48" />
          </div>
          <div className="text-sm text-slate-600">
            <Bone w="w-32" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {[0, 1].map((i) => (
              <div key={i}>
                <div className="text-sm">
                  <Bone w="w-24" />
                </div>
                <Skeleton className="mt-1.5 h-12 w-full rounded-xl bg-slate-200" />
              </div>
            ))}
          </div>
        </section>

        <Skeleton className="mt-4 h-24 w-full rounded-2xl bg-slate-200" />
      </main>
    </>
  )
}
