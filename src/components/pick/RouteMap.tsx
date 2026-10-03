import {
  aisleLaneX,
  CORRIDOR_Y,
  MAP_HEIGHT,
  MAP_WIDTH,
  pointAt,
  RACK_BOTTOM,
  RACK_TOP,
  trailTo,
  type MapAisle,
  type Waypoint,
} from '../../lib/routePath'

type Props = {
  aisles: MapAisle[]
  // Aisles that have at least one pick line.
  pickedAisles: Set<number>
  waypoints: Waypoint[]
  distance: number
  // Number of stops reached so far, in route order.
  reached: number
}

// Top-down map. Racks are thin bars with a lane between them; the picker walks down the lane.
export function RouteMap({ aisles, pickedAisles, waypoints, distance, reached }: Props) {
  const laneX = aisleLaneX(aisles)
  // Stops are already in route order, so the index in this list is the stop number minus one.
  const stops = waypoints.filter((w): w is Waypoint & { pick: number } => w.pick !== undefined)
  const picker = pointAt(waypoints, distance)
  const trail = trailTo(waypoints, distance).map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      role="img"
      aria-label="Warehouse map with the pick route"
      className="w-full rounded-lg border border-gray-300 bg-white"
    >
      <rect x={0} y={CORRIDOR_Y - 7} width={MAP_WIDTH} height={14} className="fill-gray-100" />

      {aisles.map((a) => {
        const x = laneX.get(a.aisle) ?? 0
        const picked = pickedAisles.has(a.aisle)
        return (
          <g key={a.aisle}>
            {picked && (
              <rect x={x - 9} y={RACK_TOP} width={18} height={RACK_BOTTOM - RACK_TOP} rx={3} className="fill-blue-50" />
            )}
            <rect x={x - 9} y={RACK_TOP} width={5} height={RACK_BOTTOM - RACK_TOP} className={picked ? 'fill-blue-600' : 'fill-gray-400'} />
            <rect x={x + 4} y={RACK_TOP} width={5} height={RACK_BOTTOM - RACK_TOP} className={picked ? 'fill-blue-600' : 'fill-gray-400'} />
            <text x={x} y={RACK_TOP - 10} textAnchor="middle" className={`font-mono text-[11px] ${picked ? 'fill-blue-800 font-bold' : 'fill-gray-500'}`}>
              A{a.aisle}
            </text>
          </g>
        )
      })}

      <text x={16} y={MAP_HEIGHT - 6} className="fill-gray-600 text-[10px]">Start</text>
      <text x={MAP_WIDTH - 16} y={MAP_HEIGHT - 6} textAnchor="end" className="fill-gray-600 text-[10px]">Pack</text>

      <polyline points={trail} fill="none" strokeWidth={2} strokeDasharray="3 3" className="stroke-blue-400" opacity={0.6} />

      {stops.map((stop, i) => (
        <g key={stop.pick}>
          <circle
            cx={stop.x}
            cy={stop.y}
            r={8}
            strokeWidth={1.5}
            className={i < reached ? 'fill-gray-900 stroke-gray-900' : 'fill-white stroke-gray-700'}
          />
          <text
            x={stop.x}
            y={stop.y + 3.5}
            textAnchor="middle"
            className={`text-[10px] font-bold tabular-nums ${i < reached ? 'fill-white' : 'fill-gray-900'}`}
          >
            {i + 1}
          </text>
        </g>
      ))}

      <circle cx={picker.x} cy={picker.y} r={5} className="fill-amber-400 stroke-gray-900" strokeWidth={1.5} />
    </svg>
  )
}
