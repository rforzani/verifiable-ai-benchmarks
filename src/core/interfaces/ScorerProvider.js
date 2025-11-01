import { ProviderConfigError, ScoringError } from '../errors/index.js';

/**
 * ScorerProvider - Abstract Base Class
 *
 * Defines the interface that all scorer providers must implement.
 * Scorers can be AI-based (using LLMs), deterministic (rule-based), or human-in-the-loop.
 *
 * Contract:
 * - score() must return a number (0-100) for numeric scoring or boolean for binary scoring
 * - All scoring methods should be deterministic given the same inputs (for reproducibility)
 * - Errors should be wrapped in ScoringError
 * - Scorers should validate their config in the constructor
 *
 * @abstract
 */
export class ScorerProvider {
  /**
   * Create a scorer provider
   * @param {object} config - Provider-specific configuration
   */
  constructor(config = {}) {
    if (new.target === ScorerProvider) {
      throw new Error('ScorerProvider is abstract and cannot be instantiated directly');
    }
    this.config = config;
    this._validateConfig(config);
  }

  /**
   * Score agent output against ideal output
   *
   * @param {object} params - Scoring parameters
   * @param {string} params.agentOutput - Output produced by the agent
   * @param {string} params.idealOutput - Expected/ideal output
   * @param {string} params.scoringType - 'binary' or 'numeric'
   * @param {string} [params.criteria] - Optional evaluation criteria
   * @param {object} [params.metadata] - Optional test metadata
   * @returns {Promise<number|boolean>} Score (0-100 for numeric, true/false for binary)
   * @throws {ScoringError} If scoring fails
   *
   * @abstract
   */
  async score({ agentOutput, idealOutput, scoringType, criteria, metadata }) {
    throw new Error('ScorerProvider.score() must be implemented by subclass');
  }

  /**
   * Get scorer type for identification
   * @returns {string} Scorer type ('ai', 'deterministic', 'human', 'custom')
   * @abstract
   */
  getType() {
    throw new Error('ScorerProvider.getType() must be implemented by subclass');
  }

  /**
   * Get scorer name for logging
   * @returns {string} Scorer identifier
   * @abstract
   */
  getName() {
    throw new Error('ScorerProvider.getName() must be implemented by subclass');
  }

  /**
   * Get scorer version for reproducibility
   * @returns {string} Version string
   */
  getVersion() {
    return '1.0.0';
  }

  /**
   * Validate scorer configuration
   * Override this to add custom validation
   * @param {object} config - Configuration object
   * @throws {ProviderConfigError} If configuration is invalid
   * @protected
   */
  _validateConfig(config) {
    // Base validation - override in subclasses
    return true;
  }

  /**
   * Check if scorer supports a specific scoring type
   * @param {string} scoringType - 'binary' or 'numeric'
   * @returns {boolean} True if supported
   */
  supportsType(scoringType) {
    return ['binary', 'numeric'].includes(scoringType);
  }

  /**
   * Get scorer capabilities metadata
   * @returns {object} Capabilities object
   */
  getCapabilities() {
    return {
      supportsBinary: true,
      supportsNumeric: true,
      requiresApiKey: false,
      isDeterministic: true,
      averageLatency: 'unknown'
    };
  }

  /**
   * Optional: Batch score multiple outputs for efficiency
   * Default implementation scores sequentially
   *
   * @param {Array<object>} scoringTasks - Array of scoring parameter objects
   * @returns {Promise<Array<number|boolean>>} Array of scores
   */
  async batchScore(scoringTasks) {
    const scores = [];
    for (const task of scoringTasks) {
      const score = await this.score(task);
      scores.push(score);
    }
    return scores;
  }

  /**
   * Optional: Perform any necessary cleanup
   * @returns {Promise<void>}
   */
  async cleanup() {
    // Override if needed
  }

  /**
   * Optional: Health check to verify scorer is ready
   * @returns {Promise<boolean>} True if scorer is healthy
   */
  async healthCheck() {
    return true;
  }

  /**
   * Validate scoring type
   * @param {string} scoringType - Type to validate
   * @throws {ScoringError} If invalid
   * @protected
   */
  _validateScoringType(scoringType) {
    if (!['binary', 'numeric'].includes(scoringType)) {
      throw new ScoringError(
        `Invalid scoring type: "${scoringType}". Must be "binary" or "numeric"`,
        null,
        { scoringType }
      );
    }
  }

  /**
   * Validate score value
   * @param {number|boolean} score - Score to validate
   * @param {string} scoringType - Expected type
   * @throws {ScoringError} If invalid
   * @protected
   */
  _validateScore(score, scoringType) {
    if (scoringType === 'binary') {
      if (typeof score !== 'boolean') {
        throw new ScoringError(
          `Binary score must be boolean, got ${typeof score}`,
          null,
          { score, scoringType }
        );
      }
    } else if (scoringType === 'numeric') {
      if (typeof score !== 'number' || score < 0 || score > 100 || !Number.isFinite(score)) {
        throw new ScoringError(
          `Numeric score must be a number between 0-100, got ${score}`,
          null,
          { score, scoringType }
        );
      }
    }
  }

  /**
   * Convert scorer-specific errors to standard format
   * @param {Error} error - Original error
   * @param {string} testId - Test ID if available
   * @param {string} context - Context where error occurred
   * @returns {ScoringError}
   * @protected
   */
  _wrapError(error, testId = null, context = 'scoring') {
    return new ScoringError(
      `${this.getName()} scorer error during ${context}: ${error.message}`,
      testId,
      {
        originalError: error.message,
        scorer: this.getName(),
        context
      }
    );
  }
}
