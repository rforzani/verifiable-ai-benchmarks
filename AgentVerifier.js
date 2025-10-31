import { MerkleTree } from './merkle/MerkleTree.js';
import { TestSelector } from './selection/TestSelector.js';
import { AgentExecutor } from './agent/AgentExecutor.js';
import { ScorerAI } from './scoring/ScorerAI.js';
import { ProofGenerator } from './zk/ProofGenerator.js';
import { Verifier } from './zk/Verifier.js';
import { validateTestSuite, normalizeTestCase } from './utils/testSuiteValidator.js';
import fs from 'fs';
import path from 'path';

/**
 * Agent Verifier
 * Main orchestrator class for verifiable AI agent execution with zero-knowledge proofs
 *
 * Workflow:
 * 1. Generate Merkle tree from test suite
 * 2. Execute agent on each test with logging
 * 3. Score agent outputs using AI
 * 4. Generate ZK proof of execution
 * 5. Return verifiable results
 */
export class AgentVerifier {
  constructor(config) {
    // Validate required config
    if (!config.testSuite) {
      throw new Error('testSuite is required');
    }

    if (!config.anthropicApiKey) {
      throw new Error('anthropicApiKey is required');
    }

    // Validate and normalize test suite
    validateTestSuite(config.testSuite);
    this.testSuite = config.testSuite.map(normalizeTestCase);

    // Store configuration
    this.anthropicApiKey = config.anthropicApiKey;
    this.model = config.model || 'claude-haiku-4-5';
    this.config = config;

    // Initialize subsystems
    this.merkleTree = new MerkleTree(this.testSuite);
    this.agentExecutor = new AgentExecutor({
      anthropicApiKey: this.anthropicApiKey,
      model: this.model,
      // Pass through full SDK options (mcpServers, agents, systemPrompt, etc.)
      sdkOptions: config.sdkOptions || {},
      // Support custom executor function for complex workflows
      customExecutor: config.customExecutor || null,
      // Test isolation (default: true, creates subdirectory per test)
      isolateTests: config.isolateTests !== false
    });

    this.scorer = new ScorerAI({
      anthropicApiKey: this.anthropicApiKey,
      ...config.scorerConfig
    });

    // Initialize ZK proof generator (enhanced proofs are the only method)
    // Enhanced proofs include commitments to: logs, library version, scoring method
    // This prevents fabricated results and ensures accountability
    this.proofGenerator = new ProofGenerator({
      ...config.zkConfig,
      libraryVersion: '0.1.0'
    });

    // Results storage
    this.merkleRoot = null;
    this.testResults = [];
    this.executionStartTime = null;
    this.executionEndTime = null;
  }

