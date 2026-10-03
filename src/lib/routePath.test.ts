import { describe, expect, it } from 'vitest'
import { buildPickList, parseRequest } from './picklist'
import {
  aislesFromLocations,
  buildRoutePath,
  inRequestOrder,
  MAP_WIDTH,
  pointAt,
  routeDistance,
  trailTo,
} from './routePath'
import type { InventoryRow, ProductRow } from './search'

const products: ProductRow[] = [
  { sku: 'TURTLE-01', name: 'Sea Turtle Plush', unitsPerCase: 12 },
  { sku: 'SHARK-02', name: 'Shark Plush', unitsPerCase: 8 },
  { sku: 'ALIEN-04', name: 'Alien Plush', unitsPerCase: 12 },
]

const inventory: InventoryRow[] = [
  { sku: 'TURTLE-01', location: 'A1-R2-S1', cases: 18 },
  { sku: 'TURTLE-01', location: 'A4-R1-S2', cases: 7 },
  { sku: 'SHARK-02', location: 'A2-R3-S1', cases: 14 },
  { sku: 'ALIEN-04', location: 'A3-R4-S2', cases: 4 },
]

const aisles = aislesFromLocations(inventory.map((row) => row.location))

// Pick lines for a request, in the order the pick list walks them (sorted by aisle).
const sortedLines = (request: string) =>
  buildPickList(parseRequest(request), products, inventory).lines

// The aisles a route visits, in the order it visits them.
const visitedAisles = (route: ReturnType<typeof buildRoutePath>, lines: { location: string }[]) =>
  route
    .filter((w) => w.pick !== undefined)
    .map((w) => Number(lines[w.pick!].location.match(/^A(\d+)/)![1]))

describe('aislesFromLocations', () => {
  it('derives aisles from the inventory, in numeric order, with the highest rack in each', () => {
    expect(aislesFromLocations(['A10-R2-S1', 'A2-R3-S1', 'A2-R1-S1'])).toEqual([
      { aisle: 2, racks: 3 },
      { aisle: 10, racks: 2 },
    ])
  })
})

describe('buildRoutePath', () => {
  it('starts on the left of the corridor and ends at the pack point on the right', () => {
    const route = buildRoutePath(sortedLines('TURTLE-01:3'), aisles)

    expect(route[0]).toMatchObject({ x: 16 })
    expect(route[route.length - 1]).toMatchObject({ x: MAP_WIDTH - 16 })
    expect(route[route.length - 1].y).toBe(route[0].y)
  })

  it('numbers each stop by its pick index, in route order', () => {
    const lines = sortedLines('TURTLE-01:20,SHARK-02:2')
    const route = buildRoutePath(lines, aisles)

    expect(route.filter((w) => w.pick !== undefined).map((w) => w.pick)).toEqual([0, 1, 2])
  })

  it('example request: request order visits A1, A2, A3 in that order', () => {
    const requests = parseRequest('TURTLE-01:3,SHARK-02:2,ALIEN-04:1')
    const lines = inRequestOrder(
      buildPickList(requests, products, inventory).lines,
      requests,
    )

    expect(visitedAisles(buildRoutePath(lines, aisles), lines)).toEqual([1, 2, 3])
  })
})

describe('routeDistance', () => {
  it('is the corridor length when there are no picks', () => {
    expect(routeDistance(buildRoutePath([], aisles))).toBe(MAP_WIDTH - 2 * 16)
  })

  it('sorted route for "Split pick" is shorter than request order', () => {
    const requests = parseRequest('TURTLE-01:20,SHARK-02:2')
    const sorted = buildPickList(requests, products, inventory).lines
    const requested = inRequestOrder(sorted, requests)

    // Sorted visits A1, A2, A4. Request order visits A1, A4, A2 and walks back past A2 to reach it.
    expect(visitedAisles(buildRoutePath(requested, aisles), requested)).toEqual([1, 4, 2])
    expect(routeDistance(buildRoutePath(sorted, aisles))).toBeLessThan(
      routeDistance(buildRoutePath(requested, aisles)),
    )
  })

  it('leaves out lines that could not be picked in full', () => {
    const result = buildPickList(parseRequest('TURTLE-01:3,ALIEN-04:5'), products, inventory)

    expect(result.errors).toHaveLength(1)
    expect(buildRoutePath(result.lines, aisles).filter((w) => w.pick !== undefined)).toHaveLength(1)
  })
})

describe('pointAt and trailTo', () => {
  it('starts at the beginning, ends at the pack point, and clamps beyond the end', () => {
    const route = buildRoutePath(sortedLines('SHARK-02:2'), aisles)
    const total = routeDistance(route)

    expect(pointAt(route, 0)).toEqual({ x: route[0].x, y: route[0].y })
    expect(pointAt(route, total)).toEqual({ x: MAP_WIDTH - 16, y: route[0].y })
    expect(pointAt(route, total + 100)).toEqual({ x: MAP_WIDTH - 16, y: route[0].y })
  })

  it('trail ends at the picker and includes only waypoints already passed', () => {
    const route = buildRoutePath(sortedLines('SHARK-02:2'), aisles)
    const halfway = routeDistance(route) / 2
    const trail = trailTo(route, halfway)

    expect(trail[trail.length - 1]).toEqual(pointAt(route, halfway))
    expect(trail.length).toBeLessThan(route.length + 1)
  })
})
