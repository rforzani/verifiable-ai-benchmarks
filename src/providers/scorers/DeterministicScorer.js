import { ScorerProvider } from '../../core/interfaces/ScorerProvider.js';
import { ScoringError } from '../../core/errors/index.js';

/**
 * DeterministicScorer - Rule-Based Scoring Without AI
 *
 * Provides deterministic, reproducible scoring using algorithmic comparisons.
 * No API calls required - completely offline and fast.
 *
 * Scoring Methods:
 * - 'exact': Exact string matching
 * - 'substring': Check if ideal output is substring of agent output
 * - 'jaccard': Jaccard similarity (word-based)
 * - 'levenshtein': Levenshtein distance (character-based)
 * - 'token': Token overlap similarity
 *
 * @extends ScorerProvider
 */
export class DeterministicScorer extends ScorerProvider {
  /**
   * Create a deterministic scorer
   *
   * @param {object} [config={}] - Scorer configuration
   * @param {string} [config.method='jaccard'] - Scoring method
   * @param {boolean} [config.caseSensitive=false] - Case sensitive comparison
   * @param {boolean} [config.ignoreWhitespace=true] - Ignore whitespace differences
   * @param {number} [config.binaryThreshold=0.7] - Threshold for binary scoring (0-1)
   */
  constructor(config = {}) {
    super(config);

    this.method = config.method || 'jaccard';
    this.caseSensitive = config.caseSensitive !== undefined ? config.caseSensitive : false;
    this.ignoreWhitespace = config.ignoreWhitespace !== undefined ? config.ignoreWhitespace : true;
    this.binaryThreshold = config.binaryThreshold || 0.7;

    // Validate method
    const validMethods = ['exact', 'substring', 'jaccard', 'levenshtein', 'token'];
    if (!validMethods.includes(this.method)) {
      throw new Error(`Invalid scoring method: ${this.method}. Must be one of: ${validMethods.join(', ')}`);
    }
  }

  /**
   * Score agent output using deterministic algorithms
   *
   * @param {object} params - Scoring parameters
   * @returns {Promise<number|boolean>} Score
   */
  async score({ agentOutput, idealOutput, scoringType, criteria, metadata }) {
    this._validateScoringType(scoringType);

    try {
      // Normalize inputs
      const normalizedAgent = this._normalize(agentOutput);
      const normalizedIdeal = this._normalize(idealOutput);

      // Compute similarity (0-1)
      let similarity;
      switch (this.method) {
        case 'exact':
          similarity = normalizedAgent === normalizedIdeal ? 1 : 0;
          break;
        case 'substring':
          similarity = normalizedAgent.includes(normalizedIdeal) || normalizedIdeal.includes(normalizedAgent) ? 1 : 0;
          break;
        case 'jaccard':
          similarity = this._jaccardSimilarity(normalizedAgent, normalizedIdeal);
          break;
        case 'levenshtein':
          similarity = this._levenshteinSimilarity(normalizedAgent, normalizedIdeal);
          break;
        case 'token':
          similarity = this._tokenOverlap(normalizedAgent, normalizedIdeal);
          break;
        default:
          throw new Error(`Unknown method: ${this.method}`);
      }

      // Convert to appropriate score type
      if (scoringType === 'binary') {
        return similarity >= this.binaryThreshold;
      } else {
        const score = Math.round(similarity * 100);
        this._validateScore(score, scoringType);
        return score;
      }

    } catch (error) {
      throw this._wrapError(error, metadata?.testId, 'deterministic-scoring');
    }
  }

  /**
   * Normalize text for comparison
   * @private
   */
  _normalize(text) {
    let normalized = text;

    if (!this.caseSensitive) {
      normalized = normalized.toLowerCase();
    }

    if (this.ignoreWhitespace) {
      normalized = normalized.replace(/\s+/g, ' ').trim();
    }

    return normalized;
  }

  /**
   * Compute Jaccard similarity (word-based)
   * @private
   */
  _jaccardSimilarity(str1, str2) {
    const set1 = new Set(str1.split(/\s+/));
    const set2 = new Set(str2.split(/\s+/));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Compute Levenshtein similarity (character-based)
   * @private
   */
  _levenshteinSimilarity(str1, str2) {
    const distance = this._levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    if (maxLength === 0) return 1;
    return 1 - (distance / maxLength);
  }

  /**
   * Compute Levenshtein distance
   * @private
   */
  _levenshteinDistance(str1, str2) {
    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Compute token overlap similarity
   * @private
   */
  _tokenOverlap(str1, str2) {
    const tokens1 = str1.split(/\s+/).filter(t => t.length > 0);
    const tokens2 = str2.split(/\s+/).filter(t => t.length > 0);

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    // Count overlapping tokens
    const set2 = new Set(tokens2);
    const overlap = tokens1.filter(t => set2.has(t)).length;

    return (2 * overlap) / (tokens1.length + tokens2.length);
  }

  /**
   * Batch score multiple outputs efficiently
   * @param {Array<object>} scoringTasks - Array of scoring tasks
   * @returns {Promise<Array<number|boolean>>} Scores
   */
  async batchScore(scoringTasks) {
    // Deterministic scoring is fast, can process all at once
    return Promise.all(scoringTasks.map(task => this.score(task)));
  }

  /**
   * Get scorer type
   * @returns {string}
   */
  getType() {
    return 'deterministic';
  }

  /**
   * Get scorer name
   * @returns {string}
   */
  getName() {
    return `deterministic-${this.method}`;
  }

  /**
   * Get capabilities
   * @returns {object}
   */
  getCapabilities() {
    return {
      supportsBinary: true,
      supportsNumeric: true,
      requiresApiKey: false,
      isDeterministic: true,
      averageLatency: '<1ms'
    };
  }

  /**
   * Health check (always healthy - no external dependencies)
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    return true;
  }
}
