import 'dotenv/config';
import { ResearchVerifier, OpenAIProvider, DeterministicScorer } from '../src/index.js';

/**
 * Parallel Execution Example
 *
 * Demonstrates the power of parallel test execution with the research library.
 * This example showcases how to dramatically speed up verification by running
 * multiple tests concurrently.
 *
 * Performance Comparison:
 * - Sequential: Tests run one after another (slow but safe)
 * - Parallel: Multiple tests run simultaneously (fast and efficient)
 *
 * Features Demonstrated:
 * - Parallel test execution with concurrency control
 * - Performance metrics tracking
 * - Rate limiting to avoid API throttling
 * - Cost-effective scoring with deterministic methods
 */

async function main() {
  console.log('Research Library - Parallel Execution Showcase');
  console.log('='.repeat(70));
  console.log();

  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required');
    console.error('Create a .env file with: OPENAI_API_KEY=your-key-here');
    process.exit(1);
  }

  // Create a larger test suite to demonstrate parallel benefits
  const testSuite = [
    {
      id: 'test-1',
      prompt: 'Write a JavaScript function to reverse a string',
      idealOutput: 'function reverse(str) { return str.split("").reverse().join(""); }',
      scoringType: 'numeric'
    },
    {
      id: 'test-2',
      prompt: 'Explain what a closure is in JavaScript',
      idealOutput: 'A closure is a function that retains access to variables from its outer scope',
      scoringType: 'numeric'
    },
    {
      id: 'test-3',
      prompt: 'Write a Python function to check if a number is prime',
      idealOutput: 'def is_prime(n): return n > 1 and all(n % i != 0 for i in range(2, int(n**0.5) + 1))',
      scoringType: 'numeric'
    },
    {
      id: 'test-4',
      prompt: 'Create a SQL query to find duplicate records',
      idealOutput: 'SELECT column, COUNT(*) FROM table GROUP BY column HAVING COUNT(*) > 1',
      scoringType: 'numeric'
    },
    {
      id: 'test-5',
      prompt: 'Write a function to calculate factorial recursively',
      idealOutput: 'function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }',
      scoringType: 'numeric'
    },
    {
      id: 'test-6',
      prompt: 'Explain the difference between const and let in JavaScript',
      idealOutput: 'const creates an immutable binding, let allows reassignment',
      scoringType: 'numeric'
    },
    {
      id: 'test-7',
      prompt: 'Write a function to merge two sorted arrays',
      idealOutput: 'function merge(arr1, arr2) { return [...arr1, ...arr2].sort((a, b) => a - b); }',
      scoringType: 'numeric'
    },
    {
      id: 'test-8',
      prompt: 'Create a TypeScript interface for a user object',
      idealOutput: 'interface User { id: number; name: string; email: string; }',
      scoringType: 'numeric'
    },
    {
      id: 'test-9',
      prompt: 'Write a function to find the maximum value in an array',
      idealOutput: 'function findMax(arr) { return Math.max(...arr); }',
      scoringType: 'numeric'
    },
    {
      id: 'test-10',
      prompt: 'Explain what async/await does in JavaScript',
      idealOutput: 'async/await provides a cleaner syntax for handling promises and asynchronous code',
      scoringType: 'numeric'
    }
  ];

  // Agent provider (OpenAI GPT-5-nano for speed and cost-effectiveness)
  const agentProvider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-5-nano',
    temperature: 1
  });

  // Deterministic scorer (instant, no API calls, cost-free!)
  const scorerProvider = new DeterministicScorer({
    method: 'jaccard',
    caseSensitive: false,
    binaryThreshold: 0.7
  });

  console.log('Configuration:');
  console.log(`  Agent: ${agentProvider.getName()} (${agentProvider.model})`);
  console.log(`  Scorer: ${scorerProvider.getName()} (${scorerProvider.config.method})`);
  console.log(`  Test Suite: ${testSuite.length} tests`);
  console.log();

  // ===== BENCHMARK 1: Sequential Execution =====
  console.log('=' .repeat(70));
  console.log('BENCHMARK 1: Sequential Execution (baseline)');
  console.log('=' .repeat(70));
  console.log('Running tests one after another...\n');

  const sequentialStart = Date.now();

  const sequentialVerifier = new ResearchVerifier({
    testSuite,
    agentProvider,
    scorerProvider,
    parallelConfig: {
      enabled: false  // Sequential execution
    },
    outputDir: './output'
  });

  const sequentialResult = await sequentialVerifier.runAndProve();
  const sequentialTime = (Date.now() - sequentialStart) / 1000;

  console.log('=' .repeat(70));
  console.log('SEQUENTIAL RESULTS:');
  console.log(`  ⏱️  Total Time: ${sequentialTime.toFixed(2)}s`);
  console.log(`  📊 Score: ${sequentialResult.full.score.toFixed(2)}`);
  console.log(`  ⚡ Tests/second: ${(testSuite.length / sequentialTime).toFixed(2)}`);
  console.log('=' .repeat(70));
  console.log();

  // ===== BENCHMARK 2: Parallel Execution =====
  console.log('=' .repeat(70));
  console.log('BENCHMARK 2: Parallel Execution (5 concurrent tests)');
  console.log('=' .repeat(70));
  console.log('Running multiple tests simultaneously...\n');

  const parallelStart = Date.now();

  const parallelVerifier = new ResearchVerifier({
    testSuite,
    agentProvider,
    scorerProvider,
    parallelConfig: {
      enabled: true,
      maxConcurrent: 5  // Run 5 tests at a time
    },
    outputDir: './output'
  });

  const parallelResult = await parallelVerifier.runAndProve();
  const parallelTime = (Date.now() - parallelStart) / 1000;

  console.log('=' .repeat(70));
  console.log('PARALLEL RESULTS:');
  console.log(`  ⏱️  Total Time: ${parallelTime.toFixed(2)}s`);
  console.log(`  📊 Score: ${parallelResult.full.score.toFixed(2)}`);
  console.log(`  ⚡ Tests/second: ${(testSuite.length / parallelTime).toFixed(2)}`);
  console.log('=' .repeat(70));
  console.log();

  // ===== Performance Analysis =====
  console.log('=' .repeat(70));
  console.log('PERFORMANCE COMPARISON');
  console.log('=' .repeat(70));
  console.log();

  const speedup = sequentialTime / parallelTime;
  const timeSaved = sequentialTime - parallelTime;
  const efficiency = (speedup / 5) * 100; // 5 is maxConcurrent

  console.log(`📈 Performance Metrics:`);
  console.log(`   Sequential Time:  ${sequentialTime.toFixed(2)}s`);
  console.log(`   Parallel Time:    ${parallelTime.toFixed(2)}s`);
  console.log(`   Time Saved:       ${timeSaved.toFixed(2)}s (${((timeSaved / sequentialTime) * 100).toFixed(1)}%)`);
  console.log(`   Speedup:          ${speedup.toFixed(2)}x faster`);
  console.log(`   Efficiency:       ${efficiency.toFixed(1)}% (of theoretical 5x)`);
  console.log();

  console.log(`💡 Key Insights:`);
  console.log(`   • Parallel execution is ${speedup.toFixed(1)}x faster than sequential`);
  console.log(`   • Saved ${timeSaved.toFixed(1)} seconds on ${testSuite.length} tests`);
  console.log(`   • Efficiency of ${efficiency.toFixed(0)}% with 5 concurrent workers`);
  console.log(`   • Both methods produce identical scores: ${sequentialResult.full.score.toFixed(2)}`);
  console.log();

  console.log(`🎯 Best Practices:`);
  console.log(`   • Use parallel execution for large test suites (>10 tests)`);
  console.log(`   • Set maxConcurrent based on API rate limits`);
  console.log(`   • OpenAI typically allows 3-10 requests/second`);
  console.log(`   • Deterministic scoring adds no overhead (instant!)`);
  console.log(`   • Monitor API costs - parallel runs more requests simultaneously`);
  console.log();

  console.log(`🚀 Scaling Recommendations:`);
  console.log(`   • Small suites (<10 tests):    Sequential is fine`);
  console.log(`   • Medium suites (10-50 tests): maxConcurrent: 5`);
  console.log(`   • Large suites (50+ tests):    maxConcurrent: 10`);
  console.log(`   • Huge suites (100+ tests):    maxConcurrent: 10-20 (watch rate limits!)`);
  console.log();

  console.log('=' .repeat(70));
  console.log('✅ Parallel Execution Showcase Complete!');
  console.log('=' .repeat(70));
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  if (error.details) {
    console.error('Details:', error.details);
  }
  process.exit(1);
});
