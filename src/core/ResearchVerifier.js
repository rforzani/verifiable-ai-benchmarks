import { MerkleTree } from '../merkle/MerkleTree.js';
import { TestSelector } from '../selection/TestSelector.js';
import { ProofGenerator } from '../zk/ProofGenerator.js';
import { Verifier } from '../zk/Verifier.js';
import { ExecutionLogger } from '../logging/ExecutionLogger.js';
import { ExecutionContext } from './interfaces/ExecutionContext.js';
import { validateTestSuite, normalizeTestCase } from '../utils/testSuiteValidator.js';
import {
  ConfigValidationError,
  AgentExecutionError,
  ScoringError,
  ProofGenerationError
} from './errors/index.js';
import pLimit from 'p-limit';
import fs from 'fs';
import path from 'path';

/**
 * ResearchVerifier - Universal AI Agent Verification with Zero-Knowledge Proofs
 *
 * Provider-agnostic verifiable AI agent execution framework.
 * Works with any agent system (Anthropic, OpenAI, LangChain, custom frameworks).
 *
 * Architecture:
 * 1. Test Selection - Deterministically select public subset (5%)
 * 2. Agent Execution - Run agent on all tests via pluggable providers
 * 3. Scoring - Evaluate outputs via pluggable scorers (AI or deterministic)
 * 4. Proof Generation - Generate dual ZK-SNARKs (main + subset)
 * 5. Verification - Anyone can verify proofs independently
 *
 * Key Features:
 * - Provider-agnostic (works with any AI system)
 * - Dual-proof architecture (95% private, 5% public)
 * - Cryptographic commitments (logs, library, scoring)
 * - Complete reproducibility
 *
 * @class
 */
export class ResearchVerifier {
  /**
   * Create a research verifier instance
   *
   * @param {object} config - Configuration object
   * @param {Array} config.testSuite - Array of test cases
   * @param {AgentProvider} config.agentProvider - Agent execution provider
   * @param {ScorerProvider} config.scorerProvider - Scoring provider
   * @param {object} [config.selectionConfig] - Test selection configuration
   * @param {object} [config.zkConfig] - Zero-knowledge proof configuration
   * @param {string} [config.outputDir] - Output directory for proof packages
   * @param {object} [config.parallelConfig] - Parallel execution configuration
   * @param {boolean} [config.parallelConfig.enabled=false] - Enable parallel test execution
   * @param {number} [config.parallelConfig.maxConcurrent=5] - Maximum concurrent tests
   * @throws {ConfigValidationError} If configuration is invalid
   */
  constructor(config) {
    this._validateConfig(config);

    // Validate and normalize test suite
    validateTestSuite(config.testSuite);
    this.testSuite = config.testSuite.map(normalizeTestCase);

    // Store providers
    this.agentProvider = config.agentProvider;
    this.scorerProvider = config.scorerProvider;

    // Configuration
    this.selectionConfig = config.selectionConfig || {};
    this.zkConfig = config.zkConfig || {};
    this.outputDir = config.outputDir || './proof-packages';

    // Parallel execution configuration
    this.parallelConfig = {
      enabled: config.parallelConfig?.enabled || false,
      maxConcurrent: config.parallelConfig?.maxConcurrent || 5
    };

    // Initialize subsystems
    this.merkleTree = new MerkleTree(this.testSuite);
    this.proofGenerator = new ProofGenerator({
      ...this.zkConfig,
      libraryVersion: '1.0.0'
    });

    // Execution state
    this.merkleRoot = null;
    this.subsetMerkleRoot = null;
    this.testResults = [];
    this.executionLogger = new ExecutionLogger();
    this.executionStartTime = null;
    this.executionEndTime = null;
  }

