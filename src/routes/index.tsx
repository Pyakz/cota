import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { searchInventoryFn } from '../server/inventory'

// The query lives in the URL (?q=...) so a search can be bookmarked or shared.
export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : '',
  }),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ deps }) => searchInventoryFn({ data: { query: deps.q } }),
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
    <main className="mx-auto max-w-xl px-4 py-6 font-sans">
      <h1 className="text-2xl font-bold">Inventory search</h1>
      <nav className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-base">
        <Link to="/replenish" search={{ sku: 'TURTLE-01' }} className="text-blue-700 underline">
          Open-shelf replenishment →
        </Link>
        <Link to="/pick" search={{ req: '' }} className="text-blue-700 underline">
          Pick list →
        </Link>
      </nav>

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="SKU or product name"
          aria-label="SKU or product name"
          autoCapitalize="characters"
          autoComplete="off"
          className="h-12 min-w-0 flex-1 rounded-md border border-gray-400 bg-white px-3 text-lg"
        />
        <button
          type="submit"
          className="h-12 rounded-md bg-gray-900 px-5 text-lg font-semibold text-white"
        >
          Search
        </button>
      </form>

      {q === '' && (
        <p className="mt-6 text-gray-600">Enter a SKU or product name to search.</p>
      )}

      {q !== '' && results.length === 0 && (
        <p className="mt-6 text-gray-600">No products match “{q}”.</p>
      )}

      <ul className="mt-6 space-y-4">
        {results.map((r) => (
          <li key={r.sku} className="rounded-lg border border-gray-300 bg-white p-4">
            <div className="font-mono text-sm text-gray-600">{r.sku}</div>
            <div className="text-xl font-semibold">{r.name}</div>
            <div className="text-gray-700">{r.unitsPerCase} units per case</div>

            <table className="mt-3 w-full text-left text-base">
              <thead className="text-sm text-gray-600">
                <tr>
                  <th className="py-1 font-medium">Location</th>
                  <th className="py-1 text-right font-medium">Cases</th>
                </tr>
              </thead>
              <tbody>
                {r.locations.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-2 text-gray-600">
                      No stock on record.
                    </td>
                  </tr>
                )}
                {r.locations.map((l) => (
                  <tr key={l.location} className="border-t border-gray-200">
                    <td className="py-2 font-mono">{l.location}</td>
                    <td className="py-2 text-right tabular-nums">{l.cases}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-gray-100 p-3">
              <div>
                <div className="text-sm text-gray-600">Total cases</div>
                <div className="text-2xl font-bold tabular-nums">{r.totalCases}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total units</div>
                <div className="text-2xl font-bold tabular-nums">{r.totalUnits}</div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