  /**
   * Run agent on all tests and generate dual proofs (main + subset)
   * This is the new dual-proof system with partial transparency
   * @returns {Promise<object>} Verification result with dual proofs
   */
  async runAndProve() {
    console.log(`\nAgent Verifier (Dual-Proof): Starting execution on ${this.testSuite.length} tests...\n`);

    this.executionStartTime = Date.now();

    try {
      // Step 1: Select public subset (5%, min 1)
      console.log('[1/6] Selecting public subset (5%, deterministic)...');
      const selector = new TestSelector(this.testSuite);
      const selection = selector.select();
      console.log(`✓ Selected ${selection.publicCount} public tests (${selection.publicPercentage}%)\n`);

      // Step 2: Generate dual Merkle trees (full + subset)
      console.log('[2/6] Generating dual Merkle trees...');
      const dualRoots = this.merkleTree.generateDualRoots(selection.publicIndices);
      this.merkleRoot = dualRoots.fullRoot;
      this.subsetMerkleRoot = dualRoots.subsetRoot;
      console.log(`✓ Full Merkle root: ${this.merkleRoot}`);
      console.log(`✓ Subset Merkle root: ${this.subsetMerkleRoot}\n`);

      // Step 3: Run tests with agent
      console.log('[3/6] Running agent on test suite...');
      await this.runAllTests();
      console.log(`✓ Completed ${this.testResults.length} tests\n`);

      // Step 4: Compute aggregate scores (full + subset)
      console.log('[4/6] Computing aggregate scores...');
      const aggregateScore = this.computeAggregateScore();
      const subsetAggregateScore = this.computeSubsetAggregateScore(selection.publicIndices);
      console.log(`✓ Full dataset score: ${aggregateScore.toFixed(2)}`);
      console.log(`✓ Public subset score: ${subsetAggregateScore.toFixed(2)}\n`);

      // Step 5: Generate dual ZK proofs
      console.log('[5/6] Generating dual zero-knowledge proofs...');
      const dualProof = await this.generateDualProof(selection, subsetAggregateScore);
      console.log(`✓ Dual ZK proofs generated\n`);

      // Step 6: Prepare public transparency data
      console.log('[6/6] Preparing public transparency data...');
      const publicData = this.preparePublicData(selection);
      console.log(`✓ Public data prepared\n`);

      this.executionEndTime = Date.now();

      // Return results with dual proofs
      const result = {
        // Full dataset (private, proven via ZK)
        merkleRoot: this.merkleRoot,
        score: aggregateScore,
        numTests: this.testSuite.length,

        // Public subset (transparent)
        subset: {
          merkleRoot: this.subsetMerkleRoot,
          score: subsetAggregateScore,
          numTests: selection.publicCount,
          publicIndices: selection.publicIndices,
          publicData: publicData
        },

        // Dual proofs
        zkProof: dualProof,
        verificationKey: {
          main: dualProof.mainProof.verificationKey,
          subset: dualProof.subsetProof.verificationKey
        },

        executionSummary: this.buildExecutionSummary()
      };

      // Automatically save complete proof package
      this.saveDualProofPackage(result, selection);

      console.log('='.repeat(60));
      console.log('DUAL-PROOF VERIFICATION COMPLETE');
      console.log('='.repeat(60));
      console.log(`Full Dataset Score: ${aggregateScore.toFixed(2)} (${this.testSuite.length} tests)`);
      console.log(`Public Subset Score: ${subsetAggregateScore.toFixed(2)} (${selection.publicCount} tests, ${selection.publicPercentage}%)`);
      console.log(`Duration: ${((this.executionEndTime - this.executionStartTime) / 1000).toFixed(1)}s`);
      console.log('='.repeat(60) + '\n');

      return result;

    } catch (error) {
      console.error('\n❌ Execution failed:', error.message);
      throw error;
    }
  }

  /**
   * Run agent on all test cases
   * @private
   */
  async runAllTests() {
    for (let i = 0; i < this.testSuite.length; i++) {
      const test = this.testSuite[i];
      console.log(`  Test ${i + 1}/${this.testSuite.length}: ${test.id}`);

      try {
        const result = await this.runSingleTest(test, i);
        this.testResults.push(result);

        console.log(`    ✓ Score: ${this.formatScore(result.score, result.scoringType)}`);

      } catch (error) {
        console.error(`    ✗ Failed: ${error.message}`);

        // Store failed result
        this.testResults.push({
          testId: test.id,
          testIndex: i,
          success: false,
          error: error.message,
          score: 0,
          scoringType: test.scoringType
        });
      }
    }
  }

  /**
   * Run agent on a single test case
   * @param {object} test - Test case
   * @param {number} index - Test index
   * @returns {Promise<object>} Test result
   * @private
   */
  async runSingleTest(test, index) {
    // Execute agent (pass full test object for custom executors)
    const executionResult = await this.agentExecutor.execute(test, test.id);

    // Score the output
    const score = await this.scorer.score({
      agentOutput: executionResult.output,
      idealOutput: test.idealOutput,
      scoringType: test.scoringType,
      criteria: test.scoringCriteria
    });

    // Get execution logs
    const logs = this.agentExecutor.getLogsForTest(test.id);

    return {
      testId: test.id,
      testIndex: index,
      prompt: test.prompt,
      agentOutput: executionResult.output,
      score,
      scoringType: test.scoringType,
      success: executionResult.success,
      metadata: executionResult.metadata,
      logs,
      executionTime: executionResult.metadata.duration
    };
  }

