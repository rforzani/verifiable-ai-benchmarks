import 'dotenv/config';
import { ResearchVerifier, OpenAIProvider, DeterministicScorer } from '../src/index.js';

/**
 * Deterministic Scoring Example
 *
 * Demonstrates using deterministic (rule-based) scoring instead of AI.
 * This approach is:
 * - Faster (no API calls)
 * - Cheaper (no API costs)
 * - Deterministic (same inputs = same scores)
 * - Offline (no internet required for scoring)
 *
 * Use cases:
 * - Exact string matching tasks
 * - Code generation with known outputs
 * - Mathematical calculations
 * - Any task with objectively verifiable outputs
 */

async function main() {
  console.log('Research Library - Deterministic Scoring Example');
  console.log('='.repeat(60));
  console.log();

  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  // Test suite with objectively verifiable outputs
  const testSuite = [
    {
      id: 'math-1',
      prompt: 'What is 2 + 2?',
      idealOutput: '4',
      scoringType: 'binary'
    },
    {
      id: 'math-2',
      prompt: 'What is the square root of 16?',
      idealOutput: '4',
      scoringType: 'binary'
    },
    {
      id: 'code-1',
      prompt: 'Write the JavaScript code to log "Hello World"',
      idealOutput: 'console.log("Hello World")',
      scoringType: 'numeric'
    }
  ];

  // Agent provider (OpenAI)
  const agentProvider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-5-nano',
    temperature: 0 // Deterministic agent execution
  });

  // Deterministic scorer (no AI, rule-based)
  const scorerProvider = new DeterministicScorer({
    method: 'jaccard', // Word-based similarity
    caseSensitive: false,
    ignoreWhitespace: true,
    binaryThreshold: 0.8 // 80% similarity for PASS
  });

  console.log('Configuration:');
  console.log(`  Agent: ${agentProvider.getName()}`);
  console.log(`  Scorer: ${scorerProvider.getName()}`);
  console.log(`  Scoring Method: ${scorerProvider.config.method}`);
  console.log(`  Binary Threshold: ${scorerProvider.config.binaryThreshold}`);
  console.log();

  // Create verifier
  const verifier = new ResearchVerifier({
    testSuite,
    agentProvider,
    scorerProvider,
    outputDir: './output'
  });

  // Run verification
  console.log('Starting verification with deterministic scoring...\n');
  const result = await verifier.runAndProve();

  // Display results
  console.log('\n' + '='.repeat(60));
  console.log('RESULTS (with deterministic scoring)');
  console.log('='.repeat(60));
  console.log();
  console.log(`📊 Full Dataset Score: ${result.full.score.toFixed(2)}`);
  console.log(`🔍 Public Subset Score: ${result.subset.score.toFixed(2)}`);
  console.log();
  console.log(`⚡ Benefits of deterministic scoring:`);
  console.log(`   - No API costs for scoring`);
  console.log(`   - Instant scoring (< 1ms per test)`);
  console.log(`   - 100% reproducible`);
  console.log(`   - Works offline`);
  console.log();

  // Check for placeholder proofs
  if (result.zkProof.isPlaceholder) {
    console.log('⚠️  WARNING: Placeholder proofs detected!');
    console.log('   Circuits not compiled - proofs are for testing only');
    console.log('   ❌ Cannot register agents with placeholder proofs');
    console.log('   ℹ️  Compile circuits first for production use');
    console.log();
  }

  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
