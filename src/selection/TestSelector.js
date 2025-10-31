import crypto from 'crypto';

/**
 * Test Selector
 *
 * Deterministically selects a public subset of tests (5%, minimum 1) from a test suite.
 * Selection is reproducible - same test suite always produces same selection.
 *
 * Algorithm:
 * 1. Create deterministic seed from sorted test IDs
 * 2. Calculate 5% of test count (minimum 1)
 * 3. Use seed-based random selection to pick tests
 * 4. Return selected indices in sorted order
 */
export class TestSelector {
  /**
   * @param {Array} testSuite - Array of test cases
   * @param {Object} config - Configuration options
   */
  constructor(testSuite, config = {}) {
    if (!testSuite || testSuite.length === 0) {
      throw new Error('Test suite must contain at least one test');
    }

    this.testSuite = testSuite;
    this.publicPercentage = config.publicPercentage || 0.05; // 5% default
    this.minimumPublic = config.minimumPublic || 1;

    // Validate configuration
    if (this.publicPercentage <= 0 || this.publicPercentage > 1) {
      throw new Error('publicPercentage must be between 0 and 1');
    }
  }

  /**
   * Select public subset of tests deterministically
   * @returns {Object} { publicTests, privateTests, publicIndices }
   */
  select() {
    // Calculate how many tests should be public
    const publicCount = this.calculatePublicCount();

    // Generate deterministic seed from test suite
    const seed = this.generateSeed();

    // Select test indices deterministically
    const publicIndices = this.selectIndices(seed, publicCount);

    // Split tests into public and private
    const publicTests = publicIndices.map(i => this.testSuite[i]);
    const privateIndices = Array.from(
      { length: this.testSuite.length },
      (_, i) => i
    ).filter(i => !publicIndices.includes(i));
    const privateTests = privateIndices.map(i => this.testSuite[i]);

    return {
      publicTests,
      privateTests,
      publicIndices,
      privateIndices,
      publicCount,
      totalCount: this.testSuite.length,
      publicPercentage: (publicCount / this.testSuite.length * 100).toFixed(1)
    };
  }

  /**
   * Calculate number of public tests (5% with minimum of 1)
   * @returns {number}
   * @private
   */
  calculatePublicCount() {
    const calculated = Math.ceil(this.testSuite.length * this.publicPercentage);
    return Math.max(this.minimumPublic, calculated);
  }

  /**
   * Generate deterministic seed from test suite
   * Uses SHA-256 hash of sorted test IDs
   * @returns {string} Hex seed
   * @private
   */
  generateSeed() {
    // Sort test IDs to ensure consistent ordering
    const sortedIds = this.testSuite
      .map(test => test.id)
      .sort();

    // Create seed by hashing concatenated IDs
    const concatenated = sortedIds.join('|');
    const hash = crypto.createHash('sha256').update(concatenated).digest('hex');

    return hash;
  }

  /**
   * Select test indices using deterministic random algorithm
   * @param {string} seed - Hex seed for randomization
   * @param {number} count - Number of indices to select
   * @returns {Array<number>} Sorted array of selected indices
   * @private
   */
  selectIndices(seed, count) {
    const selected = new Set();
    let currentSeed = seed;

    // Keep generating until we have enough unique indices
    while (selected.size < count) {
      // Hash current seed to get next random value
      currentSeed = crypto.createHash('sha256').update(currentSeed).digest('hex');

      // Convert first 8 hex chars to number, modulo test suite length
      const randomValue = parseInt(currentSeed.substring(0, 8), 16);
      const index = randomValue % this.testSuite.length;

      selected.add(index);
    }

    // Return sorted indices for consistent ordering
    return Array.from(selected).sort((a, b) => a - b);
  }

  /**
   * Verify that a given selection matches what would be generated
   * Useful for proving selection fairness
   * @param {Array<number>} claimedIndices - Indices claimed to be selected
   * @returns {boolean} True if selection is valid
   */
  verifySelection(claimedIndices) {
    const { publicIndices } = this.select();

    if (claimedIndices.length !== publicIndices.length) {
      return false;
    }

    // Check all indices match
    const sorted = [...claimedIndices].sort((a, b) => a - b);
    return publicIndices.every((idx, i) => idx === sorted[i]);
  }

  /**
   * Get seed for debugging/verification purposes
   * @returns {string} Hex seed
   */
  getSeed() {
    return this.generateSeed();
  }
}
