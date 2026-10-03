import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { RefillWalkthrough } from '../../components/refill/RefillWalkthrough'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
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

      {!shelf && <p className="mt-6 text-gray-600">No open shelf found for “{sku}”.</p>}

      {shelf && <RefillWalkthrough key={shelf.sku} shelf={shelf} />}
    </main>
  )
}
