import 'dotenv/config';
import { AgentVerifier } from '../src/index.js';

/**
 * Clean example - No file creation
 * Agent outputs code directly without creating files
 * This is the recommended approach for code generation benchmarks
 */

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY required');
    process.exit(1);
  }

  // Test suite that asks for CODE OUTPUT, not file creation
  const testSuite = [
    {
      id: 'test-add-function',
      prompt: `Write a JavaScript function called "add" that takes two numbers and returns their sum.

IMPORTANT: Output ONLY the function code. No explanations, no markdown, no additional text.
Just the function definition.`,
      idealOutput: 'function add(a, b) { return a + b; }',
      scoringType: 'numeric',
      scoringCriteria: 'The function should correctly add two numbers'
    },
    {
      id: 'test-reverse-function',
      prompt: `Write a JavaScript function called "reverse" that reverses a string.

IMPORTANT: Output ONLY the function code. No explanations, no markdown.`,
      idealOutput: 'function reverse(str) { return str.split("").reverse().join(""); }',
      scoringType: 'numeric',
      scoringCriteria: 'The function should correctly reverse a string'
    }
  ];

  console.log('Agent Verifier - Clean Example (No File Creation)');
  console.log('='.repeat(60));
  console.log(`Tests: ${testSuite.length}`);
  console.log('='.repeat(60) + '\n');

  const verifier = new AgentVerifier({
    testSuite,
    anthropicApiKey: apiKey,
    model: 'claude-haiku-4-5',
    scorerConfig: {
      model: 'claude-haiku-4-5'
    },
    sdkOptions: {
      maxTurns: 5,  // Fewer turns needed for simple code output
      systemPrompt: 'You are a code generator. Output only code, no explanations.'
    }
  });

  const result = await verifier.runAndProve();

  console.log('\n📊 Dual-Proof Results:');
  console.log('\nFull Dataset (All Tests):');
  console.log('  Score:', result.score.toFixed(2));
  console.log('  Tests:', result.numTests);
  console.log('  Merkle Root:', result.merkleRoot.substring(0, 20) + '...');

  console.log('\nPublic Subset (Transparent):');
  console.log('  Score:', result.subset.score.toFixed(2));
  console.log('  Tests:', result.subset.numTests, `(${((result.subset.numTests / result.numTests) * 100).toFixed(0)}%)`);
  console.log('  Merkle Root:', result.subset.merkleRoot.substring(0, 20) + '...');

  console.log('\n📈 Comparison:');
  console.log(`  Full Score: ${result.score.toFixed(2)}`);
  console.log(`  Public Score: ${result.subset.score.toFixed(2)}`);
  console.log(`  Difference: ${Math.abs(result.score - result.subset.score).toFixed(2)} points`);
  console.log('  Duration:', (result.executionSummary.totalDuration / 1000).toFixed(1) + 's');

  console.log('\n🔍 Public Test Details:');
  for (const test of result.subset.publicData) {
    console.log(`\n  ${test.testId}:`);
    console.log(`    Prompt: ${test.prompt.substring(0, 60)}...`);
    console.log(`    Agent Output: ${test.agentOutput.substring(0, 60)}...`);
    console.log(`    Score: ${test.score}/100`);
  }

  // Show enhanced proof commitments if available
  if (result.zkProof.mainProof && result.zkProof.mainProof.commitments) {
    console.log('\n🔒 Enhanced Proof Commitments:');
    console.log('  Logs:', result.zkProof.mainProof.commitments.logsCommitment.substring(0, 20) + '...');
    console.log('  Library:', result.zkProof.mainProof.commitments.libraryVersion.substring(0, 20) + '...');
    console.log('  Scoring:', result.zkProof.mainProof.commitments.scoringMethod.substring(0, 20) + '...');
    console.log('\n  ✅ These commitments prove:');
    console.log('     • AI actually executed (logs committed)');
    console.log('     • Specific library version used (v1.0.0)');
    console.log('     • Fair scoring criteria applied');
    console.log('     • Results cannot be fabricated or changed later');
  }

  console.log('\n📦 What was generated:');
  console.log('  • dual-proof-package-*.json (complete data)');
  console.log('  • shareable-dual-proof-*.json (public proof)');
  console.log('\n  The shareable proof includes:');
  console.log('    ✓ Public test details (prompts, outputs, scores)');
  console.log('    ✓ Full dataset score (proven via ZK)');
  console.log('    ✓ Cryptographic link between public and private tests');
}

main().catch(console.error);
