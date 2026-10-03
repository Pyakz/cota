// Location codes look like A{aisle}-R{rack}-S{shelf}, e.g. "A10-R2-S1".
export type Location = { aisle: number; rack: number; shelf: number; code: string }

export function parseLocation(code: string): Location {
  const match = /^A(\d+)-R(\d+)-S(\d+)$/.exec(code)
  if (!match) throw new Error(`Invalid location code: ${code}`)
  return {
    aisle: Number(match[1]),
    rack: Number(match[2]),
    shelf: Number(match[3]),
    code,
  }
}

// Compares numerically, so A2 sorts before A10. Never sort the raw strings.
export function compareLocations(a: string, b: string): number {
  const x = parseLocation(a)
  const y = parseLocation(b)
  return x.aisle - y.aisle || x.rack - y.rack || x.shelf - y.shelf
}
