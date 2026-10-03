import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    context: {} as any,

    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // Cross-fades between pages where the browser supports the View Transitions API.
    defaultViewTransition: true,
    // Skeletons appear only if a load takes longer than 200 ms, and then stay for at least 300 ms,
    // so fast loads don't flash a placeholder.
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
