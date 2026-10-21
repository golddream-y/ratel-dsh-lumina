import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The client-facing specs need a DOM; the node-facing ones do not. Each
    // spec picks its own environment with a `// @vitest-environment` pragma,
    // and this default keeps the node side free of a DOM.
    environment: 'node',
    include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
    globals: false,
  },
})
