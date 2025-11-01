import 'dotenv/config';
import { ResearchVerifier, AnthropicProvider, AIScorer } from '../src/index.js';

/**
 * Anthropic Example
 *
 * Demonstrates using the research library with Anthropic's Claude models.
 * This example maintains full backward compatibility with the original
 * verifier-library while using the new provider-agnostic architecture.
 *
 * Features:
 * - Claude Agent SDK for tool-enabled execution
 * - AI-based scoring with Claude
 * - Dual ZK-SNARK proof generation
 */

async function main() {
  console.log('Research Library - Anthropic Claude Example');
  console.log('='.repeat(60));
  console.log();

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required');
    console.error('Create a .env file with: ANTHROPIC_API_KEY=your-key-here');
    process.exit(1);
  }

  // Define test suite
  const testSuite = [
    {
      id: 'code-gen-1',
      prompt: 'Create a TypeScript interface for a user with name, email, and age',
      idealOutput: 'interface User { name: string; email: string; age: number; }',
      scoringType: 'binary'
    },
    {
      id: 'code-gen-2',
      prompt: 'Write a function to check if a number is prime',
      idealOutput: 'function isPrime(n) { if (n <= 1) return false; for (let i = 2; i * i <= n; i++) { if (n % i === 0) return false; } return true; }',
      scoringType: 'numeric',
      scoringCriteria: 'Function should correctly identify prime numbers'
    },
    {
      id: 'explanation-1',
      prompt: 'Explain the difference between let and const in JavaScript',
      idealOutput: 'let allows reassignment, const does not',
      scoringType: 'numeric',
      scoringCriteria: 'Explanation should be clear and accurate'
    }
  ];

  // Create agent provider (Anthropic Claude)
  const agentProvider = new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-haiku-4-5',
    sdkOptions: {
      maxTurns: 10
    }
  });

  // Create scorer provider (Anthropic for scoring)
  const scorerProvider = new AIScorer({
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-haiku-4-5',
    temperature: 0
  });

  // Create verifier
  const verifier = new ResearchVerifier({
    testSuite,
    agentProvider,
    scorerProvider,
    outputDir: './output'
  });

  // Run verification
  console.log('Starting verification...\n');
  const result = await verifier.runAndProve();

  // Display results
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION RESULTS');
  console.log('='.repeat(60));
  console.log();
  console.log(`📊 Full Dataset Score: ${result.full.score.toFixed(2)}`);
  console.log(`🔍 Public Subset Score: ${result.subset.score.toFixed(2)}`);
  console.log(`⏱️  Execution Time: ${(result.full.executionTime / 1000).toFixed(2)}s`);
  console.log();
  console.log(`✅ Verification complete!`);
  console.log(`📦 Proof package saved`);
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
