import { numericPrompt } from './prompts/numericPrompt.js';

/**
 * Numeric Scorer
 * Evaluates agent output on a 0-100 scale
 */
export class NumericScorer {
  constructor(scorerAI) {
    this.scorerAI = scorerAI;
  }

  /**
   * Score agent output using numeric evaluation
   * @param {object} params - Scoring parameters
   * @param {string} params.agentOutput - Agent's output
   * @param {string} params.idealOutput - Expected/ideal output
   * @param {string} params.criteria - Evaluation criteria (optional)
   * @returns {Promise<number>} Score from 0-100
   */
  async score({ agentOutput, idealOutput, criteria }) {
    // Default criteria if not provided
    const evaluationCriteria = criteria ||
      'Evaluate based on correctness, completeness, and quality';

    // Build prompt
    const prompt = numericPrompt({
      agentOutput,
      idealOutput,
      criteria: evaluationCriteria
    });

    // Call AI for evaluation
    const response = await this.scorerAI.callAI(
      prompt,
      'You are an impartial evaluator of AI agent outputs. Provide precise numeric scores based on the rubric.'
    );

    // Parse response
    return this.parseResponse(response);
  }

  /**
   * Parse AI response to extract numeric score
   * @param {string} response - AI response text
   * @returns {number} Score from 0-100
   * @throws {Error} If response cannot be parsed or is out of range
   */
  parseResponse(response) {
    // Try to extract a number from the response
    const normalized = response.trim();

    // Try to parse as direct number
    let score = parseInt(normalized, 10);

    // If that didn't work, try to find a number in the text
    if (isNaN(score)) {
      const match = normalized.match(/\b(\d{1,3})\b/);
      if (match) {
        score = parseInt(match[1], 10);
      }
    }

    // Validate score
    if (isNaN(score)) {
      throw new Error(
        `Could not parse numeric score from response: "${response}"`
      );
    }

    if (score < 0 || score > 100) {
      throw new Error(
        `Score out of range (0-100): ${score}. Response was: "${response}"`
      );
    }

    return score;
  }
}