  /**
   * Run agent on all tests and generate dual ZK proofs
   *
   * This is the main entry point that orchestrates the entire verification workflow:
   * 1. Select public subset (5%, deterministic)
   * 2. Generate Merkle trees (full + subset)
   * 3. Execute agent on all tests
   * 4. Score all outputs
   * 5. Generate dual ZK proofs
   * 6. Prepare public transparency data
   *
   * @returns {Promise<object>} Verification result with dual proofs
   * @throws {AgentExecutionError} If agent execution fails
   * @throws {ScoringError} If scoring fails
   * @throws {ProofGenerationError} If proof generation fails
   */
  async runAndProve() {
    console.log(`\nResearch Verifier: Starting execution on ${this.testSuite.length} tests...`);
    console.log(`Agent Provider: ${this.agentProvider.getName()}`);
    console.log(`Scorer Provider: ${this.scorerProvider.getName()}\n`);

    this.executionStartTime = Date.now();

    try {
      // Step 1: Select public subset
      console.log('[1/6] Selecting public subset (5%, deterministic)...');
      const selector = new TestSelector(this.testSuite, this.selectionConfig);
      const selection = selector.select();
      console.log(`✓ Selected ${selection.publicCount} public tests (${selection.publicPercentage}%)\n`);

      // Step 2: Generate dual Merkle trees
      console.log('[2/6] Generating dual Merkle trees...');
      const dualRoots = this.merkleTree.generateDualRoots(selection.publicIndices);
      this.merkleRoot = dualRoots.fullRoot;
      this.subsetMerkleRoot = dualRoots.subsetRoot;
      console.log(`✓ Full Merkle root: ${this.merkleRoot}`);
      console.log(`✓ Subset Merkle root: ${this.subsetMerkleRoot}\n`);

      // Step 3: Execute agent on all tests
      console.log('[3/6] Executing agent on all tests...');
      await this._executeTests();
      console.log(`✓ Completed ${this.testResults.length} tests\n`);

      // Step 4: Compute aggregate scores
      console.log('[4/6] Computing aggregate scores...');
      const aggregateScore = this._computeAggregateScore();
      const subsetAggregateScore = this._computeSubsetAggregateScore(selection.publicIndices);
      console.log(`✓ Full dataset score: ${aggregateScore.toFixed(2)}`);
      console.log(`✓ Public subset score: ${subsetAggregateScore.toFixed(2)}\n`);

      // Step 5: Generate dual ZK proofs
      console.log('[5/6] Generating dual zero-knowledge proofs...');
      const dualProof = await this._generateDualProof(selection, subsetAggregateScore);
      console.log(`✓ Dual ZK proofs generated\n`);

      // Step 6: Prepare public transparency data
      console.log('[6/6] Preparing public transparency data...');
      const publicData = this._preparePublicData(selection);
      console.log(`✓ Public data prepared\n`);

      this.executionEndTime = Date.now();

      // Build result object
      const result = {
        // Full dataset (zero-knowledge)
        full: {
          merkleRoot: this.merkleRoot,
          score: aggregateScore,
          numTests: this.testSuite.length,
          executionTime: this.executionEndTime - this.executionStartTime
        },

        // Public subset (transparent)
        subset: {
          merkleRoot: this.subsetMerkleRoot,
          score: subsetAggregateScore,
          numTests: selection.publicCount,
          publicIndices: selection.publicIndices,
          publicData: publicData
        },

        // Dual ZK proofs
        zkProof: dualProof,

        // Provider information
        providers: {
          agent: {
            name: this.agentProvider.getName(),
            version: this.agentProvider.getVersion()
          },
          scorer: {
            name: this.scorerProvider.getName(),
            type: this.scorerProvider.getType()
          }
        },

        // Metadata
        metadata: {
          timestamp: new Date().toISOString(),
          libraryVersion: '1.0.0',
          testSuiteSize: this.testSuite.length,
          publicPercentage: selection.publicPercentage
        }
      };

      // Save proof package
      await this._saveProofPackage(result);

      console.log(`\n✅ Verification complete!`);
      console.log(`   Full dataset score: ${aggregateScore.toFixed(2)}`);
      console.log(`   Public subset score: ${subsetAggregateScore.toFixed(2)}`);
      console.log(`   Execution time: ${(result.full.executionTime / 1000).toFixed(2)}s\n`);

      return result;

    } catch (error) {
      this.executionEndTime = Date.now();

      if (error.name && error.name.includes('Error')) {
        throw error; // Already wrapped
      }

      throw new Error(`Verification failed: ${error.message}`);
    }
  }

