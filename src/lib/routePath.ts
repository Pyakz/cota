import { parseLocation } from './location'
import type { PickLine, PickRequest } from './picklist'

// Map geometry in SVG units. The map is drawn with this viewBox, so every waypoint uses these coordinates.
export const MAP_WIDTH = 360
export const MAP_HEIGHT = 260
export const CORRIDOR_Y = 236
export const RACK_TOP = 36
export const RACK_BOTTOM = 212
const EDGE_MARGIN = 56
const START_X = 16

export type MapAisle = { aisle: number; racks: number }
export type Waypoint = { x: number; y: number; pick?: number }

// Aisles are drawn for every aisle that has stock, so the map follows the inventory, not a fixed list.
export function aislesFromLocations(locations: string[]): MapAisle[] {
  const racks = new Map<number, number>()
  for (const code of locations) {
    const loc = parseLocation(code)
    racks.set(loc.aisle, Math.max(racks.get(loc.aisle) ?? 0, loc.rack))
  }
  return [...racks]
    .sort(([a], [b]) => a - b)
    .map(([aisle, racks]) => ({ aisle, racks }))
}

// Evenly spaced across the map, in aisle-number order. Returns the x of each aisle's lane.
export function aisleLaneX(aisles: MapAisle[]): Map<number, number> {
  const span = MAP_WIDTH - 2 * EDGE_MARGIN
  const step = aisles.length > 1 ? span / (aisles.length - 1) : 0
  return new Map(
    aisles.map((a, i) => [a.aisle, aisles.length > 1 ? EDGE_MARGIN + i * step : MAP_WIDTH / 2]),
  )
}

// Rack 1 is at the top of the aisle, so the picker walks up further for higher rack numbers.
export function rackY(rack: number, maxRack: number): number {
  return RACK_TOP + ((rack - 0.5) / maxRack) * (RACK_BOTTOM - RACK_TOP)
}

// Waypoints for the picks in the order given. Each pick walks along the bottom corridor to its aisle,
// up into the lane to the stop, back down, then on to the pack point on the right.
export function buildRoutePath(picks: PickLine[], aisles: MapAisle[]): Waypoint[] {
  const laneX = aisleLaneX(aisles)
  const maxRack = Math.max(1, ...aisles.map((a) => a.racks))
  const waypoints: Waypoint[] = [{ x: START_X, y: CORRIDOR_Y }]

  picks.forEach((pick, i) => {
    const loc = parseLocation(pick.location)
    const x = laneX.get(loc.aisle)
    if (x === undefined) throw new Error(`No aisle drawn for ${pick.location}`)

    waypoints.push({ x, y: CORRIDOR_Y })
    waypoints.push({ x, y: rackY(loc.rack, maxRack), pick: i })
    waypoints.push({ x, y: CORRIDOR_Y })
  })

  waypoints.push({ x: MAP_WIDTH - START_X, y: CORRIDOR_Y })
  return waypoints
}

export function routeDistance(waypoints: Waypoint[]): number {
  return segmentLengths(waypoints).reduce((sum, len) => sum + len, 0)
}

// Distance from the start to each waypoint. The first entry is always 0.
export function cumulativeDistances(waypoints: Waypoint[]): number[] {
  const cum = [0]
  for (const len of segmentLengths(waypoints)) cum.push(cum[cum.length - 1] + len)
  return cum
}

// The point reached after walking `distance` units along the route. Clamps to the ends.
export function pointAt(waypoints: Waypoint[], distance: number): { x: number; y: number } {
  let remaining = distance
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1]
    const b = waypoints[i]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    if (len > 0 && remaining <= len) {
      const t = remaining / len
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
    remaining -= len
  }
  const last = waypoints[waypoints.length - 1]
  return { x: last.x, y: last.y }
}

// The walked part of the route, ending at the picker's current position.
export function trailTo(waypoints: Waypoint[], distance: number): { x: number; y: number }[] {
  const cum = cumulativeDistances(waypoints)
  const passed = waypoints
    .filter((_, i) => cum[i] < distance)
    .map(({ x, y }) => ({ x, y }))
  return [...passed, pointAt(waypoints, distance)]
}

// The same pick lines, grouped by the order their SKUs were requested. Only for comparing with the sorted route.
// Lines are not re-allocated: each SKU keeps the walk order that buildPickList gave it.
export function inRequestOrder(lines: PickLine[], requests: PickRequest[]): PickLine[] {
  const rank = new Map<string, number>()
  for (const r of requests) if (!rank.has(r.sku)) rank.set(r.sku, rank.size)

  return [...lines]
    .sort((a, b) => (rank.get(a.sku) ?? 0) - (rank.get(b.sku) ?? 0) || a.sequence - b.sequence)
    .map((line, i) => ({ ...line, sequence: i + 1 }))
}

function segmentLengths(waypoints: Waypoint[]): number[] {
  return waypoints.slice(1).map((b, i) => Math.hypot(b.x - waypoints[i].x, b.y - waypoints[i].y))
}
