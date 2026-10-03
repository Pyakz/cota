import { defineConfig } from 'vitest/config'

// Unit tests cover pure functions in src/lib only, so no app plugins are loaded.
export default defineConfig({
  test: { include: ['src/lib/**/*.test.ts'] },
})