  /**
   * Execute agent on all tests (supports parallel and sequential execution)
   * @private
   */
  async _executeTests() {
    if (this.parallelConfig.enabled) {
      await this._executeTestsParallel();
    } else {
      await this._executeTestsSequential();
    }
  }

  /**
   * Execute tests sequentially (original behavior)
   * @private
   */
  async _executeTestsSequential() {
    for (let i = 0; i < this.testSuite.length; i++) {
      const test = this.testSuite[i];
      console.log(`  [${i + 1}/${this.testSuite.length}] Executing test: ${test.id}`);

      const result = await this._executeSingleTest(test);
      this.testResults.push(result);

      console.log(`  ✓ Score: ${test.scoringType === 'binary' ? (result.score ? 'PASS' : 'FAIL') : result.score}\n`);
    }
  }

  /**
   * Execute tests in parallel with concurrency control
   * @private
   */
  async _executeTestsParallel() {
    console.log(`  ⚡ Parallel execution enabled (max ${this.parallelConfig.maxConcurrent} concurrent tests)\n`);

    const limit = pLimit(this.parallelConfig.maxConcurrent);
    let completed = 0;

    const promises = this.testSuite.map((test, index) =>
      limit(async () => {
        const startTime = Date.now();
        console.log(`  [${index + 1}/${this.testSuite.length}] Starting test: ${test.id}`);

        try {
          const result = await this._executeSingleTest(test, index);

          completed++;
          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          console.log(`  ✓ [${index + 1}/${this.testSuite.length}] ${test.id} completed in ${duration}s (${completed}/${this.testSuite.length} done)`);

          return { index, result };

        } catch (error) {
          completed++;
          console.error(`  ✗ [${index + 1}/${this.testSuite.length}] ${test.id} failed`);
          throw error;
        }
      })
    );

    // Wait for all tests to complete
    const results = await Promise.all(promises);

    // Sort results by original index to maintain order
    results.sort((a, b) => a.index - b.index);
    this.testResults = results.map(r => r.result);

    console.log(`\n  ⚡ Parallel execution complete! All ${this.testSuite.length} tests finished.\n`);
  }

  /**
   * Execute a single test (agent + scoring)
   * @private
   */
  async _executeSingleTest(test) {
    try {
      // Create execution context
      const context = new ExecutionContext(test.id);

      // Execute agent
      const agentOutput = await this.agentProvider.execute(test.prompt, context);

      // Score output
      const score = await this.scorerProvider.score({
        agentOutput,
        idealOutput: test.idealOutput,
        scoringType: test.scoringType,
        criteria: test.scoringCriteria,
        metadata: { testId: test.id }
      });

      // Return result
      return {
        testId: test.id,
        prompt: test.prompt,
        idealOutput: test.idealOutput,
        agentOutput,
        score,
        scoringType: test.scoringType,
        success: test.scoringType === 'binary' ? score === true : score >= 50,
        logs: context.getLogs(),
        duration: context.getMetadata().duration
      };

    } catch (error) {
      if (error instanceof AgentExecutionError || error instanceof ScoringError) {
        throw error;
      }

      throw new AgentExecutionError(
        `Execution failed for test ${test.id}: ${error.message}`,
        test.id,
        { originalError: error.message }
      );
    }
  }