  /**
   * Compute aggregate score from all test results
   * @returns {number} Aggregate score (0-100)
   * @private
   */
  computeAggregateScore() {
    if (this.testResults.length === 0) {
      return 0;
    }

    let totalScore = 0;

    for (const result of this.testResults) {
      if (result.scoringType === 'binary') {
        // Binary: convert boolean to 0 or 100
        totalScore += result.score ? 100 : 0;
      } else {
        // Numeric: already 0-100
        totalScore += result.score;
      }
    }

    return totalScore / this.testResults.length;
  }

  /**
   * Compute aggregate score for public subset only
   * @param {Array<number>} publicIndices - Indices of public tests
   * @returns {number} Subset aggregate score (0-100)
   * @private
   */
  computeSubsetAggregateScore(publicIndices) {
    if (publicIndices.length === 0) {
      return 0;
    }

    let totalScore = 0;

    for (const idx of publicIndices) {
      const result = this.testResults[idx];
      if (result.scoringType === 'binary') {
        totalScore += result.score ? 100 : 0;
      } else {
        totalScore += result.score;
      }
    }

    return totalScore / publicIndices.length;
  }

  /**
   * Generate enhanced zero-knowledge proof with commitments (legacy single-proof)
   * @returns {Promise<object>} Enhanced ZK proof with commitments to logs, library, scoring
   * @private
   */
  async generateProof() {
    // Always generate enhanced proofs with full commitments
    return await this.proofGenerator.generateProof({
      testResults: this.testResults,
      merkleRoot: this.merkleRoot,
      aggregateScore: this.computeAggregateScore(),
      numTests: this.testSuite.length,
      // Enhanced: commit to execution logs (proves AI ran, prevents fabrication)
      executionLogs: this.agentExecutor.getAllLogs(),
      // Enhanced: commit to scoring criteria (proves fair evaluation)
      scoringCriteria: this.testSuite.map(test => ({
        testId: test.id,
        scoringType: test.scoringType,
        criteria: test.scoringCriteria
      }))
    });
  }

  /**
   * Generate dual proofs (main + subset) for partial transparency
   * @param {object} selection - Test selection result
   * @param {number} subsetAggregateScore - Subset aggregate score
   * @returns {Promise<object>} Dual ZK proofs
   * @private
   */
  async generateDualProof(selection, subsetAggregateScore) {
    // Extract public test results
    const publicResults = selection.publicIndices.map(idx => this.testResults[idx]);

    return await this.proofGenerator.generateDualProof({
      testResults: this.testResults,
      merkleRoot: this.merkleRoot,
      aggregateScore: this.computeAggregateScore(),
      numTests: this.testSuite.length,
      executionLogs: this.agentExecutor.getAllLogs(),
      scoringCriteria: this.testSuite.map(test => ({
        testId: test.id,
        scoringType: test.scoringType,
        criteria: test.scoringCriteria
      })),
      // Dual-proof specific inputs
      publicIndices: selection.publicIndices,
      publicResults: publicResults,
      subsetMerkleRoot: this.subsetMerkleRoot,
      subsetAggregateScore: subsetAggregateScore
    });
  }

  /**
   * Prepare public transparency data for subset tests
   * @param {object} selection - Test selection result
   * @returns {Array} Public test data
   * @private
   */
  preparePublicData(selection) {
    return selection.publicIndices.map(idx => {
      const test = this.testSuite[idx];
      const result = this.testResults[idx];

      return {
        testId: test.id,
        testIndex: idx,
        // Public: test prompt and ideal output
        prompt: test.prompt,
        idealOutput: test.idealOutput,
        // Public: agent's actual output
        agentOutput: result.agentOutput,
        // Public: score
        score: result.score,
        scoringType: result.scoringType,
        success: result.success,
        // Do NOT include execution logs (remain private even for public tests)
        executionTime: result.executionTime
      };
    });
  }

  /**
   * Build execution summary
   * @returns {object} Detailed execution summary
   * @private
   */
  buildExecutionSummary() {
    const logger = this.agentExecutor.getLogger();

    return {
      totalTests: this.testSuite.length,
      successfulTests: this.testResults.filter(r => r.success).length,
      failedTests: this.testResults.filter(r => !r.success).length,
      totalDuration: this.executionEndTime - this.executionStartTime,
      totalToolCalls: logger.getTotalToolCallCount(),
      testResults: this.testResults.map(result => ({
        testId: result.testId,
        score: result.score,
        scoringType: result.scoringType,
        success: result.success,
        toolCalls: result.logs?.length || 0,
        duration: result.executionTime
      })),
      logsHash: logger.computeLogsHash()
    };
  }

