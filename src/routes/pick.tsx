import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, ClipboardList, PackageSearch, Plus, X } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { buildPickList, formatRequest, parseRequest, type PickRequest } from '../lib/picklist'
import { AppHeader } from '../components/AppHeader'
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

// A line is ready when it has a SKU and a whole number of cases above 0.
const isReadyLine = (row: DraftLine) => row.sku.trim() !== '' && /^\d+$/.test(row.cases.trim()) && Number(row.cases) > 0

function PickList() {
  const { requests, options, result, aisles } = Route.useLoaderData()
  const navigate = useNavigate({ from: '/pick' })

  const form = useForm({
    defaultValues: {
      lines: requests.map((r) => ({ sku: r.sku, cases: Number.isNaN(r.cases) ? '' : String(r.cases) })) as DraftLine[],
    },
    onSubmit: ({ value }) => {
      const text = formatRequest(
        value.lines.map((row) => ({ sku: row.sku.trim().toUpperCase(), cases: Number(row.cases.trim()) })),
      )
      navigate({ search: { req: text } })
    },
  })

  return (
    <>
      <AppHeader title="Pick list" />

      <main className="mx-auto max-w-xl px-4 pt-4 pb-28">
        {options.length === 0 && (
          <EmptyState icon={PackageSearch} title="No products yet">
            Products show up here once they have been added to the system. Then you can build a pick list.
          </EmptyState>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <form.Field name="lines">
            {(lines) => (
              <>
                <ul className="space-y-2">
                  {lines.state.value.map((_, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                      <form.Field name={`lines[${i}].sku`}>
                        {(field) => (
                          <Select value={field.state.value || undefined} onValueChange={(sku) => field.handleChange(sku)}>
                            <SelectTrigger
                              aria-label={`SKU, line ${i + 1}`}
                              className="h-12 min-w-0 flex-1 rounded-xl border-transparent bg-slate-100 px-3 font-mono text-base text-slate-900 data-[size=default]:h-12"
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
                      </form.Field>
                      <form.Field name={`lines[${i}].cases`}>
                        {(field) => (
                          <input
                            aria-label={`Cases, line ${i + 1}`}
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            type="number"
                            min={1}
                            step={1}
                            placeholder="Cases"
                            inputMode="numeric"
                            className="num h-12 w-20 shrink-0 rounded-xl bg-slate-100 px-3 text-right text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-emerald-100"
                          />
                        )}
                      </form.Field>
                      <button
                        type="button"
                        onClick={() => lines.removeValue(i)}
                        aria-label={`Remove line ${i + 1}`}
                        className="flex size-12 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
                      >
                        <X className="size-5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => lines.pushValue({ sku: '', cases: '' })}
                    className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white text-base font-semibold text-slate-800 active:scale-[0.98]"
                  >
                    <Plus className="size-5" aria-hidden />
                    Add line
                  </button>
                  <form.Subscribe
                    selector={(state) => ({
                      isDirty: state.isDirty,
                      canBuild: state.values.lines.length > 0 && state.values.lines.every(isReadyLine),
                    })}
                  >
                    {({ isDirty, canBuild }) => (
                      <button
                        type="submit"
                        disabled={!isDirty || !canBuild}
                        className="h-12 flex-1 rounded-xl bg-slate-900 text-base font-semibold text-white active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500"
                      >
                        Build pick list
                      </button>
                    )}
                  </form.Subscribe>
                </div>
              </>
            )}
          </form.Field>
        </form>

        {requests.length === 0 && (
          <EmptyState icon={ClipboardList} title="No lines in this pick list">
            Add at least one SKU and case count, then build the list.
          </EmptyState>
        )}

        {result.errors.length > 0 && (
          <div role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
            <div className="flex items-center gap-2 text-base font-bold text-red-800">
              <AlertTriangle className="size-5 shrink-0" aria-hidden />
              {result.errors.length} {result.errors.length === 1 ? 'line' : 'lines'} could not be picked in full
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-900">
              {result.errors.map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-red-900">No partial picks were added for these lines. Check stock before picking.</p>
          </div>
        )}

        {result.lines.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Walk order</h2>
            <ol className="mt-2 space-y-2">
              {result.lines.map((line) => (
                <li
                  key={`${line.sequence}-${line.location}-${line.sku}`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <span className="num flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-base font-bold text-white">
                    {line.sequence}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-base font-semibold text-slate-900">{line.location}</div>
                    <div className="truncate text-sm text-slate-600">
                      {line.sku} · {line.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num text-2xl font-bold text-slate-900">{line.cases}</div>
                    <div className="text-xs text-slate-500">{line.cases === 1 ? 'case' : 'cases'}</div>
                  </div>
                </li>
              ))}
            </ol>
            <RouteDialog picks={result.lines} aisles={aisles} />
          </section>
        )}

        {result.lines.length === 0 && result.errors.length === 0 && requests.length > 0 && (
          <p className="mt-6 text-slate-600">Nothing to pick.</p>
        )}
      </main>
    </>
  )
}

// Same markup as the page, with text replaced by placeholders, so the layout doesn't move when data arrives.
function PickSkeleton() {
  return (
    <>
      <AppHeader title={<Bone w="w-24" />} />
      <main aria-busy="true" className="mx-auto max-w-xl px-4 pt-4 pb-28">
        <span className="sr-only">Loading</span>

        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2">
              <Skeleton className="h-12 min-w-0 flex-1 rounded-xl bg-slate-200" />
              <Skeleton className="h-12 w-20 shrink-0 rounded-xl bg-slate-200" />
              <Skeleton className="size-12 shrink-0 rounded-xl bg-slate-200" />
            </li>
          ))}
        </ul>

        <div className="mt-3 flex gap-2">
          <Skeleton className="h-12 flex-1 rounded-xl bg-slate-200" />
          <Skeleton className="h-12 flex-1 rounded-xl bg-slate-200" />
        </div>

        <section className="mt-6">
          <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            <Bone w="w-20" />
          </div>
          <ol className="mt-2 space-y-2">
            {[0, 1].map((i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                <Skeleton className="size-10 shrink-0 rounded-full bg-slate-200" />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-base font-semibold">
                    <Bone w="w-24" />
                  </div>
                  <div className="text-sm text-slate-600">
                    <Bone w="w-56" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    <Bone w="w-6" />
                  </div>
                  <div className="text-xs text-slate-500">
                    <Bone w="w-12" />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  )
}
