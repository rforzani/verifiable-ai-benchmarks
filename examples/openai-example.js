import 'dotenv/config';
import { ResearchVerifier, OpenAIProvider, AIScorer } from '../src/index.js';

/**
 * OpenAI Example
 *
 * Demonstrates using the research library with OpenAI's GPT models
 * for both agent execution and scoring.
 *
 * Features:
 * - OpenAI GPT-4 for agent execution
 * - OpenAI GPT-4 for AI-based scoring
 * - Dual ZK-SNARK proof generation
 * - Verifiable results
 */

async function main() {
  console.log('Research Library - OpenAI Example');
  console.log('='.repeat(60));
  console.log();

  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required');
    console.error('Create a .env file with: OPENAI_API_KEY=your-key-here');
    process.exit(1);
  }

  // Define test suite
  const testSuite = [
    {
      id: 'test-1',
      prompt: 'Write a function that reverses a string in JavaScript',
      idealOutput: 'function reverse(str) { return str.split("").reverse().join(""); }',
      scoringType: 'binary',
      scoringCriteria: 'Function should correctly reverse the input string'
    },
    {
      id: 'test-2',
      prompt: 'Explain what recursion is in programming',
      idealOutput: 'Recursion is when a function calls itself',
      scoringType: 'numeric',
      scoringCriteria: 'Explanation should be clear and accurate'
    },
    {
      id: 'test-3',
      prompt: 'Write a Python function to calculate factorial',
      idealOutput: 'def factorial(n): return 1 if n <= 1 else n * factorial(n-1)',
      scoringType: 'binary'
    }
  ];

  // Create agent provider (OpenAI GPT-4)
  const agentProvider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-5-nano',
    systemPrompt: 'You are a helpful programming assistant. Provide concise, accurate code and explanations.',
    temperature: 1
  });

  // Create scorer provider (OpenAI for AI-based scoring)
  const scorerProvider = new AIScorer({
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-5-nano',
    temperature: 1
  });

  // Create verifier
  const verifier = new ResearchVerifier({
    testSuite,
    agentProvider,
    scorerProvider,
    outputDir: './/output'
  });

  // Run verification with ZK proofs
  console.log('Starting verification...\n');
  const result = await verifier.runAndProve();

  // Display results
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION RESULTS');
  console.log('='.repeat(60));
  console.log();
  console.log(`📊 Full Dataset:`);
  console.log(`   Score: ${result.full.score.toFixed(2)}`);
  console.log(`   Tests: ${result.full.numTests}`);
  console.log(`   Merkle Root: ${result.full.merkleRoot.substring(0, 16)}...`);
  console.log();
  console.log(`🔍 Public Subset (${result.metadata.publicPercentage}% transparent):`);
  console.log(`   Score: ${result.subset.score.toFixed(2)}`);
  console.log(`   Tests: ${result.subset.numTests}`);
  console.log();
  console.log(`✅ Zero-Knowledge Proofs: Generated`);
  console.log(`   Main Proof: ✓`);
  console.log(`   Subset Proof: ✓`);
  console.log();
  console.log(`🤖 Providers:`);
  console.log(`   Agent: ${result.providers.agent.name}`);
  console.log(`   Scorer: ${result.providers.scorer.name} (${result.providers.scorer.type})`);
  console.log();

  // Display public test results
  console.log(`📋 Public Test Results (Transparent):`);
  console.log();
  result.subset.publicData.forEach((test, i) => {
    console.log(`   Test ${i + 1}: ${test.testId}`);
    console.log(`   Prompt: ${test.prompt.substring(0, 60)}...`);
    console.log(`   Score: ${test.scoringType === 'binary' ? (test.score ? 'PASS' : 'FAIL') : test.score}`);
    console.log(`   Success: ${test.success ? '✓' : '✗'}`);
    console.log();
  });

  // Check for placeholder proofs
  if (result.zkProof.isPlaceholder) {
    console.log('⚠️  WARNING: Placeholder proofs detected!');
    console.log('   Circuits not compiled - proofs are for testing only');
    console.log('   ❌ Cannot register agents with placeholder proofs');
    console.log('   ℹ️  Compile circuits first for production use');
    console.log();
  }

  console.log('='.repeat(60));
  console.log('✅ Verification complete!');
  console.log(`📦 Proof package saved to: ./examples/output/`);
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  if (error.details) {
    console.error('Details:', error.details);
  }
  process.exit(1);
});
