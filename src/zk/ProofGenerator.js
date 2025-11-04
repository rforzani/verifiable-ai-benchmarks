import * as snarkjs from 'snarkjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {
  getPoseidon,
  identifierToField,
  poseidonHash,
  poseidonLeaf,
  sha256Field,
  toFieldElement
} from '../utils/poseidon.js';
import { deterministicStringify, sha256Hex } from '../utils/crypto.js';

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
    this.maxTests = config.maxTests || 1000;
    this.maxSubset = config.maxSubset || 50;
    this.merkleTreeDepth = config.merkleTreeDepth || 10;
    if (config.subsetTreeDepth && config.subsetTreeCapacity) {
      this.subsetTreeDepth = config.subsetTreeDepth;
      this.subsetTreeCapacity = config.subsetTreeCapacity;
    } else {
      let depth = 0;
      let capacity = 1;
      while (capacity < this.maxSubset) {
        capacity <<= 1;
        depth += 1;
      }
      this.subsetTreeDepth = depth;
      this.subsetTreeCapacity = capacity;
    }
    this.libraryVersion = config.libraryVersion || '1.0.0';
    this._cachedLibraryHash = null;
  }

  async computeMethodologyCommitments({ executionLogs, scoringCriteria }) {
    const executionLogsHash = this.computeExecutionLogsHash(executionLogs);
    const scoringMethodHash = this.computeScoringMethodHash(scoringCriteria);
    const libraryCodeHash = await this.computeLibraryCodeHash();

    return {
      executionLogsHash,
      scoringMethodHash,
      libraryCodeHash
    };
  }

  computeExecutionLogsHash(executionLogs) {
    return sha256Field(deterministicStringify(executionLogs || [])).toString();
  }

  computeScoringMethodHash(scoringCriteria) {
    return sha256Field(deterministicStringify(scoringCriteria || [])).toString();
  }

  async computeLibraryCodeHash() {
    if (this._cachedLibraryHash) {
      return this._cachedLibraryHash;
    }

    const manifest = await this._buildLibraryManifest();
    const manifestPayload = deterministicStringify(manifest);
    const libraryHash = sha256Field(manifestPayload).toString();

    this._cachedLibraryHash = libraryHash;
    return libraryHash;
  }

  async _buildLibraryManifest() {
    const projectRoot = path.join(__dirname, '../..');
    const includeDirs = ['src'];
    const includeFiles = ['package.json', 'package-lock.json'];
    const files = [];

    for (const dir of includeDirs) {
      const absDir = path.join(projectRoot, dir);
      await this._collectFiles(absDir, files);
    }

    for (const rel of includeFiles) {
      const absPath = path.join(projectRoot, rel);
      if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
        files.push(absPath);
      }
    }

    files.sort();

    const manifest = [];
    for (const absPath of files) {
      const content = await fs.promises.readFile(absPath);
      manifest.push({
        path: path.relative(projectRoot, absPath).replace(/\\/g, '/'),
        hash: sha256Hex(content)
      });
    }

    return manifest;
  }

  async _collectFiles(currentPath, accumulator) {
    if (!fs.existsSync(currentPath)) {
      return;
    }

    const stats = await fs.promises.stat(currentPath);
    if (stats.isDirectory()) {
      const entries = await fs.promises.readdir(currentPath);
      for (const entry of entries) {
        if (this._shouldExclude(entry)) {
          continue;
        }
        await this._collectFiles(path.join(currentPath, entry), accumulator);
      }
    } else if (stats.isFile()) {
      accumulator.push(currentPath);
    }
  }

  _shouldExclude(entryName) {
    const excluded = new Set([
      'node_modules',
      'dist',
      'build',
      '.git',
      '.cache',
      '.idea',
      '.vscode',
      '__pycache__',
      '.DS_Store'
    ]);
    if (excluded.has(entryName)) {
      return true;
    }
    if (entryName.startsWith('.')) {
      return true;
    }
    return false;
  }

  async hashString(str) {
    return sha256Field(str ?? '').toString();
  }

  /**
   * Compute test case leaf hash: Poseidon(testId, promptHash, idealOutputHash, agentOutputHash, score)
   * Matches TestCaseLeafHash template in circuits
   */
  async computeTestCaseLeafHash({ testId, promptHash, idealOutputHash, agentOutputHash, score }) {
    const hash = await poseidonLeaf({
      testId,
      promptHash,
      idealOutputHash,
      agentOutputHash,
      score
    });
    return hash.toString();
  }

  /**
   * Build Merkle tree from leaf hashes (pad to 16 for subset, stay at maxTests for main)
   * Returns root hash
   */
  async buildMerkleTree(leaves, targetSize = 16) {
    const poseidon = await getPoseidon();
    const F = poseidon.F;

    // Pad leaves to target size
    const paddedLeaves = [...leaves];
    let desiredSize = Number.isInteger(targetSize) && targetSize > 0
      ? targetSize
      : (paddedLeaves.length > 0 ? paddedLeaves.length : 1);

    if (paddedLeaves.length > desiredSize) {
      desiredSize = paddedLeaves.length;
    }

    if ((desiredSize & (desiredSize - 1)) !== 0) {
      let powerOfTwo = 1;
      while (powerOfTwo < desiredSize) {
        powerOfTwo <<= 1;
      }
      desiredSize = powerOfTwo;
    }

    while (paddedLeaves.length < desiredSize) {
      paddedLeaves.push('0');
    }

    // Build tree level by level
    let currentLevel = paddedLeaves.map(leaf => toFieldElement(leaf));

    while (currentLevel.length > 1) {
      const nextLevel = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : currentLevel[i];

        const parentHash = poseidon([left, right]);
        nextLevel.push(F.toObject(parentHash));
      }

      currentLevel = nextLevel;
    }

    return toFieldElement(currentLevel[0]).toString();
  }

  /**
   * Build Merkle tree and generate authentication paths for verification
   * Returns { root, paths } where paths[i] = { pathElements, pathIndices }
   * @param leaves - Array of leaf values
   * @param depth - Tree depth (default: this.merkleTreeDepth for main circuit, use 4 for subset)
   */
  async buildMerkleTreeWithPaths(leaves, depth = null) {
    const treeDepth = depth !== null ? depth : this.merkleTreeDepth;
    const poseidon = await getPoseidon();
    const F = poseidon.F;

    // Pad to next power of 2
    const targetSize = Math.pow(2, treeDepth);
    const paddedLeaves = [...leaves].map(value => toFieldElement(value));
    while (paddedLeaves.length < targetSize) {
      paddedLeaves.push(0n);
    }

    // Build tree and store all levels
    const tree = [paddedLeaves];

    let currentLevel = tree[0];
    while (currentLevel.length > 1) {
      const nextLevel = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : currentLevel[i];
        const parentHash = poseidon([left, right]);
        nextLevel.push(F.toObject(parentHash));
      }

      tree.push(nextLevel);
      currentLevel = nextLevel;
    }

    // Convert root to string - use F.toObject() to get clean BigInt, then toString()
    const rootElement = toFieldElement(tree[tree.length - 1][0]);
    const root = rootElement.toString();

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
        const siblingElement = toFieldElement(sibling);
        pathElements.push(siblingElement.toString());
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
    aggregateScore,       // Sum of per-test scores for full dataset
    numTests,             // Total number of tests
    executionLogs,        // Execution logs
    scoringCriteria,      // Scoring method
    publicIndices,        // Which tests are public (10%)
    publicResults,        // Results for public tests (with full data)
    subsetAggregateScore  // Sum of per-test scores for public subset
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
      const methodologyCommitments = await this.computeMethodologyCommitments({
        executionLogs,
        scoringCriteria
      });

      // CRITICAL FIX: Prepare main circuit inputs FIRST to get adjusted scores
      // Then extract subset data from the adjusted full dataset
      console.log('  Preparing main circuit inputs (adjusting scores)...');

      const mainCircuitInputs = await this.prepareMainCircuitInputs({
        testResults,
        aggregateScore,
        numTests,
        publicIndices: normalizedPublicIndices,
        publicResults: normalizedPublicResults,
        subsetMerkleRoot: '0', // Dummy value, will be replaced
        subsetAggregateScore,
        commitments: methodologyCommitments
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
      // Use deterministic padding to avoid artificial duplicates in Merkle tree
      const validLength = adjustedSubsetData.testIds.length;
      while (adjustedSubsetData.testIds.length < this.maxSubset) {
        const fallbackIndex = validLength > 0 ? validLength - 1 : 0;
        adjustedSubsetData.testIds.push(
          validLength > 0 ? adjustedSubsetData.testIds[fallbackIndex] : BigInt(0)
        );
        adjustedSubsetData.promptHashes.push(
          validLength > 0 ? adjustedSubsetData.promptHashes[fallbackIndex] : BigInt(0)
        );
        adjustedSubsetData.idealOutputHashes.push(
          validLength > 0 ? adjustedSubsetData.idealOutputHashes[fallbackIndex] : BigInt(0)
        );
        adjustedSubsetData.agentOutputHashes.push(
          validLength > 0 ? adjustedSubsetData.agentOutputHashes[fallbackIndex] : BigInt(0)
        );
        adjustedSubsetData.scores.push(
          validLength > 0 ? adjustedSubsetData.scores[fallbackIndex] : BigInt(0)
        );
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
        commitments: methodologyCommitments
      });

      subsetProof.publicSignals = subsetProof.publicSignals.map(x => x.toString());
      console.log('    Subset proof public signals:', subsetProof.publicSignals);

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
      const mainPublicSignals = publicSignals.map(signal => signal.toString());
      const numPublicInputs = 6;

      const mainProof = {
        proof,
        publicSignals: mainPublicSignals,
        verificationKey: vKey,
        protocol: 'groth16',
        curve: 'bn128',
        commitments: {
          logsCommitment: mainPublicSignals[numPublicInputs],
          libraryVersion: mainPublicSignals[numPublicInputs + 1],
          scoringMethod: mainPublicSignals[numPublicInputs + 2]
        }
      };

      const commitments = {
        fullMerkleRoot: mainPublicSignals[0],
        subsetMerkleRoot: subsetMerkleRoot.toString(),
        logsCommitment: mainProof.commitments.logsCommitment,
        libraryVersion: mainProof.commitments.libraryVersion,
        scoringMethod: mainProof.commitments.scoringMethod,
        executionLogsHash: methodologyCommitments.executionLogsHash,
        libraryCodeHash: methodologyCommitments.libraryCodeHash,
        scoringMethodHash: methodologyCommitments.scoringMethodHash
      };

      return {
        mainProof,
        subsetProof: {
          ...subsetProof,
          publicSignals: subsetProof.publicSignals
        },
        isPlaceholder: false,
        protocol: 'groth16-dual',
        publicIndices: normalizedPublicIndices,
        publicTests: normalizedPublicResults.length,
        commitments,
        aggregates: {
          fullClaim: mainCircuitInputs.claimedScore.toString(),
          subsetClaim: mainCircuitInputs.subsetClaimedScore.toString(),
          totalTests: numTests.toString(),
          subsetTests: normalizedPublicResults.length.toString()
        }
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
    commitments
  }) {
    const circuitInputs = await this.prepareSubsetCircuitInputs({
      publicResults,
      subsetAggregateScore,
      numSubset,
      commitments
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
    commitments
  }) {
    const { executionLogsHash, libraryCodeHash, scoringMethodHash } = commitments;

    const libraryVersion = (await poseidonHash([libraryCodeHash])).toString();
    const scoringMethod = (await poseidonHash([scoringMethodHash])).toString();

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

    // Debug: Validate circuit inputs before sending
    console.log('  🔍 Subset circuit inputs validation:');
    console.log('    numTests:', circuitInputs.numTests.toString());
    console.log('    claimedScore:', circuitInputs.claimedScore.toString());
    console.log('    subsetAggregateScore (raw):', subsetAggregateScore);
    console.log('    All scores:', adjustedSubsetData.scores.map(s => s.toString()));

    // Manually compute expected sumScores (circuit logic: sum only first numTests scores)
    let expectedSum = 0;
    for (let i = 0; i < Number(circuitInputs.numTests) && i < adjustedSubsetData.scores.length; i++) {
      expectedSum += Number(adjustedSubsetData.scores[i]);
    }
    const claimedSum = Number(circuitInputs.claimedScore);
    console.log('    Expected sumScores (first', circuitInputs.numTests.toString(), 'scores):', expectedSum);
    console.log('    Claimed sum:', claimedSum);
    console.log('    Match:', expectedSum === claimedSum ? '✓' : '✗ MISMATCH!');

    if (expectedSum !== claimedSum) {
      console.error('    ⚠️  Circuit assertion will fail!');
      console.error('    This means: subsetAggregateScore does not equal the sum of actual scores');
      console.error('    Either the aggregate score calculation is wrong, or the score data is inconsistent');
    }

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
    const commitments = await this.computeMethodologyCommitments({
      executionLogs,
      scoringCriteria
    });

    const circuitInputs = await this.prepareMainCircuitInputs({
      testResults,
      aggregateScore,
      numTests,
      publicIndices,
      publicResults,
      subsetMerkleRoot,
      subsetAggregateScore,
      commitments
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
    commitments
  }) {
    const { executionLogsHash, libraryCodeHash, scoringMethodHash } = commitments;

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

        const identifier = result.testId ?? result.id ?? i + 1;
        testIds.push(identifierToField(identifier));

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
        testIds.push(0n);
        promptHashes.push(BigInt(0));
        idealOutputHashes.push(BigInt(0));
        agentOutputHashes.push(BigInt(0));
        scores.push(BigInt(0));
      }
    }

    // Convert to plain numbers for downstream processing
    const intScores = scores.map(s => Number(s));

    const libraryVersion = (await poseidonHash([libraryCodeHash])).toString();
    const scoringMethod = (await poseidonHash([scoringMethodHash])).toString();

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
    publicIndices,
    publicResults,
    subsetMerkleRoot,
    subsetAggregateScore,
    commitments
  }) {
    const { executionLogsHash, libraryCodeHash, scoringMethodHash } = commitments;
    // Extract test case data for ALL tests
    const testIds = [];
    const promptHashes = [];
    const idealOutputHashes = [];
    const agentOutputHashes = [];
    const scores = [];

    for (let i = 0; i < this.maxTests; i++) {
      if (i < testResults.length) {
        const result = testResults[i];

        const identifier = result.testId ?? result.id ?? i + 1;
        testIds.push(identifierToField(identifier));
        promptHashes.push(BigInt(await this.hashString(result.prompt || '')));
        idealOutputHashes.push(BigInt(await this.hashString(result.idealOutput || '')));
        agentOutputHashes.push(BigInt(await this.hashString(result.agentOutput || '')));

        let score = typeof result.score === 'boolean' ? (result.score ? 100 : 0) : Math.round(Number(result.score));
        if (!Number.isFinite(score)) score = 0;
        if (score < 0) score = 0;
        if (score > 100) score = 100;
        scores.push(BigInt(score));
      } else {
        testIds.push(0n);
        promptHashes.push(BigInt(0));
        idealOutputHashes.push(BigInt(0));
        agentOutputHashes.push(BigInt(0));
        scores.push(BigInt(0));
      }
    }

    // Adjust scores to match aggregate exactly
    const intScores = scores.map(s => Number(s));

    // Compute leaf hashes for all tests
    const leafHashes = [];
    for (let i = 0; i < this.maxTests; i++) {
      const leafHash = await this.computeTestCaseLeafHash({
        testId: testIds[i],
        promptHash: promptHashes[i],
        idealOutputHash: idealOutputHashes[i],
        agentOutputHash: agentOutputHashes[i],
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
          const scoreValue = intScores[idx];
          // Ensure score is a valid number, default to 0 if undefined/null
          const validScore = (scoreValue !== undefined && scoreValue !== null && Number.isFinite(scoreValue)) ? scoreValue : 0;
          subsetScores.push(BigInt(validScore));
          paddedIndices.push(BigInt(idx));
          // Update last valid values for padding
          lastValidIdx = idx;
          lastValidScore = BigInt(validScore);
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

    const subsetCapacity = this.subsetTreeCapacity || 1;
    while (leaves.length < subsetCapacity) {
      leaves.push('0');
    }

    return this.buildMerkleTree(leaves, subsetCapacity);
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
    const logsHash = this.computeExecutionLogsHash(executionLogs);
    const libraryCodeHash = await this.computeLibraryCodeHash();
    const scoringMethodHash = this.computeScoringMethodHash(scoringCriteria);

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

    const commitments = {
      fullMerkleRoot: merkleRoot.toString(),
      subsetMerkleRoot: subsetMerkleRoot.toString(),
      logsCommitment: logsHash.toString(),
      libraryVersion: libraryCodeHash.toString(),
      scoringMethod: scoringMethodHash.toString(),
      executionLogsHash: logsHash.toString(),
      libraryCodeHash: libraryCodeHash.toString(),
      scoringMethodHash: scoringMethodHash.toString()
    };

    return {
      mainProof,
      subsetProof,
      isPlaceholder: true,
      protocol: 'groth16-dual',
      publicIndices,
      publicTests: publicResults.length,
      commitments,
      aggregates: {
        fullClaim: Math.round(aggScore).toString(),
        subsetClaim: Math.round(subsetAggScore).toString(),
        totalTests: numTestsNum.toString(),
        subsetTests: publicResults.length.toString()
      }
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
