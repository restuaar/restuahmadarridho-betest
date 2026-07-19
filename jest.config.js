module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  clearMocks: true,
  // bcrypt (CPU-bound) can exceed the 5s default when the whole suite runs with
  // coverage + several in-memory MongoDB instances competing for CPU.
  testTimeout: 30000,
  // mongodb-memory-server's mongod child process can linger after teardown and
  // leave the Jest worker hanging; force a clean exit once all tests resolve.
  forceExit: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/seed.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: { statements: 95, branches: 90, functions: 95, lines: 95 },
  },
};
