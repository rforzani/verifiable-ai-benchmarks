import { MerkleTree as MerkleTreeJS } from 'merkletreejs';
import { sha256, deterministicStringify } from '../utils/crypto.js';

/**
 * Merkle Tree for test suite commitment
 * Generates cryptographic proof of test suite integrity
 */
export class MerkleTree {
  constructor(testSuite) {
    this.testSuite = testSuite;
    this.leaves = [];
    this.tree = null;
    this.root = null;
    this.leafMap = new Map(); // testId -> leaf hash
  }

  /**
   * Hash a single test case deterministically
   * @param {object} test - Test case object
   * @returns {Buffer} SHA-256 hash of test case
   */
  hashTestCase(test) {
    // Only hash the fields that define the test
    // Don't include metadata as it's not part of verification
    const testData = {
      id: test.id,
      prompt: test.prompt,
      idealOutput: test.idealOutput,
      scoringType: test.scoringType
    };

    // Use deterministic serialization
    const serialized = deterministicStringify(testData);
    return sha256(serialized);
  }

  /**
   * Generate Merkle tree and compute root
   * @returns {string} Merkle root as hex string
   */
  generateRoot() {
    // Hash each test case to create leaves
    this.leaves = this.testSuite.map(test => {
      const leaf = this.hashTestCase(test);
      this.leafMap.set(test.id, leaf);
      return leaf;
    });

    // Build Merkle tree
    this.tree = new MerkleTreeJS(
      this.leaves,
      sha256,
      {
        sortPairs: true,  // Prevents second-preimage attacks
        hashLeaves: false // We already hashed the leaves
      }
    );

    // Get root as hex string
    this.root = this.tree.getRoot().toString('hex');

    return this.root;
  }

  /**
   * Get Merkle proof for a specific test case
   * @param {string} testId - Test case ID
   * @returns {Array} Merkle proof array
   */
  getProof(testId) {
    const leaf = this.leafMap.get(testId);

    if (!leaf) {
      throw new Error(`Test ID not found: ${testId}`);
    }

    return this.tree.getProof(leaf);
  }

  /**
   * Get Merkle proof formatted for ZK circuit
   * @param {string} testId - Test case ID
   * @returns {object} Proof formatted for circuit { elements, indices }
   */
  getProofForCircuit(testId) {
    const proof = this.getProof(testId);

    return {
      elements: proof.map(p => p.data.toString('hex')),
      indices: proof.map(p => p.position === 'left' ? 0 : 1)
    };
  }

  /**
   * Verify a Merkle proof
   * @param {Array} proof - Merkle proof
   * @param {Buffer} leaf - Leaf to verify
   * @param {string} root - Expected root (hex string)
   * @returns {boolean} True if proof is valid
   */
  verify(proof, leaf, root) {
    const rootBuffer = Buffer.from(root, 'hex');
    return this.tree.verify(proof, leaf, rootBuffer);
  }

  /**
   * Get leaf hash for a test case
   * @param {string} testId - Test case ID
   * @returns {Buffer} Leaf hash
   */
  getLeaf(testId) {
    return this.leafMap.get(testId);
  }

  /**
   * Get all leaves as hex strings
   * @returns {Array<string>} Array of leaf hashes
   */
  getLeavesHex() {
    return this.leaves.map(leaf => leaf.toString('hex'));
  }

  /**
   * Get tree depth (needed for circuit configuration)
   * @returns {number} Tree depth
   */
  getDepth() {
    if (!this.tree) {
      throw new Error('Tree not generated yet. Call generateRoot() first.');
    }
    return this.tree.getDepth();
  }

  /**
   * Get complete tree data for debugging
   * @returns {object} Tree statistics and data
   */
  getTreeInfo() {
    if (!this.tree) {
      throw new Error('Tree not generated yet. Call generateRoot() first.');
    }

    return {
      root: this.root,
      depth: this.getDepth(),
      leafCount: this.leaves.length,
      leaves: this.getLeavesHex()
    };
  }

  /**
   * Generate Merkle root for a subset of tests
   * Used for dual-proof system (public subset)
   * @param {Array} subsetTests - Subset of test cases
   * @returns {string} Merkle root as hex string
   */
  generateSubsetRoot(subsetTests) {
    if (!subsetTests || subsetTests.length === 0) {
      throw new Error('Subset must contain at least one test');
    }

    // Hash each test case in the subset
    const subsetLeaves = subsetTests.map(test => this.hashTestCase(test));

    // Build Merkle tree for subset
    const subsetTree = new MerkleTreeJS(
      subsetLeaves,
      sha256,
      {
        sortPairs: true,
        hashLeaves: false
      }
    );

    // Return root as hex string
    return subsetTree.getRoot().toString('hex');
  }

  /**
   * Generate dual Merkle roots (full + subset)
   * @param {Array} publicIndices - Indices of public tests in the full test suite
   * @returns {Object} { fullRoot, subsetRoot, publicTests }
   */
  generateDualRoots(publicIndices) {
    // Generate full root
    const fullRoot = this.generateRoot();

    // Validate and sort public indices to ensure consistent Merkle tree order
    // Check if indices are already sorted
    const isSorted = publicIndices.every((val, i, arr) => i === 0 || arr[i - 1] <= val);

    if (!isSorted) {
      console.warn('⚠️  Public indices not sorted, sorting to ensure consistent Merkle tree');
      publicIndices = [...publicIndices].sort((a, b) => a - b);
    }

    // Extract public tests in sorted order
    const publicTests = publicIndices.map(i => this.testSuite[i]);

    // Generate subset root
    const subsetRoot = this.generateSubsetRoot(publicTests);

    return {
      fullRoot,
      subsetRoot,
      publicTests,
      publicCount: publicTests.length,
      totalCount: this.testSuite.length
    };
  }

  /**
   * Verify that a subset root is valid for given tests
   * @param {Array} subsetTests - Subset of tests
   * @param {string} claimedRoot - Claimed Merkle root
   * @returns {boolean} True if root matches
   */
  verifySubsetRoot(subsetTests, claimedRoot) {
    const computedRoot = this.generateSubsetRoot(subsetTests);
    return computedRoot === claimedRoot;
  }
}
