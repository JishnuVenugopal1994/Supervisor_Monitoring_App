import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  moduleNameMapper: {
    '^../lib/prisma$': '<rootDir>/src/__mocks__/prisma.ts',
    '^../../lib/prisma$': '<rootDir>/src/__mocks__/prisma.ts',
  },
  clearMocks: true,
};

export default config;
