import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // El servidor es CommonJS y Vitest no se deja importar con require():
    // describe, it, expect y vi llegan como globales.
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.js'],
    include: ['test/**/*.test.js'],
    // Los handlers loguean cada evento; en los tests es ruido.
    // TEST_LOGS=1 npm test para verlos al depurar.
    silent: !process.env.TEST_LOGS,
  },
})
