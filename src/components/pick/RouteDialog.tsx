import { Dialog } from 'radix-ui'
import type { MapAisle } from '../../lib/routePath'
import type { PickLine } from '../../lib/picklist'
import { RouteWalk } from './RouteWalk'

type Props = {
  picks: PickLine[]
  aisles: MapAisle[]
}

// Opens the walk simulation over the pick list. Closing the dialog unmounts the walk, which cancels its animation.
export function RouteDialog({ picks, aisles }: Props) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="mt-3 text-base text-blue-700 underline"
        >
          Show the walk →
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed inset-x-3 top-4 bottom-4 mx-auto max-w-6xl overflow-y-auto rounded-lg bg-white p-4 font-sans shadow-xl md:p-6">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-xl font-bold">Pick route</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="h-10 w-10 rounded-md border border-gray-400 bg-white text-xl"
            >
              ×
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-gray-600">
            Simulation of the picker walking the pick list. Sorted by aisle.
          </Dialog.Description>

          <RouteWalk picks={picks} aisles={aisles} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