  /**
   * Compute aggregate score for full dataset
   * @private
   */
  _computeAggregateScore() {
    if (this.testResults.length === 0) return 0;

    let totalScore = 0;
    for (const result of this.testResults) {
      if (result.scoringType === 'binary') {
        totalScore += result.score ? 100 : 0;
      } else {
        totalScore += result.score;
      }
    }

    return totalScore / this.testResults.length;
  }

  /**
   * Compute aggregate score for public subset
   * @private
   */
  _computeSubsetAggregateScore(publicIndices) {
    if (publicIndices.length === 0) return 0;

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
   * Generate dual ZK proofs
   * @private
   */
  async _generateDualProof(selection, subsetAggregateScore) {
    const publicResults = selection.publicIndices.map(idx => this.testResults[idx]);

    try {
      return await this.proofGenerator.generateDualProof({
        testResults: this.testResults,
        merkleRoot: this.merkleRoot,
        aggregateScore: this._computeAggregateScore(),
        numTests: this.testSuite.length,
        executionLogs: this.executionLogger.getAllLogs(),
        scoringCriteria: this.testSuite.map(test => ({
          testId: test.id,
          scoringType: test.scoringType,
          criteria: test.scoringCriteria
        })),
        publicIndices: selection.publicIndices,
        publicResults: publicResults,
        subsetMerkleRoot: this.subsetMerkleRoot,
        subsetAggregateScore: subsetAggregateScore
      });

    } catch (error) {
      throw new ProofGenerationError(
        `Failed to generate dual proofs: ${error.message}`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Prepare public transparency data
   * @private
   */
  _preparePublicData(selection) {
    return selection.publicIndices.map(idx => {
      const test = this.testSuite[idx];
      const result = this.testResults[idx];

      return {
        testId: test.id,
        prompt: test.prompt,
        idealOutput: test.idealOutput,
        agentOutput: result.agentOutput,
        score: result.score,
        scoringType: test.scoringType,
        success: result.success
      };
    });
  }

  /**
   * Save proof package to disk
   * @private
   */
  async _saveProofPackage(result) {
    // Ensure output directory exists
    await fs.promises.mkdir(this.outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `proof-package-${timestamp}.json`;
    const filepath = path.join(this.outputDir, filename);

    await fs.promises.writeFile(
      filepath,
      JSON.stringify(result, null, 2),
      'utf8'
    );

    console.log(`📦 Proof package saved: ${filepath}`);
  }

  /**
   * Validate configuration
   * @private
   */
  _validateConfig(config) {
    if (!config) {
      throw new ConfigValidationError('Configuration object is required');
    }

    if (!config.testSuite) {
      throw new ConfigValidationError('testSuite is required');
    }

    if (!Array.isArray(config.testSuite)) {
      throw new ConfigValidationError('testSuite must be an array');
    }

    if (config.testSuite.length === 0) {
      throw new ConfigValidationError('testSuite cannot be empty');
    }

    if (!config.agentProvider) {
      throw new ConfigValidationError('agentProvider is required');
    }

    if (!config.scorerProvider) {
      throw new ConfigValidationError('scorerProvider is required');
    }

    // Validate provider interfaces
    if (typeof config.agentProvider.execute !== 'function') {
      throw new ConfigValidationError(
        'agentProvider must implement execute() method'
      );
    }

    if (typeof config.scorerProvider.score !== 'function') {
      throw new ConfigValidationError(
        'scorerProvider must implement score() method'
      );
    }
  }

  /**
   * Static method: Verify a proof independently
   *
   * @param {object} proof - ZK proof object
   * @param {object} publicInputs - Public inputs (merkleRoot, score, numTests)
   * @param {object} verificationKey - Verification key
   * @returns {Promise<boolean>} True if proof is valid
   */
  static async verify(proof, publicInputs, verificationKey) {
    const verifier = new Verifier();
    return await verifier.verify(proof, publicInputs, verificationKey);
  }
}
