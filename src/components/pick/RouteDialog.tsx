import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import type { MapAisle } from '../../lib/routePath'
import type { PickLine } from '../../lib/picklist'
import { RouteWalk } from './RouteWalk'

type Props = {
  picks: PickLine[]
  aisles: MapAisle[]
}

// Opens the walk simulation over the pick list. On a phone it is a full-screen sheet; on wider screens a centred panel.
// Closing the dialog unmounts the walk, which cancels its animation.
export function RouteDialog({ picks, aisles }: Props) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-emerald-600 text-base font-semibold text-white shadow-sm active:scale-[0.98]"
        >
          Show the walk
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-slate-50 font-sans data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom md:inset-x-auto md:top-1/2 md:left-1/2 md:h-auto md:max-h-[90vh] md:w-[min(72rem,calc(100%-2rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:shadow-xl">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 backdrop-blur-md md:rounded-t-2xl">
            <Dialog.Title className="text-lg font-bold text-slate-900">Pick route</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="-mr-2 flex size-11 items-center justify-center rounded-full text-slate-700 active:bg-slate-100"
            >
              <X className="size-6" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            <Dialog.Description className="text-sm text-slate-600">
              Simulation of the picker walking the pick list. Sorted by aisle.
            </Dialog.Description>

            <RouteWalk picks={picks} aisles={aisles} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