  /**
   * Format score for display
   * @param {number|boolean} score - Score value
   * @param {string} type - Scoring type
   * @returns {string} Formatted score
   * @private
   */
  formatScore(score, type) {
    if (type === 'binary') {
      return score ? 'PASS' : 'FAIL';
    }
    return `${score}/100`;
  }

  /**
   * Verify a proof (static method)
   * @param {object} params - Verification parameters
   * @param {object} params.proof - ZK proof
   * @param {object} params.publicInputs - Public inputs (merkleRoot, score, numTests)
   * @param {object} params.verificationKey - Verification key
   * @returns {Promise<boolean>} True if proof is valid
   */
  static async verify({ proof, publicInputs, verificationKey }) {
    const verifier = new Verifier();
    return await verifier.verify(proof, publicInputs, verificationKey);
  }

  /**
   * Get test results
   * @returns {Array} Test results
   */
  getTestResults() {
    return this.testResults;
  }

  /**
   * Get execution logs
   * @returns {Array} All execution logs
   */
  getExecutionLogs() {
    return this.agentExecutor.getAllLogs();
  }

  /**
   * Export results as JSON
   * @returns {string} JSON string of results
   */
  exportResults() {
    return JSON.stringify({
      merkleRoot: this.merkleRoot,
      score: this.computeAggregateScore(),
      numTests: this.testSuite.length,
      testResults: this.testResults,
      executionSummary: this.buildExecutionSummary()
    }, null, 2);
  }

