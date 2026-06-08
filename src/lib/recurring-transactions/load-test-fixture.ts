/**
 * Helper to load test fixture from exported JSON file
 * 
 * Usage:
 * 1. Save your exported JSON file as test-fixture-data.json in this directory
 * 2. Uncomment the import below
 * 3. Use testFixture in your tests
 */

import type { TestFixture } from './test-fixtures';

// Uncomment and update path after saving your exported JSON:
// import fixtureData from './test-fixture-data.json';
// export const testFixture = fixtureData as TestFixture;

// Placeholder until you load the data
export const testFixture: TestFixture = {
  metadata: {
    exportedAt: '',
    transactionCount: 0,
    merchantCount: 0,
    analysisCount: 0,
  },
  transactions: [],
  analysis: [],
  merchantSummaries: [],
};
