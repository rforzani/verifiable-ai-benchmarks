import { binaryPrompt } from './prompts/binaryPrompt.js';

/**
 * Binary Scorer
 * Evaluates agent output as PASS (true) or FAIL (false)
 */
export class BinaryScorer {
  constructor(scorerAI) {
    this.scorerAI = scorerAI;
  }

  /**
   * Score agent output using binary evaluation
   * @param {object} params - Scoring parameters
   * @param {string} params.agentOutput - Agent's output
   * @param {string} params.idealOutput - Expected/ideal output
   * @param {string} params.criteria - Evaluation criteria (optional)
   * @returns {Promise<boolean>} true for PASS, false for FAIL
   */
  async score({ agentOutput, idealOutput, criteria }) {
    // Default criteria if not provided
    const evaluationCriteria = criteria ||
      'Does the agent output functionally achieve the same goal as the ideal output?';

    // Build prompt
    const prompt = binaryPrompt({
      agentOutput,
      idealOutput,
      criteria: evaluationCriteria
    });

    // Call AI for evaluation
    const response = await this.scorerAI.callAI(
      prompt,
      'You are an impartial evaluator of AI agent outputs. Be strict but fair in your assessments.'
    );

    // Parse response
    return this.parseResponse(response);
  }

  /**
   * Parse AI response to extract PASS/FAIL
   * @param {string} response - AI response text
   * @returns {boolean} true for PASS, false for FAIL
   * @throws {Error} If response cannot be parsed
   */
  parseResponse(response) {
    const normalized = response.trim().toUpperCase();

    // Check for PASS
    if (normalized === 'PASS' || normalized.includes('PASS')) {
      return true;
    }

    // Check for FAIL
    if (normalized === 'FAIL' || normalized.includes('FAIL')) {
      return false;
    }

    // If neither, throw error
    throw new Error(
      `Could not parse binary scorer response. Expected "PASS" or "FAIL", got: "${response}"`
    );
  }
}