  /**
   * Save dual proof package with full and subset transparency
   * @param {object} result - Result from runAndProve() with dual proofs
   * @param {object} selection - Test selection info
   * @private
   */
  saveDualProofPackage(result, selection) {
    const outputDir = this.config.outputDir || process.cwd();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Create complete dual proof package
    const dualProofPackage = {
      // Metadata
      metadata: {
        timestamp: new Date().toISOString(),
        library: 'agent-verifier',
        version: '0.1.0',
        proofType: 'dual-proof-partial-transparency'
      },

      // Full dataset (private, proven via ZK)
      fullDataset: {
        merkleRoot: result.merkleRoot,
        score: result.score,
        numTests: result.numTests
      },

      // Public subset (5%, fully transparent)
      publicSubset: {
        merkleRoot: result.subset.merkleRoot,
        score: result.subset.score,
        numTests: result.subset.numTests,
        percentage: selection.publicPercentage,
        publicIndices: result.subset.publicIndices,
        // Public test data (prompts, outputs, scores)
        tests: result.subset.publicData
      },

      // Dual ZK proofs
      zkProofs: {
        main: {
          proof: result.zkProof.mainProof.proof,
          publicSignals: result.zkProof.mainProof.publicSignals,
          protocol: result.zkProof.mainProof.protocol,
          commitments: result.zkProof.mainProof.commitments || null
        },
        subset: {
          proof: result.zkProof.subsetProof.proof,
          publicSignals: result.zkProof.subsetProof.publicSignals,
          protocol: result.zkProof.subsetProof.protocol
        },
        isPlaceholder: result.zkProof.isPlaceholder
      },

      // Verification keys
      verificationKeys: {
        main: result.verificationKey.main,
        subset: result.verificationKey.subset
      },

      // Enhanced commitments (from main proof)
      commitmentDetails: result.zkProof.mainProof.commitments ? {
        logsCommitment: {
          value: result.zkProof.mainProof.commitments.logsCommitment,
          proves: 'Execution logs exist and are cryptographically locked (cannot be fabricated later)'
        },
        libraryVersion: {
          value: result.zkProof.mainProof.commitments.libraryVersion,
          proves: 'Specific library version was used (agent-verifier@0.1.0)'
        },
        scoringMethod: {
          value: result.zkProof.mainProof.commitments.scoringMethod,
          proves: 'Scoring criteria is locked in (ensures fair evaluation)'
        }
      } : null,

      // Execution summary
      execution: {
        totalTests: result.executionSummary.totalTests,
        successfulTests: result.executionSummary.successfulTests,
        failedTests: result.executionSummary.failedTests,
        totalDuration: result.executionSummary.totalDuration,
        totalToolCalls: result.executionSummary.totalToolCalls
      },

      // Complete execution logs (private, but can be revealed to verify commitment)
      logs: this.agentExecutor.getAllLogs(),

      // Per-test results (full dataset)
      testResults: result.executionSummary.testResults.map(test => ({
        testId: test.testId,
        score: test.score,
        scoringType: test.scoringType,
        success: test.success,
        toolCalls: test.toolCalls,
        duration: test.duration,
        isPublic: selection.publicIndices.includes(test.testId) || false
      }))
    };

    // Save complete dual proof package
    const proofPath = path.join(outputDir, `dual-proof-package-${timestamp}.json`);
    fs.writeFileSync(proofPath, JSON.stringify(dualProofPackage, null, 2));
    console.log(`\n📦 Complete dual proof package saved to: ${proofPath}`);

    // Save a shareable version (for public verification)
    const shareableProof = {
      claim: {
        fullDataset: {
          merkleRoot: result.merkleRoot,
          score: result.score,
          numTests: result.numTests
        },
        publicSubset: {
          merkleRoot: result.subset.merkleRoot,
          score: result.subset.score,
          numTests: result.subset.numTests,
          percentage: selection.publicPercentage
        },
        timestamp: new Date().toISOString()
      },

      // Public subset data (anyone can verify these scores)
      publicTests: result.subset.publicData,

      // Dual proofs
      proofs: {
        main: result.zkProof.mainProof.proof,
        subset: result.zkProof.subsetProof.proof
      },
      publicSignals: {
        main: result.zkProof.mainProof.publicSignals,
        subset: result.zkProof.subsetProof.publicSignals
      },
      verificationKeys: {
        main: result.verificationKey.main,
        subset: result.verificationKey.subset
      },
      protocol: 'groth16-dual',

      // Enhanced commitments
      commitments: result.zkProof.mainProof.commitments || null,

      // What this proves
      about: {
        transparency: `This is a dual-proof system with partial transparency. ${selection.publicPercentage}% of tests are public, ${100 - parseFloat(selection.publicPercentage)}% remain private.`,
        guarantees: [
          `Public subset score: ${result.subset.score.toFixed(2)} (${result.subset.numTests} tests, fully verifiable)`,
          `Full dataset score: ${result.score.toFixed(2)} (${result.numTests} tests, proven via ZK)`,
          'Subset is cryptographically proven to be part of the full dataset',
          'Execution logs are committed (cannot be fabricated)',
          'Library version and scoring criteria are committed',
          'Full accountability with selective transparency'
        ],
        verification: [
          'Anyone can verify the public subset scores match claimed values',
          'Anyone can verify the full dataset proof without seeing private tests',
          'The two proofs are cryptographically linked'
        ]
      }
    };

    const shareablePath = path.join(outputDir, `shareable-dual-proof-${timestamp}.json`);
    fs.writeFileSync(shareablePath, JSON.stringify(shareableProof, null, 2));
    console.log(`🔗 Shareable dual proof saved to: ${shareablePath}`);
    console.log(`   (Share this to prove your claim with partial transparency)\n`);

    console.log('🔍 Dual Proof System Summary:');
    console.log(`   • Public tests: ${result.subset.numTests} (${selection.publicPercentage}%)`);
    console.log(`   • Public score: ${result.subset.score.toFixed(2)}`);
    console.log(`   • Full dataset score: ${result.score.toFixed(2)}`);
    console.log(`   • Score difference: ${Math.abs(result.score - result.subset.score).toFixed(2)} points\n`);

    if (result.zkProof.mainProof.commitments) {
      console.log('🔒 Enhanced commitments included:');
      console.log('   • Execution logs commitment');
      console.log('   • Library version commitment');
      console.log('   • Scoring method commitment\n');
    }
  }

