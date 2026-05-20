import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/integration/db/**/*.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage/integration',
      // Integration coverage is scoped to the real PostgreSQL repository
      // implementations exercised through Testcontainers.
      include: ['src/server/repositories/postgres-*.ts'],
      exclude: [
        'src/server/repositories/admin-report-repository.ts',
        'src/server/repositories/analysis-repository.ts',
        'src/server/repositories/health-repository.ts',
        'src/server/repositories/keyword-repository.ts',
        'src/server/repositories/overlay-repository.ts',
        'src/server/repositories/stock-price-repository.ts',
        'src/server/repositories/stock-search-repository.ts',
        'src/server/repositories/supabase-*.ts',
      ],
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
