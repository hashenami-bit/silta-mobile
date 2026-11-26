import { defineConfig } from 'vitest/config'

// Unit tests cover pure logic and the storage layer only (no browser needed).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
