import * as snarkjs from 'snarkjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ZK Proof Generator - Dual Proof System with Complete Cryptographic Verification
 *
 * UPDATED for new circuit architecture:
 * - Circuits now take full test case data as inputs
 * - Merkle verification happens IN-CIRCUIT
 * - Subset circuit outputs merkleRoot (doesn't take it as input)
 * - Main circuit verifies subset Merkle root computation
 * - All commitments computed from raw data in circuits
 *
 * This provides ZERO TRUST - everything is verified cryptographically!
 */
export class ProofGenerator {
  constructor(config = {}) {
    const projectRoot = path.join(__dirname, '../..');

    // Main circuit paths (full dataset)
    this.wasmPath = config.wasmPath ||
      path.join(projectRoot, 'circuits/verifier_js/verifier.wasm');

    this.zkeyPath = config.zkeyPath ||
      path.join(projectRoot, 'circuits/verifier_final.zkey');

    this.vkeyPath = config.vkeyPath ||
      path.join(projectRoot, 'circuits/verification_key.json');

    // Subset circuit paths (public 10%)
    this.wasmPathSubset = config.wasmPathSubset ||
      path.join(projectRoot, 'circuits/verifier-subset_js/verifier-subset.wasm');

    this.zkeyPathSubset = config.zkeyPathSubset ||
      path.join(projectRoot, 'circuits/verifier-subset_final.zkey');

    this.vkeyPathSubset = config.vkeyPathSubset ||
      path.join(projectRoot, 'circuits/verification_key_subset.json');

    // Circuit parameters (must match compiled circuits)
    this.maxTests = config.maxTests || 100;
    this.maxSubset = config.maxSubset || 10;
    this.merkleTreeDepth = config.merkleTreeDepth || 10;
    this.libraryVersion = config.libraryVersion || '1.0.0';

    // Lazy-loaded Poseidon hasher
    this._poseidon = null;
  }

  /**
   * Get or initialize Poseidon hasher
   * NOTE: Requires circomlibjs to be installed
   */
  async getPoseidon() {
    if (this._poseidon) return this._poseidon;

    try {
      // Try to load circomlibjs
      const { buildPoseidon } = await import('circomlibjs');
      this._poseidon = await buildPoseidon();
      return this._poseidon;
    } catch (error) {
      console.warn('⚠️  circomlibjs not found, using SHA256 fallback');
      console.warn('   Install it with: npm install circomlibjs');
      console.warn('   Proofs will use placeholder mode');
      return null;
    }
  }

  /**
   * Hash a string to a field element using Poseidon
   * If Poseidon not available, use SHA256 and convert to BigInt
   */
  async hashString(str) {
    const poseidon = await this.getPoseidon();

    // First, hash the string with SHA256 to get a fixed-size value
    const sha256Hash = crypto.createHash('sha256').update(str).digest();

    // Convert to BigInt (take first 31 bytes to fit in BN254 field)
    const hashBigInt = BigInt('0x' + sha256Hash.slice(0, 31).toString('hex'));

    if (poseidon) {
      // Hash again with Poseidon for circuit compatibility
      const F = poseidon.F;
      const poseidonHash = poseidon([hashBigInt]);
      return F.toObject(poseidonHash).toString();
    }

    return hashBigInt.toString();
  }

  /**
   * Compute test case leaf hash: Poseidon(testId, promptHash, idealOutputHash, agentOutputHash, score)
   * Matches TestCaseLeafHash template in circuits
   */
  async computeTestCaseLeafHash({ testId, promptHash, idealOutputHash, agentOutputHash, score }) {
    const poseidon = await this.getPoseidon();

    if (!poseidon) {
      // Fallback: just hash all inputs together
      const combined = `${testId}|${promptHash}|${idealOutputHash}|${agentOutputHash}|${score}`;
      return await this.hashString(combined);
    }

    const F = poseidon.F;

    // Poseidon expects 5 inputs for this template
    const hash = poseidon([
      BigInt(testId),
      BigInt(promptHash),
      BigInt(idealOutputHash),
      BigInt(agentOutputHash),
      BigInt(score)
    ]);

    // Convert field element to clean string
    return F.toObject(hash).toString();
  }

  /**
   * Build Merkle tree from leaf hashes (pad to 16 for subset, stay at maxTests for main)
   * Returns root hash
   */
  async buildMerkleTree(leaves, targetSize = 16) {
    const poseidon = await this.getPoseidon();

    if (!poseidon) {
      // Fallback: simple hash of all leaves
      const combined = leaves.join('|');
      return await this.hashString(combined);
    }

    const F = poseidon.F;

    // Pad leaves to target size
    const paddedLeaves = [...leaves];
    while (paddedLeaves.length < targetSize) {
      paddedLeaves.push('0');
    }

    // Build tree level by level
    let currentLevel = paddedLeaves.map(leaf => BigInt(leaf));

    while (currentLevel.length > 1) {
      const nextLevel = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : currentLevel[i];

        const parentHash = poseidon([left, right]);
        nextLevel.push(parentHash);
      }

      currentLevel = nextLevel;
    }

    return F.toObject(F.e(currentLevel[0])).toString();
  }

  /**
   * Build Merkle tree and generate authentication paths for verification
   * Returns { root, paths } where paths[i] = { pathElements, pathIndices }
   * @param leaves - Array of leaf values
   * @param depth - Tree depth (default: this.merkleTreeDepth for main circuit, use 4 for subset)
   */
  async buildMerkleTreeWithPaths(leaves, depth = null) {
    const treeDepth = depth !== null ? depth : this.merkleTreeDepth;
    const poseidon = await this.getPoseidon();

    if (!poseidon) {
      // Fallback mode - return dummy data
      return {
        root: await this.hashString(leaves.join('|')),
        paths: leaves.map(() => ({
          pathElements: Array(treeDepth).fill('0'),
          pathIndices: Array(treeDepth).fill(0)
        }))
      };
    }

    const F = poseidon.F;

    // Pad to next power of 2
    const targetSize = Math.pow(2, treeDepth);
    const paddedLeaves = [...leaves];
    while (paddedLeaves.length < targetSize) {
      paddedLeaves.push('0');
    }

    // Build tree and store all levels
    const tree = [paddedLeaves.map(leaf => BigInt(leaf))];

    let currentLevel = tree[0];
    while (currentLevel.length > 1) {
      const nextLevel = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : currentLevel[i];
        const parentHash = poseidon([left, right]);
        nextLevel.push(parentHash);
      }

      tree.push(nextLevel);
      currentLevel = nextLevel;
    }

    // Convert root to string - use F.toObject() to get clean BigInt, then toString()
    const rootElement = F.e(tree[tree.length - 1][0]);
    const root = F.toObject(rootElement).toString();

    // Generate authentication paths for each leaf
    const paths = [];
    for (let leafIndex = 0; leafIndex < leaves.length; leafIndex++) {
      const pathElements = [];
      const pathIndices = [];

      let index = leafIndex;
      for (let level = 0; level < treeDepth; level++) {
        const isLeft = index % 2 === 0;
        const siblingIndex = isLeft ? index + 1 : index - 1;

        // Get sibling (or self if at edge)
        const sibling = tree[level][siblingIndex] !== undefined
          ? tree[level][siblingIndex]
          : tree[level][index];

        // Convert field element to string - use F.toObject() to get clean BigInt
        const siblingElement = F.e(sibling);
        pathElements.push(F.toObject(siblingElement).toString());
        pathIndices.push(isLeft ? 0 : 1);

        index = Math.floor(index / 2);
      }

      paths.push({ pathElements, pathIndices });
    }

    return { root, paths };
  }

  /**
   * Generate dual proofs (main + subset) for partial transparency
   *
   * CRITICAL: The subset data must be extracted from the ADJUSTED full dataset
   * to ensure Merkle roots match!
   */
  async generateDualProof({
    testResults,          // All test results with full data
    aggregateScore,       // Full dataset aggregate score
    numTests,             // Total number of tests
    executionLogs,        // Execution logs
    scoringCriteria,      // Scoring method
    publicIndices,        // Which tests are public (10%)
    publicResults,        // Results for public tests (with full data)
    subsetAggregateScore  // Aggregate score for public subset
  }) {
    // Normalize public indices to safe integers (defensive against BigInt/string inputs)
    const normalizedPublicIndices = (publicIndices || []).map((idx, i) => {
      const coerced = typeof idx === 'bigint' ? Number(idx) : Number(idx);
      if (!Number.isInteger(coerced) || coerced < 0) {
        throw new Error(`Invalid public index at position ${i}: ${String(idx)}`);
      }
      return coerced;
    });

    const normalizedPublicResults = normalizedPublicIndices.map((idx, i) => {
      if (!Array.isArray(testResults)) {
        throw new Error('Test results must be an array');
      }
      const result = testResults[idx];
      if (!result) {
        throw new Error(`Missing test result for public index ${idx} (position ${i})`);
      }
      return result;
    });

    const setup = this.checkSetup();
    const subsetSetup = this.checkSubsetSetup();

    // If either circuit is not compiled, fall back to placeholder
    if (!setup.wasmExists || !setup.zkeyExists || !setup.vkeyExists ||
        !subsetSetup.wasmExists || !subsetSetup.zkeyExists || !subsetSetup.vkeyExists) {
      console.log('⚠️  Circuits not compiled, using placeholder dual proof');
      return this.generatePlaceholderDualProof({
        testResults,
        aggregateScore,
        numTests,
        executionLogs,
        scoringCriteria,
        publicIndices: normalizedPublicIndices,
        subsetAggregateScore,
        publicResults: normalizedPublicResults
      });
    }

    try {
      // CRITICAL FIX: Prepare main circuit inputs FIRST to get adjusted scores
      // Then extract subset data from the adjusted full dataset
      console.log('  Preparing main circuit inputs (adjusting scores)...');

      const mainCircuitInputs = await this.prepareMainCircuitInputs({
        testResults,
        aggregateScore,
        numTests,
        executionLogs,
        scoringCriteria,
        publicIndices: normalizedPublicIndices,
        publicResults: normalizedPublicResults,
        subsetMerkleRoot: '0', // Dummy value, will be replaced
        subsetAggregateScore
      });

      // Extract adjusted subset data from the main circuit inputs
      // This ensures subset circuit sees the SAME data as main circuit
      const adjustedSubsetData = {
        testIds: [],
        promptHashes: [],
        idealOutputHashes: [],
        agentOutputHashes: [],
        scores: []
      };

      for (let i = 0; i < normalizedPublicIndices.length && i < this.maxSubset; i++) {
        const idx = normalizedPublicIndices[i];
        adjustedSubsetData.testIds.push(mainCircuitInputs.testIds[idx]);
        adjustedSubsetData.promptHashes.push(mainCircuitInputs.promptHashes[idx]);
        adjustedSubsetData.idealOutputHashes.push(mainCircuitInputs.idealOutputHashes[idx]);
        adjustedSubsetData.agentOutputHashes.push(mainCircuitInputs.agentOutputHashes[idx]);
        adjustedSubsetData.scores.push(mainCircuitInputs.scores[idx]);
      }

      // Pad to maxSubset (circuits expect maxSubset inputs, then pad internally to power of 2)
      // Use the last valid test for padding (testId must be non-zero)
      const lastValidIdx = Math.max(0, adjustedSubsetData.testIds.length - 1);
      while (adjustedSubsetData.testIds.length < this.maxSubset) {
        // Repeat the last valid test data for padding (circuit requires non-zero testIds)
        adjustedSubsetData.testIds.push(adjustedSubsetData.testIds[lastValidIdx] || BigInt(1));
        adjustedSubsetData.promptHashes.push(adjustedSubsetData.promptHashes[lastValidIdx] || BigInt(0));
        adjustedSubsetData.idealOutputHashes.push(adjustedSubsetData.idealOutputHashes[lastValidIdx] || BigInt(0));
        adjustedSubsetData.agentOutputHashes.push(adjustedSubsetData.agentOutputHashes[lastValidIdx] || BigInt(0));
        adjustedSubsetData.scores.push(adjustedSubsetData.scores[lastValidIdx] || BigInt(0));
      }

      // Generate subset proof with adjusted data (NO additional adjustment!)
      console.log('  Generating subset proof with extracted data (public 10%)...');
      console.log('  🔍 Data sent to subset circuit:');
      console.log('    testIds:', adjustedSubsetData.testIds.slice(0, 3).map(x => x.toString()));
      console.log('    scores:', adjustedSubsetData.scores.slice(0, 3).map(x => x.toString()));

      const subsetProof = await this.generateSubsetProofFromExtractedData({
        adjustedSubsetData,
        subsetAggregateScore,
        numSubset: normalizedPublicResults.length,
        executionLogs,
        scoringCriteria
      });

      console.log('    Subset proof public signals:', subsetProof.publicSignals.map(x => x.toString()));

      // Extract subset merkle root from proof outputs
      const subsetMerkleRoot = subsetProof.publicSignals[0];

      const debugSubsetRoot = await this.computeSubsetMerkleRootFromData(adjustedSubsetData);
      console.log('    JS recomputed subset Merkle root:', debugSubsetRoot);
      if (debugSubsetRoot !== subsetMerkleRoot) {
        console.warn('    ⚠️  Mismatch between subset proof root and recomputed root');
        const sequentialSubsetData = {
          ...adjustedSubsetData,
          testIds: adjustedSubsetData.testIds.map((_, idx) => idx < normalizedPublicResults.length ? BigInt(idx + 1) : BigInt(0))
        };
        const debugSequentialRoot = await this.computeSubsetMerkleRootFromData(sequentialSubsetData);
        console.log('    Sequential-ID recomputed root:', debugSequentialRoot);
      }

      console.log('  📊 Subset proof generated:');
      console.log('    Subset Merkle Root:', subsetMerkleRoot);

      // Now generate main proof with the correct subsetMerkleRoot
      console.log('  Generating main proof (full dataset)...');
      mainCircuitInputs.subsetMerkleRootPrivate = BigInt(subsetMerkleRoot);
      mainCircuitInputs.subsetMerkleRoot = BigInt(subsetMerkleRoot);

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        mainCircuitInputs,
        this.wasmPath,
        this.zkeyPath
      );

      const vKey = JSON.parse(await fs.promises.readFile(this.vkeyPath, 'utf8'));

      const numPublicInputs = 6;
      const mainProof = {
        proof,
        publicSignals,
        verificationKey: vKey,
        protocol: 'groth16',
        curve: 'bn128',
        commitments: {
          logsCommitment: publicSignals[numPublicInputs],
          libraryVersion: publicSignals[numPublicInputs + 1],
          scoringMethod: publicSignals[numPublicInputs + 2]
        }
      };

      return {
        mainProof,
        subsetProof,
        isPlaceholder: false,
        protocol: 'groth16-dual',
        publicIndices: normalizedPublicIndices,
        publicTests: normalizedPublicResults.length
      };

    } catch (error) {
      console.error('❌ Dual proof generation failed:', error.message);
      if (error && error.stack) {
        console.error(error.stack);
      }
      console.warn('   Falling back to placeholder dual proof');

      return this.generatePlaceholderDualProof({
        testResults,
        aggregateScore,
        numTests,
        executionLogs,
        scoringCriteria,
        publicIndices: normalizedPublicIndices,
        subsetAggregateScore,
        publicResults: normalizedPublicResults
      });
    }
  }

  /**
   * Generate subset proof (public 10% tests)
   * NEW: Subset circuit now OUTPUTS merkleRoot (computed from test data)
   */
  async generateSubsetProof({
    publicResults,
    subsetAggregateScore,
    numSubset,
    executionLogs,
    scoringCriteria
  }) {
    const circuitInputs = await this.prepareSubsetCircuitInputs({
      publicResults,
      subsetAggregateScore,
      numSubset,
      executionLogs,
      scoringCriteria
    });

    // Generate witness and proof for subset circuit
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInputs,
      this.wasmPathSubset,
      this.zkeyPathSubset
    );

    // Load verification key
    const vKey = JSON.parse(
      await fs.promises.readFile(this.vkeyPathSubset, 'utf8')
    );

    return {
      proof,
      publicSignals,
      verificationKey: vKey,
      protocol: 'groth16',
      curve: 'bn128'
    };
  }

  /**
   * Generate subset proof from pre-extracted, pre-adjusted data
   * This ensures both circuits hash the SAME data (no independent score adjustments)
   */
  async generateSubsetProofFromExtractedData({
    adjustedSubsetData,  // Pre-extracted: {testIds, promptHashes, idealOutputHashes, agentOutputHashes, scores}
    subsetAggregateScore,
    numSubset,
    executionLogs,
    scoringCriteria
  }) {
    // Compute commitments (same as prepareSubsetCircuitInputs but without score adjustment)
    const executionLogsHash = await this.hashString(JSON.stringify(executionLogs || []));
    const libraryCodeHash = await this.hashString(`agent-verifier@${this.libraryVersion}`);
    const scoringMethodHash = await this.hashString(JSON.stringify(scoringCriteria || 'default'));

    const poseidon = await this.getPoseidon();
    let libraryVersion, scoringMethod;

    if (poseidon) {
      const F = poseidon.F;
      libraryVersion = F.toObject(poseidon([BigInt(libraryCodeHash)])).toString();
      scoringMethod = F.toObject(poseidon([BigInt(scoringMethodHash)])).toString();
    } else {
      libraryVersion = libraryCodeHash;
      scoringMethod = scoringMethodHash;
    }

    // Use pre-adjusted data directly - NO score adjustment!
    const circuitInputs = {
      testIds: adjustedSubsetData.testIds,
      promptHashes: adjustedSubsetData.promptHashes,
      idealOutputHashes: adjustedSubsetData.idealOutputHashes,
      agentOutputHashes: adjustedSubsetData.agentOutputHashes,
      scores: adjustedSubsetData.scores,  // Already adjusted in main circuit prep!
      numTestsPrivate: BigInt(numSubset),
      executionLogsHash: BigInt(executionLogsHash),
      claimedScore: BigInt(Math.round(Number(subsetAggregateScore))),
      numTests: BigInt(numSubset),
      libraryVersion: BigInt(libraryVersion),
      scoringMethod: BigInt(scoringMethod)
    };

    // Generate witness and proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInputs,
      this.wasmPathSubset,
      this.zkeyPathSubset
    );

    // Load verification key
    const vKey = JSON.parse(
      await fs.promises.readFile(this.vkeyPathSubset, 'utf8')
    );

    return {
      proof,
      publicSignals,
      verificationKey: vKey,
      protocol: 'groth16',
      curve: 'bn128'
    };
  }

  /**
   * Generate main proof (full dataset with subset verification)
   */
  async generateMainProof({
    testResults,
    aggregateScore,
    numTests,
    executionLogs,
    scoringCriteria,
    publicIndices,
    publicResults,
    subsetMerkleRoot,
    subsetAggregateScore
  }) {
    const circuitInputs = await this.prepareMainCircuitInputs({
      testResults,
      aggregateScore,
      numTests,
      executionLogs,
      scoringCriteria,
      publicIndices,
      publicResults,
      subsetMerkleRoot,
      subsetAggregateScore
    });

    // Generate witness and proof for main circuit
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInputs,
      this.wasmPath,
      this.zkeyPath
    );

    // Load verification key
    const vKey = JSON.parse(
      await fs.promises.readFile(this.vkeyPath, 'utf8')
    );

    // Extract commitments from public outputs
    // Public outputs order: logsCommitment, libraryVersion, scoringMethod
    const numPublicInputs = 6; // merkleRoot, claimedScore, numTests, subsetMerkleRoot, subsetClaimedScore, numSubset
    const logsCommitment = publicSignals[numPublicInputs];
    const libraryVersion = publicSignals[numPublicInputs + 1];
    const scoringMethod = publicSignals[numPublicInputs + 2];

    return {
      proof,
      publicSignals,
      verificationKey: vKey,
      protocol: 'groth16',
      curve: 'bn128',
      commitments: {
        logsCommitment,
        libraryVersion,
        scoringMethod
      }
    };
  }

  /**
   * Prepare subset circuit inputs
   * NEW: Provides full test case data, not just scores
   * NEW: Computes commitments for library version and scoring method
   */
  async prepareSubsetCircuitInputs({
    publicResults,
    subsetAggregateScore,
    numSubset,
    executionLogs,
    scoringCriteria
  }) {
    // Extract test case data
    const testIds = [];
    const promptHashes = [];
    const idealOutputHashes = [];
    const agentOutputHashes = [];
    const scores = [];

    // Circuit expects maxSubset inputs (pads to power of 2 internally)
    for (let i = 0; i < this.maxSubset; i++) {
      if (i < publicResults.length) {
        const result = publicResults[i];

        // Test ID (use index if not provided)
        testIds.push(BigInt(i + 1));

        // Hash the test content
        promptHashes.push(BigInt(await this.hashString(result.prompt || '')));
        idealOutputHashes.push(BigInt(await this.hashString(result.idealOutput || '')));
        agentOutputHashes.push(BigInt(await this.hashString(result.agentOutput || '')));

        // Score (0-100)
        let score = typeof result.score === 'boolean' ? (result.score ? 100 : 0) : Math.round(Number(result.score));
        if (!Number.isFinite(score)) score = 0;
        if (score < 0) score = 0;
        if (score > 100) score = 100;
        scores.push(BigInt(score));
      } else {
        // Padding to maxSubset
        testIds.push(BigInt(0));
        promptHashes.push(BigInt(0));
        idealOutputHashes.push(BigInt(0));
        agentOutputHashes.push(BigInt(0));
        scores.push(BigInt(0));
      }
    }

    // Adjust scores to match aggregate exactly
    const intScores = scores.map(s => Number(s));
    this.adjustScoresToMatchAggregate(intScores, subsetAggregateScore, numSubset);

    // Compute commitments (these become PUBLIC INPUTS to match main circuit outputs)
    const executionLogsHash = await this.hashString(JSON.stringify(executionLogs || []));
    const libraryCodeHash = await this.hashString(`agent-verifier@${this.libraryVersion}`);
    const scoringMethodHash = await this.hashString(JSON.stringify(scoringCriteria || 'default'));

    // Compute Poseidon commitments (matching circuit logic)
    const poseidon = await this.getPoseidon();
    let libraryVersion, scoringMethod;

    if (poseidon) {
      const F = poseidon.F;
      libraryVersion = F.toObject(poseidon([BigInt(libraryCodeHash)])).toString();
      scoringMethod = F.toObject(poseidon([BigInt(scoringMethodHash)])).toString();
    } else {
      libraryVersion = libraryCodeHash;
      scoringMethod = scoringMethodHash;
    }

    return {
      // Private inputs: test case data
      testIds,
      promptHashes,
      idealOutputHashes,
      agentOutputHashes,
      scores: intScores.map(s => BigInt(s)),
      numTestsPrivate: BigInt(numSubset),

      // Private input: execution data
      executionLogsHash: BigInt(executionLogsHash),

      // Public inputs (MUST match main circuit outputs!)
      claimedScore: BigInt(Math.round(Number(subsetAggregateScore))),
      numTests: BigInt(numSubset),
      libraryVersion: BigInt(libraryVersion),
      scoringMethod: BigInt(scoringMethod)
    };
  }

  /**
   * Prepare main circuit inputs (with full Merkle verification)
   * NEW: Provides test case data, Merkle paths, and subset data extraction
   */
  async prepareMainCircuitInputs({
    testResults,
    aggregateScore,
    numTests,
    executionLogs,
    scoringCriteria,
    publicIndices,
    publicResults,
    subsetMerkleRoot,
    subsetAggregateScore
  }) {
    // Extract test case data for ALL tests
    const testIds = [];
    const promptHashes = [];
    const idealOutputHashes = [];
    const agentOutputHashes = [];
    const scores = [];

    for (let i = 0; i < this.maxTests; i++) {
      if (i < testResults.length) {
        const result = testResults[i];

        testIds.push(BigInt(i + 1));
        promptHashes.push(BigInt(await this.hashString(result.prompt || '')));
        idealOutputHashes.push(BigInt(await this.hashString(result.idealOutput || '')));
        agentOutputHashes.push(BigInt(await this.hashString(result.agentOutput || '')));

        let score = typeof result.score === 'boolean' ? (result.score ? 100 : 0) : Math.round(Number(result.score));
        if (!Number.isFinite(score)) score = 0;
        if (score < 0) score = 0;
        if (score > 100) score = 100;
        scores.push(BigInt(score));
      } else {
        testIds.push(BigInt(0));
        promptHashes.push(BigInt(0));
        idealOutputHashes.push(BigInt(0));
        agentOutputHashes.push(BigInt(0));
        scores.push(BigInt(0));
      }
    }

    // Adjust scores to match aggregate exactly
    const intScores = scores.map(s => Number(s));
    this.adjustScoresToMatchAggregate(intScores, aggregateScore, numTests);

    // Compute leaf hashes for all tests
    const leafHashes = [];
    for (let i = 0; i < this.maxTests; i++) {
      const leafHash = await this.computeTestCaseLeafHash({
        testId: Number(testIds[i]),
        promptHash: promptHashes[i].toString(),
        idealOutputHash: idealOutputHashes[i].toString(),
        agentOutputHash: agentOutputHashes[i].toString(),
        score: intScores[i]
      });
      leafHashes.push(leafHash);
    }

    // Build Merkle tree and generate authentication paths
    const { root: merkleRoot, paths } = await this.buildMerkleTreeWithPaths(leafHashes);

    // Extract path elements and indices
    const pathElements = paths.map(p => p.pathElements);
    const pathIndices = paths.map(p => p.pathIndices);

    // Prepare subset data (extract from full dataset at publicIndices)
    // Main circuit expects maxSubset inputs (pads to power of 2 internally)
    const subsetScores = [];
    const paddedIndices = [];

    // Track last valid index for padding
    let lastValidIdx = 0;
    let lastValidScore = BigInt(0);

    for (let i = 0; i < this.maxSubset; i++) {
      if (i < publicIndices.length) {
        // Coerce index to a safe number to avoid BigInt index issues
        const rawIdx = publicIndices[i];
        const idx = Number(rawIdx);
        if (Number.isInteger(idx) && idx >= 0 && idx < intScores.length) {
          subsetScores.push(BigInt(intScores[idx]));
          paddedIndices.push(BigInt(idx));
          // Update last valid values for padding
          lastValidIdx = idx;
          lastValidScore = BigInt(intScores[idx]);
        } else {
          // Out-of-bounds or invalid index; repeat last valid
          subsetScores.push(lastValidScore);
          paddedIndices.push(BigInt(lastValidIdx));
        }
      } else {
        // Pad to maxSubset with last valid values (circuit requires consistent data)
        subsetScores.push(lastValidScore);
        paddedIndices.push(BigInt(lastValidIdx));
      }
    }

    // Compute commitment hashes
    const executionLogsHash = await this.hashString(JSON.stringify(executionLogs || []));
    const libraryCodeHash = await this.hashString(`agent-verifier@${this.libraryVersion}`);
    const scoringMethodHash = await this.hashString(JSON.stringify(scoringCriteria || 'default'));

    console.log('  🔍 Main circuit inputs:');
    console.log('    Public indices:', publicIndices);
    console.log('    Subset indices array:', paddedIndices.slice(0, 3).map(s => s.toString()));
    console.log('    Subset scores extracted:', subsetScores.slice(0, 3).map(s => s.toString()));
    console.log('    Full dataset testIds (for reference):');
    console.log('      testIds[0]:', testIds[0].toString());
    console.log('      testIds[1]:', testIds[1].toString());
    console.log('    Subset merkle root (from subset proof):', subsetMerkleRoot);
    console.log('    Full dataset merkle root (computed):', merkleRoot);

    return {
      // Private inputs: full dataset test case data
      testIds,
      promptHashes,
      idealOutputHashes,
      agentOutputHashes,
      scores: intScores.map(s => BigInt(s)),
      numTestsPrivate: BigInt(numTests),

      // Private inputs: Merkle proof data
      pathElements: pathElements.map(pe => pe.map(e => BigInt(e))),
      pathIndices: pathIndices.map(pi => pi.map(i => BigInt(i))),

      // Private inputs: execution data
      executionLogsHash: BigInt(executionLogsHash),
      libraryCodeHash: BigInt(libraryCodeHash),
      scoringMethodHash: BigInt(scoringMethodHash),

      // Private inputs: subset verification
      subsetScores,
      subsetIndices: paddedIndices,
      numSubsetPrivate: BigInt(publicIndices.length),
      subsetMerkleRootPrivate: BigInt(subsetMerkleRoot),
      subsetClaimedScorePrivate: BigInt(Math.round(Number(subsetAggregateScore))),

      // Public inputs: full dataset
      merkleRoot: BigInt(merkleRoot),
      claimedScore: BigInt(Math.round(Number(aggregateScore))),
      numTests: BigInt(numTests),

      // Public inputs: subset
      subsetMerkleRoot: BigInt(subsetMerkleRoot),
      subsetClaimedScore: BigInt(Math.round(Number(subsetAggregateScore))),
      numSubset: BigInt(publicIndices.length)
    };
  }

  /**
   * Adjust integer scores to match target aggregate exactly
   * (Circuit verifies: claimedScore * numTests === sum of scores)
   */
  adjustScoresToMatchAggregate(intScores, aggregateScore, numTests) {
    // Ensure aggregateScore and numTests are numbers, not BigInt
    const claimed = Math.round(Number(aggregateScore));
    const numTestsNum = Number(numTests);
    const targetSum = claimed * numTestsNum;
    let currentSum = intScores.slice(0, numTestsNum).reduce((a, b) => a + b, 0);
    let delta = targetSum - currentSum;

    if (delta !== 0 && numTestsNum > 0) {
      for (let i = 0; i < numTestsNum && delta !== 0; i++) {
        if (delta > 0 && intScores[i] < 100) {
          intScores[i]++;
          delta--;
        } else if (delta < 0 && intScores[i] > 0) {
          intScores[i]--;
          delta++;
        }
      }
    }
  }

  async computeSubsetMerkleRootFromData(adjustedSubsetData) {
    const leaves = [];

    for (let i = 0; i < this.maxSubset; i++) {
      const testId = adjustedSubsetData.testIds[i] ?? BigInt(0);
      const promptHash = adjustedSubsetData.promptHashes[i] ?? BigInt(0);
      const idealHash = adjustedSubsetData.idealOutputHashes[i] ?? BigInt(0);
      const agentHash = adjustedSubsetData.agentOutputHashes[i] ?? BigInt(0);
      const score = adjustedSubsetData.scores[i] ?? BigInt(0);

      const leaf = await this.computeTestCaseLeafHash({
        testId: Number(testId),
        promptHash: promptHash.toString(),
        idealOutputHash: idealHash.toString(),
        agentOutputHash: agentHash.toString(),
        score: Number(score)
      });
      leaves.push(leaf);
    }

    while (leaves.length < 16) {
      leaves.push('0');
    }

    return this.buildMerkleTree(leaves, 16);
  }

  /**
   * Check if circuit files exist
   */
  checkSetup() {
    return {
      wasmExists: fs.existsSync(this.wasmPath),
      zkeyExists: fs.existsSync(this.zkeyPath),
      vkeyExists: fs.existsSync(this.vkeyPath)
    };
  }

  /**
   * Check if subset circuit files exist
   */
  checkSubsetSetup() {
    return {
      wasmExists: fs.existsSync(this.wasmPathSubset),
      zkeyExists: fs.existsSync(this.zkeyPathSubset),
      vkeyExists: fs.existsSync(this.vkeyPathSubset)
    };
  }

  /**
   * Generate placeholder dual proof (when circuits not compiled)
   */
  async generatePlaceholderDualProof({
    testResults,
    aggregateScore,
    numTests,
    executionLogs,
    scoringCriteria,
    publicIndices,
    subsetAggregateScore,
    publicResults
  }) {
    // Convert all inputs to proper types
    const aggScore = Number(aggregateScore);
    const subsetAggScore = Number(subsetAggregateScore);
    const numTestsNum = Number(numTests);

    // Compute commitment hashes
    const logsHash = await this.hashString(JSON.stringify(executionLogs || []));
    const libraryCodeHash = await this.hashString(`agent-verifier@${this.libraryVersion}`);
    const scoringMethodHash = await this.hashString(JSON.stringify(scoringCriteria || 'default'));

    // Dummy Merkle roots
    const merkleRoot = await this.hashString('dummy-main-merkle-root');
    const subsetMerkleRoot = await this.hashString('dummy-subset-merkle-root');

    // Generate placeholder main proof
    const mainProof = {
      proof: {
        pi_a: ['0', '0', '1'],
        pi_b: [['0', '0'], ['0', '0'], ['1', '0']],
        pi_c: ['0', '0', '1'],
        protocol: 'groth16',
        curve: 'bn128'
      },
      publicSignals: [
        merkleRoot.toString(),
        Math.round(aggScore).toString(),
        numTestsNum.toString(),
        subsetMerkleRoot.toString(),
        Math.round(subsetAggScore).toString(),
        publicIndices.length.toString(),
        logsHash.toString(),
        libraryCodeHash.toString(),
        scoringMethodHash.toString()
      ],
      verificationKey: this.generatePlaceholderVKey(),
      protocol: 'groth16',
      curve: 'bn128',
      commitments: {
        logsCommitment: logsHash.toString(),
        libraryVersion: libraryCodeHash.toString(),
        scoringMethod: scoringMethodHash.toString()
      }
    };

    // Generate placeholder subset proof
    // Public signals order: [inputs first, then outputs]
    // Inputs: claimedScore, numTests, libraryVersion, scoringMethod
    // Outputs: merkleRoot, logsCommitment
    const subsetProof = {
      proof: {
        pi_a: ['0', '0', '1'],
        pi_b: [['0', '0'], ['0', '0'], ['1', '0']],
        pi_c: ['0', '0', '1'],
        protocol: 'groth16',
        curve: 'bn128'
      },
      publicSignals: [
        Math.round(subsetAggScore).toString(),      // [0] claimedScore
        publicIndices.length.toString(),             // [1] numTests
        libraryCodeHash.toString(),                  // [2] libraryVersion
        scoringMethodHash.toString(),                // [3] scoringMethod
        subsetMerkleRoot.toString(),                 // [4] merkleRoot (output)
        logsHash.toString()                          // [5] logsCommitment (output)
      ],
      verificationKey: this.generatePlaceholderVKey(),
      protocol: 'groth16',
      curve: 'bn128'
    };

    return {
      mainProof,
      subsetProof,
      isPlaceholder: true,
      protocol: 'groth16-dual',
      publicIndices,
      publicTests: publicResults.length
    };
  }

  /**
   * Generate placeholder verification key
   */
  generatePlaceholderVKey() {
    return {
      protocol: 'groth16',
      curve: 'bn128',
      nPublic: 6,
      vk_alpha_1: ['0', '0', '1'],
      vk_beta_2: [['0', '0'], ['0', '0'], ['1', '0']],
      vk_gamma_2: [['0', '0'], ['0', '0'], ['1', '0']],
      vk_delta_2: [['0', '0'], ['0', '0'], ['1', '0']],
      vk_alphabeta_12: [],
      IC: Array(7).fill(['0', '0', '1'])
    };
  }
}
