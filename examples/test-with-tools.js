import 'dotenv/config';
import { AgentVerifier } from '../src/index.js';

/**
 * Example with Tool Usage - Shows Non-Empty Logs
 *
 * This example asks the agent to USE TOOLS (create files, run commands)
 * So the logs array will contain actual tool call records
 */

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY required');
    process.exit(1);
  }

  // Test suite that REQUIRES tool usage
  const testSuite = [
    {
      id: 'test-create-file',
      prompt: `Create a file called "test.txt" with the content "Hello World".

Use the Write tool to create this file.`,
      idealOutput: 'test.txt file created with "Hello World"',
      scoringType: 'binary',
      scoringCriteria: 'File test.txt should be created with correct content'
    },
    {
      id: 'test-read-file',
      prompt: `Read the file "test.txt" that you just created and tell me what it contains.

Use the Read tool to read this file.`,
      idealOutput: 'Hello World',
      scoringType: 'binary',
      scoringCriteria: 'Should correctly read and report file contents'
    }
  ];

  console.log('Agent Verifier - Example With Tool Usage');
  console.log('='.repeat(60));
  console.log('This example will show NON-EMPTY logs\n');

  const verifier = new AgentVerifier({
    testSuite,
    anthropicApiKey: apiKey,
    model: 'claude-haiku-4-5',
    scorerConfig: {
      model: 'claude-haiku-4-5'
    },
    sdkOptions: {
      maxTurns: 10
    }
  });

  const result = await verifier.runAndProve();

  console.log('\n📊 Dual-Proof Results:');
  console.log('\nFull Dataset:');
  console.log('  Score:', result.score.toFixed(2));
  console.log('  Tests:', result.numTests);
  console.log('  Tool Calls:', result.executionSummary.totalToolCalls);

  console.log('\nPublic Subset:');
  console.log('  Score:', result.subset.score.toFixed(2));
  console.log('  Tests:', result.subset.numTests);

  // Show enhanced proof commitments
  if (result.zkProof.mainProof && result.zkProof.mainProof.commitments) {
    console.log('\n🔒 Enhanced Proof Commitments:');
    console.log('  Logs:', result.zkProof.mainProof.commitments.logsCommitment.substring(0, 20) + '...');
    console.log('  Library:', result.zkProof.mainProof.commitments.libraryVersion.substring(0, 20) + '...');
    console.log('  Scoring:', result.zkProof.mainProof.commitments.scoringMethod.substring(0, 20) + '...');

    console.log('\n📝 Logs Array:');
    const logs = result.executionSummary.totalToolCalls > 0
      ? 'NOT EMPTY - Check dual-proof-package.json to see tool calls!'
      : 'Empty (no tools used)';
    console.log('  Status:', logs);
  }

  console.log('\n🔍 Public Test Details:');
  for (const test of result.subset.publicData) {
    console.log(`  ${test.testId}: ${test.score ? 'PASS' : 'FAIL'}`);
  }

  console.log('\n✅ Check the dual-proof-package file to see:');
  console.log('   • Execution logs with Write and Read tool calls');
  console.log('   • Public test details (prompts, outputs, scores)');
  console.log('   • Full dataset proof (private tests remain hidden)\n');
}

main().catch(console.error);
