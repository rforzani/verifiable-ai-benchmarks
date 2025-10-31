import Anthropic from '@anthropic-ai/sdk';
import { BinaryScorer } from './BinaryScorer.js';
import { NumericScorer } from './NumericScorer.js';

/**
 * Scorer AI
 * Orchestrates AI-powered scoring of agent outputs
 * Uses Claude API to evaluate agent performance
 */
export class ScorerAI {
  constructor(config = {}) {
    this.apiKey = config.apiKey || config.anthropicApiKey;

    if (!this.apiKey) {
      throw new Error('API key required for ScorerAI. Provide apiKey or anthropicApiKey in config.');
    }

    this.model = config.model || 'claude-sonnet-4-5';
    this.client = new Anthropic({ apiKey: this.apiKey });

    // Initialize scorers
    this.binaryScorer = new BinaryScorer(this);
    this.numericScorer = new NumericScorer(this);

    // Configuration
    this.defaultScoringType = config.defaultScoringType || 'binary';
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * Score agent output using specified scoring type
   * @param {object} params - Scoring parameters
   * @param {string} params.agentOutput - Agent's output
   * @param {string} params.idealOutput - Expected/ideal output
   * @param {string} params.scoringType - 'binary' or 'numeric'
   * @param {string} params.criteria - Optional evaluation criteria
   * @returns {Promise<number|boolean>} Score (boolean for binary, number for numeric)
   */
  async score({ agentOutput, idealOutput, scoringType, criteria }) {
    const type = scoringType || this.defaultScoringType;

    // Retry logic for robustness
    let lastError = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        if (type === 'binary') {
          return await this.binaryScorer.score({
            agentOutput,
            idealOutput,
            criteria
          });
        } else if (type === 'numeric') {
          return await this.numericScorer.score({
            agentOutput,
            idealOutput,
            criteria
          });
        } else {
          throw new Error(`Unknown scoring type: ${type}. Must be 'binary' or 'numeric'`);
        }
      } catch (error) {
        lastError = error;

        // If it's a parsing error, retry
        if (error.message.includes('Could not parse')) {
          console.warn(`Scoring attempt ${attempt + 1} failed: ${error.message}. Retrying...`);
          continue;
        }

        // If it's an API error, throw immediately
        throw error;
      }
    }

    // If all retries failed
    throw new Error(
      `Failed to score after ${this.maxRetries} attempts. Last error: ${lastError.message}`
    );
  }

  /**
   * Call Claude API for evaluation
   * @param {string} prompt - Evaluation prompt
   * @param {string} systemPrompt - System prompt for Claude
   * @returns {Promise<string>} Claude's response text
   */
  async callAI(prompt, systemPrompt = '') {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt }
        ]
      });

      // Extract text from response
      if (response.content && response.content.length > 0) {
        return response.content[0].text;
      }

      throw new Error('Empty response from Claude API');

    } catch (error) {
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      if (error.status === 401) {
        throw new Error('Invalid API key for scorer.');
      }

      throw new Error(`Claude API error: ${error.message}`);
    }
  }

  /**
   * Batch score multiple outputs (optimization for future)
   * @param {Array} scoringTasks - Array of scoring task objects
   * @returns {Promise<Array>} Array of scores
   */
  async batchScore(scoringTasks) {
    // For now, score sequentially
    // Future: implement parallel scoring with rate limiting
    const scores = [];

    for (const task of scoringTasks) {
      const score = await this.score(task);
      scores.push(score);
    }

    return scores;
  }
}
