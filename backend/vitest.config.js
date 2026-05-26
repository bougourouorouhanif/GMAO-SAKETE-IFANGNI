import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['controllers/**', 'middleware/**', 'utils/**'],
      exclude: ['**/*.test.js', 'node_modules/**', 'prisma/**']
    }
  }
});