  /**
   * Automatically save complete proof package with logs and ZK proof (legacy)
   * @param {object} result - Result from runAndProve()
   * @private
   */
  saveProofPackage(result) {
    const outputDir = this.config.outputDir || process.cwd();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Create complete proof package
    const proofPackage = {
      // Metadata
      metadata: {
        timestamp: new Date().toISOString(),
        library: 'agent-verifier',
        version: '0.1.0'
      },

      // Public claims (can be shared)
      public: {
        merkleRoot: result.merkleRoot,
        score: result.score,
        numTests: result.numTests
      },

      // Zero-knowledge proof with enhanced commitments
      zkProof: {
        proof: result.zkProof.proof,
        publicSignals: result.zkProof.publicSignals,
        protocol: result.zkProof.protocol,
        isPlaceholder: result.zkProof.isPlaceholder,
        // Enhanced commitments (prove accountability)
        commitments: result.zkProof.commitments || null
      },

      // Verification key (needed to verify the proof)
      verificationKey: result.verificationKey,

      // Enhanced commitments explanation (what they prove)
      commitmentDetails: result.zkProof.commitments ? {
        logsCommitment: {
          value: result.zkProof.commitments.logsCommitment,
          proves: 'Execution logs exist and are cryptographically locked (cannot be fabricated later)'
        },
        libraryVersion: {
          value: result.zkProof.commitments.libraryVersion,
          proves: 'Specific library version was used (agent-verifier@0.1.0, prevents tampering)'
        },
        scoringMethod: {
          value: result.zkProof.commitments.scoringMethod,
          proves: 'Scoring criteria is locked in (ensures fair evaluation)'
        }
      } : null,

      // Execution summary
      execution: {
        totalTests: result.executionSummary.totalTests,
        successfulTests: result.executionSummary.successfulTests,
        failedTests: result.executionSummary.failedTests,
        totalDuration: result.executionSummary.totalDuration,
        totalToolCalls: result.executionSummary.totalToolCalls
      },

      // Complete execution logs (all tool calls)
      logs: this.agentExecutor.getAllLogs(),

      // Per-test results with scores
      testResults: result.executionSummary.testResults.map(test => ({
        testId: test.testId,
        score: test.score,
        scoringType: test.scoringType,
        success: test.success,
        toolCalls: test.toolCalls,
        duration: test.duration
      }))
    };

    // Save complete proof package
    const proofPath = path.join(outputDir, `proof-package-${timestamp}.json`);
    fs.writeFileSync(proofPath, JSON.stringify(proofPackage, null, 2));
    console.log(`\n📦 Complete proof package saved to: ${proofPath}`);

    // Also save a shareable version (just what's needed for verification)
    const shareableProof = {
      claim: {
        merkleRoot: result.merkleRoot,
        score: result.score,
        numTests: result.numTests,
        timestamp: new Date().toISOString()
      },
      proof: result.zkProof.proof,
      publicSignals: result.zkProof.publicSignals,
      verificationKey: result.verificationKey,
      protocol: result.zkProof.protocol,
      // Enhanced commitments (public, can be verified by anyone)
      commitments: result.zkProof.commitments || null,
      // What these commitments prove
      about: result.zkProof.commitments ? {
        accountability: 'This proof includes cryptographic commitments to execution logs, library version, and scoring criteria',
        guarantees: [
          'Execution logs cannot be fabricated or altered after proof generation',
          'Specific library version (agent-verifier@0.1.0) was used',
          'Scoring criteria is locked in and fair',
          'Results are fully accountable and verifiable'
        ],
        optionalReveal: 'Prover can optionally reveal logs later; anyone can verify they match the commitment'
      } : null
    };

    const shareablePath = path.join(outputDir, `shareable-proof-${timestamp}.json`);
    fs.writeFileSync(shareablePath, JSON.stringify(shareableProof, null, 2));
    console.log(`🔗 Shareable proof saved to: ${shareablePath}`);
    console.log(`   (Share this to prove your claim with full accountability)\n`);

    if (result.zkProof.commitments) {
      console.log('🔒 Enhanced commitments included in both files:');
      console.log('   • Execution logs commitment (proves AI ran)');
      console.log('   • Library version commitment (proves v0.1.0 used)');
      console.log('   • Scoring method commitment (proves fair evaluation)\n');
    }
  }
}
