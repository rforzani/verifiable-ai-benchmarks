import 'dotenv/config';
import { AgentVerifier } from '../src/index.js';

/**
 * Advanced example - Custom executor with multi-step workflows
 * Demonstrates:
 * - Multiple agent calls in sequence
 * - Conditional routing
 * - Custom validation logic
 * - Full control over execution flow
 */

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }

  // Define test suite
  const testSuite = [
   {
      id: 'test-complex-task',
      prompt: 'Build a simple TODO list manager with add, remove, and list functions',
      idealOutput: 'A complete TODO manager implementation',
      scoringType: 'numeric',
      scoringCriteria: 'Code completeness, correctness, and quality',
      // Custom metadata for routing
      metadata: {
        requiresValidation: true,
        complexity: 'high'
      }
    },
    {
      id: 'test-simple-task',
      prompt: 'Write a function to calculate factorial',
      idealOutput: 'function factorial(n) { ... }',
      scoringType: 'binary',
      metadata: {
        requiresValidation: false,
        complexity: 'low'
      }
    }
  ];

  console.log('Agent Verifier - Custom Workflow Example');
  console.log('='.repeat(60));
  console.log('Demonstrating multi-step agent execution\n');

  // Define custom executor function
  const customExecutor = async (test, context) => {
    console.log(`\n  → Custom executor for ${test.id}`);
    console.log(`    Complexity: ${test.metadata?.complexity}`);

    // Step 1: Initial agent call to generate solution
    console.log('    [Step 1] Generating solution...');
    const initialSolution = await context.runClaudeAgent(
      test.prompt,
      {
        systemPrompt: 'You are a expert programmer. Provide clean, well-documented code.'
      }
    );

    // Log this custom step
    context.logToolCall({
      toolName: 'InitialGeneration',
      toolInput: { prompt: test.prompt },
      toolOutput: { solution: initialSolution.substring(0, 100) + '...' }
    });

    // Step 2: If high complexity, add validation step
    if (test.metadata?.complexity === 'high') {
      console.log('    [Step 2] Running validation agent...');

      const validationPrompt = `Review this code and suggest improvements:\n\n${initialSolution}`;

      const validationResult = await context.runClaudeAgent(
        validationPrompt,
        {
          systemPrompt: 'You are a code reviewer. Provide constructive feedback.',
          maxTurns: 5
        }
      );

      context.logToolCall({
        toolName: 'CodeValidation',
        toolInput: { code: 'initial solution' },
        toolOutput: { feedback: validationResult.substring(0, 100) + '...' }
      });

      // Step 3: Refinement based on validation
      console.log('    [Step 3] Refining based on feedback...');

      const refinementPrompt = `
      Original code:
      ${initialSolution}

      Feedback:
      ${validationResult}

      Please provide an improved version addressing the feedback.
      `;

      const finalSolution = await context.runClaudeAgent(
        refinementPrompt,
        {
          maxTurns: 5
        }
      );

      context.logToolCall({
        toolName: 'Refinement',
        toolInput: { feedback: 'validation feedback' },
        toolOutput: { refined: finalSolution.substring(0, 100) + '...' }
      });

      console.log('    ✓ Multi-step workflow complete');

      // Extract just the code from the final solution
      // The agent often includes explanations, so we need to extract code blocks
      return extractCode(finalSolution);

    } else {
      // Simple task - just return initial solution
      console.log('    ✓ Single-step workflow complete');

      const extracted = extractCode(initialSolution);
      console.log('    📤 Agent raw output:', initialSolution.substring(0, 150) + '...');
      console.log('    📤 Extracted code:', extracted.substring(0, 150) + '...');

      return extracted;
    }
  };

  // Helper function to extract code from agent output
  function extractCode(output) {
    // Try to extract code from markdown code blocks
    const codeBlockMatch = output.match(/```(?:javascript|js)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // If no code block, try to find function definitions
    const functionMatch = output.match(/(function\s+\w+[\s\S]*?\n}|const\s+\w+\s*=[\s\S]*?;)/);
    if (functionMatch) {
      return functionMatch[0].trim();
    }

    // Otherwise return as-is (might be plain code)
    return output.trim();
  }

  // Create verifier with custom executor
  const verifier = new AgentVerifier({
    testSuite,
    anthropicApiKey: apiKey,
    model: 'claude-haiku-4-5',
    scorerConfig: {
      model: 'claude-haiku-4-5'
    },
    sdkOptions: {
      maxTurns: 15,
      permissionMode: 'acceptEdits'
    },
    // Provide custom executor function
    customExecutor
  });

  // Run verification
  const result = await verifier.runAndProve();

  // Display results
  console.log('\n' + '='.repeat(60));
  console.log('📊 DUAL-PROOF RESULTS:');
  console.log('\nFull Dataset:');
  console.log('  Score:', result.score.toFixed(2));
  console.log('  Tests:', result.numTests);
  console.log('  Merkle Root:', result.merkleRoot.substring(0, 20) + '...');
  console.log('  Total Tool Calls:', result.executionSummary.totalToolCalls);

  console.log('\nPublic Subset:');
  console.log('  Score:', result.subset.score.toFixed(2));
  console.log('  Tests:', result.subset.numTests, `(${((result.subset.numTests / result.numTests) * 100).toFixed(0)}%)`);
  console.log('  Merkle Root:', result.subset.merkleRoot.substring(0, 20) + '...');

  console.log('\n📝 Per-Test Breakdown:');
  for (const testResult of result.executionSummary.testResults) {
    console.log(`\n  ${testResult.testId}:`);
    console.log(`    Score: ${testResult.scoringType === 'binary' ? (testResult.score ? 'PASS' : 'FAIL') : testResult.score + '/100'}`);
    console.log(`    Tool Calls: ${testResult.toolCalls}`);
    console.log(`    Duration: ${(testResult.duration / 1000).toFixed(1)}s`);
  }

  // Show enhanced proof commitments
  if (result.zkProof.mainProof && result.zkProof.mainProof.commitments) {
    console.log('\n🔒 Enhanced Proof Commitments:');
    console.log('  Logs:', result.zkProof.mainProof.commitments.logsCommitment.substring(0, 20) + '...');
    console.log('  Library:', result.zkProof.mainProof.commitments.libraryVersion.substring(0, 20) + '...');
    console.log('  Scoring:', result.zkProof.mainProof.commitments.scoringMethod.substring(0, 20) + '...');
    console.log('\n  ✅ Proof guarantees:');
    console.log('     • AI executed multi-step workflow (logs committed)');
    console.log('     • Library version verified (v1.0.0)');
    console.log('     • Custom scoring criteria locked in');
    console.log('     • Cannot fabricate or alter results retroactively');
    console.log('     • Public subset cryptographically linked to full dataset');
  }

  console.log('\n📦 Generated Files:');
  console.log('  • dual-proof-package-*.json (complete data)');
  console.log('  • shareable-dual-proof-*.json (public proof)');

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
