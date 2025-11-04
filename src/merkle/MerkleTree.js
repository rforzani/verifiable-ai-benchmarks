import {
  getPoseidon,
  identifierToField,
  poseidonLeaf,
  sha256Field,
  toFieldElement
} from '../utils/poseidon.js';

/**
 * Spec-compliant Merkle tree for benchmark commitments.
 * Uses Poseidon hashing over the tuple:
 * (testId, promptHash, idealOutputHash, agentOutputHash, score)
 */
export class MerkleTree {
  constructor() {
    this.testResults = [];
    this.leaves = [];
    this.levels = [];
    this.root = null;
  }

  /**
   * Build the Merkle tree from executed test results.
   * @param {Array<object>} testResults - Results containing prompt, outputs, scores, etc.
   * @returns {Promise<string>} Merkle root as decimal string.
   */
  async build(testResults) {
    if (!Array.isArray(testResults) || testResults.length === 0) {
      throw new Error('Test results are required to build the Merkle tree');
    }

    this.testResults = testResults;
    this.leaves = await Promise.all(
      testResults.map((result, index) => this.computeLeaf(result, index))
    );

    await this.buildLevels(this.leaves);
    this.root = this.levels[this.levels.length - 1][0];
    return this.root.toString();
  }

  /**
   * Compute a single leaf hash per spec.
   * @param {object} result - Test execution result.
   * @param {number} index - Fallback index for missing identifiers.
   * @returns {Promise<bigint>}
   * @private
   */
  async computeLeaf(result, index) {
    const identifier = result.testId ?? result.id ?? index + 1;

    const testId = identifierToField(identifier);
    const promptHash = sha256Field(result.prompt ?? '');
    const idealOutputHash = sha256Field(result.idealOutput ?? '');
    const agentOutputHash = sha256Field(result.agentOutput ?? '');
    const score = this.normaliseScore(result);

    return poseidonLeaf({
      testId,
      promptHash,
      idealOutputHash,
      agentOutputHash,
      score
    });
  }

  /**
   * Build all Merkle levels from leaves.
   * @param {Array<bigint>} leaves
   * @returns {Promise<void>}
   * @private
   */
  async buildLevels(leaves) {
    const poseidon = await getPoseidon();
    const F = poseidon.F;

    let currentLevel = leaves.map(toFieldElement);
    const levels = [currentLevel];

    while (currentLevel.length > 1) {
      if (currentLevel.length % 2 === 1) {
        currentLevel = [...currentLevel, currentLevel[currentLevel.length - 1]];
      }

      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const parent = poseidon([currentLevel[i], currentLevel[i + 1]]);
        nextLevel.push(F.toObject(parent));
      }

      levels.push(nextLevel);
      currentLevel = nextLevel;
    }

    this.levels = levels;
  }

  /**
   * Get Merkle root as decimal string.
   * @returns {string}
   */
  getRoot() {
    if (!this.root) {
      throw new Error('Merkle tree has not been built yet');
    }
    return this.root.toString();
  }

  /**
   * Retrieve raw leaf hash by index (decimal string).
   * @param {number} index
   * @returns {string}
   */
  getLeaf(index) {
    if (!this.leaves.length) {
      throw new Error('Merkle tree has not been built yet');
    }
    return this.leaves[index]?.toString() ?? null;
  }

  /**
   * Build inclusion proof for a given index.
   * @param {number} index
   * @returns {Array<{element: string, index: number}>}
   */
  getProof(index) {
    if (!this.levels.length) {
      throw new Error('Merkle tree has not been built yet');
    }

    if (index < 0 || index >= this.leaves.length) {
      throw new Error(`Leaf index out of bounds: ${index}`);
    }

    const path = [];
    let currentIndex = index;

    for (let level = 0; level < this.levels.length - 1; level++) {
      const levelNodes = this.levels[level];
      const isLeft = currentIndex % 2 === 0;
      const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;
      const sibling = levelNodes[siblingIndex] ?? levelNodes[currentIndex];

      path.push({
        element: toFieldElement(sibling).toString(),
        index: isLeft ? 0 : 1 // Aligns with circuit expectation
      });

      currentIndex = Math.floor(currentIndex / 2);
    }

    return path;
  }

  /**
   * Provide proof formatted for circuit input.
   * @param {number} index
   * @returns {{elements: Array<string>, indices: Array<number>}}
   */
  getProofForCircuit(index) {
    const proof = this.getProof(index);
    return {
      elements: proof.map(p => p.element),
      indices: proof.map(p => p.index)
    };
  }

  /**
   * Compute Merkle root for a subset of results.
   * @param {Array<object>} subsetResults
   * @returns {Promise<string>}
   */
  async computeSubsetRoot(subsetResults) {
    if (!Array.isArray(subsetResults) || subsetResults.length === 0) {
      throw new Error('Subset must contain at least one result');
    }

    const subsetTree = new MerkleTree();
    return subsetTree.build(subsetResults);
  }

  /**
   * Enforce score normalisation (0-100 scale as integers).
   * @param {object} result
   * @returns {bigint}
   * @private
   */
  normaliseScore(result) {
    const raw = result?.score;
    let score;

    if (typeof raw === 'boolean') {
      score = raw ? 100 : 0;
    } else if (typeof raw === 'number') {
      score = Math.round(raw);
    } else if (typeof raw === 'string' && raw.trim() !== '') {
      score = Math.round(Number(raw));
    } else {
      score = 0;
    }

    if (!Number.isFinite(score)) score = 0;
    if (score < 0) score = 0;
    if (score > 100) score = 100;

    return BigInt(score);
  }
}
