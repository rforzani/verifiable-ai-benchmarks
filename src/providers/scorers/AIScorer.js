import { ScorerProvider } from '../../core/interfaces/ScorerProvider.js';
import { ProviderConfigError, ScoringError } from '../../core/errors/index.js';

/**
 * AIScorer - Multi-Provider AI-Based Scoring
 *
 * Uses LLM APIs (OpenAI, Anthropic, etc.) to evaluate agent outputs semantically.
 * Supports both binary (pass/fail) and numeric (0-100) scoring.
 *
 * Features:
 * - Multiple LLM provider support (openai, anthropic)
 * - Configurable evaluation prompts
 * - Retry logic for robustness
 * - Temperature control for determinism
 *
 * @extends ScorerProvider
 */
export class AIScorer extends ScorerProvider {
  /**
   * Create an AI scorer
   *
   * @param {object} config - Scorer configuration
   * @param {string} config.provider - LLM provider ('openai' or 'anthropic')
   * @param {string} config.apiKey - API key for the provider
   * @param {string} [config.model] - Model to use (provider-specific defaults)
   * @param {number} [config.temperature=0] - Temperature for scoring (0 for determinism)
   * @param {number} [config.maxRetries=3] - Maximum retries for parsing failures
   * @param {string} [config.baseURL] - Custom API base URL
   */
  constructor(config) {
    super(config);

    this.provider = config.provider;
    this.apiKey = config.apiKey;
    this.temperature = config.temperature !== undefined ? config.temperature : 0;
    this.maxRetries = config.maxRetries || 3;
    this.baseURL = config.baseURL;
    this.maxCompletionTokens = config.maxCompletionTokens || 32;

    // Set default models per provider
    this.model = config.model || this._getDefaultModel();

    // Lazy load client
    this._client = null;
  }

  /**
   * Get default model for provider
   * @private
   */
  _getDefaultModel() {
    switch (this.provider) {
      case 'openai':
        return 'gpt-5-mini';
      case 'anthropic':
        return 'claude-haiku-4-5';
      default:
        return 'claude-haiku-4-5';
    }
  }

  /**
   * Get LLM client (lazy initialization)
   * @private
   */
  async _getClient() {
    if (!this._client) {
      if (this.provider === 'openai') {
        const { default: OpenAI } = await import('openai');
        this._client = new OpenAI({
          apiKey: this.apiKey,
          baseURL: this.baseURL
        });
      } else if (this.provider === 'anthropic') {
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        this._client = new Anthropic({
          apiKey: this.apiKey
        });
      } else {
        throw new ProviderConfigError(
          `Unknown scorer provider: ${this.provider}`,
          { provider: this.provider }
        );
      }
    }
    return this._client;
  }

  /**
   * Score agent output using AI evaluation
   *
   * @param {object} params - Scoring parameters
   * @returns {Promise<number|boolean>} Score
   */
  async score({ agentOutput, idealOutput, scoringType, criteria, metadata }) {
    this._validateScoringType(scoringType);

    let lastError = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const prompt = this._buildScoringPrompt(agentOutput, idealOutput, scoringType, criteria);
        const response = await this._callLLM(prompt, scoringType);
        const score = this._parseScore(response, scoringType);

        this._validateScore(score, scoringType);
        return score;

      } catch (error) {
        lastError = error;

        // Retry on parsing errors
        if (error.message.includes('parse') && attempt < this.maxRetries - 1) {
          continue;
        }

        // Throw immediately on other errors
        throw this._wrapError(error, metadata?.testId, 'scoring');
      }
    }

    throw new ScoringError(
      `Failed to score after ${this.maxRetries} attempts: ${lastError.message}`,
      metadata?.testId,
      { attempts: this.maxRetries }
    );
  }

  /**
   * Build scoring prompt
   * @private
   */
  _buildScoringPrompt(agentOutput, idealOutput, scoringType, criteria) {
    if (scoringType === 'binary') {
      return `You are evaluating an AI agent's output.

Agent Output:
${agentOutput}

Ideal Output:
${idealOutput}

${criteria ? `Evaluation Criteria:\n${criteria}\n\n` : ''}
Does the agent output match the ideal output sufficiently?
Consider semantic meaning, not just exact text matching.

Respond with ONLY "PASS" or "FAIL".`;
    } else {
      return `You are evaluating an AI agent's output on a scale of 0-100.

Agent Output:
${agentOutput}

Ideal Output:
${idealOutput}

${criteria ? `Evaluation Criteria:\n${criteria}\n\n` : ''}
Rate how well the agent output matches the ideal output (0-100):
- 0: Completely wrong or irrelevant
- 50: Partially correct but missing key elements
- 100: Perfect match (semantically equivalent)

Respond with ONLY a number between 0 and 100.`;
    }
  }

  /**
   * Call LLM API
   * @private
   */
  async _callLLM(prompt, scoringType) {
    const client = await this._getClient();

    if (this.provider === 'openai') {
      const completion = await client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an objective evaluator. Provide concise, accurate assessments.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: this.temperature
      });

      const choice = completion.choices?.[0];
      const message = choice?.message;

      let content = this._extractAssistantText(message);

      if ((!content || content.trim().length === 0) && message?.tool_calls?.length) {
        for (const toolCall of message.tool_calls) {
          const argsRaw = toolCall.function?.arguments;
          if (!argsRaw) continue;
          try {
            const parsed = JSON.parse(argsRaw);
            const candidate = parsed?.score ?? parsed?.result ?? parsed?.decision;
            if (candidate !== undefined) {
              content = String(candidate);
              break;
            }
          } catch {
            // Ignore JSON parse errors for tool outputs
          }
        }
      }

      if (!content || content.trim().length === 0) {
        const finishReason = choice?.finish_reason || completion?.choices?.[0]?.finish_reason;
        throw new Error(
          `parse: Received empty response from OpenAI scorer (finish_reason: ${finishReason || 'unknown'})`
        );
      }

      return content.trim();

    } else if (this.provider === 'anthropic') {
      const response = await client.messages.create({
        model: this.model,
        temperature: this.temperature,
        system: 'You are an objective evaluator. Provide concise, accurate assessments.',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: this.maxCompletionTokens
      });

      return response.content[0].text.trim();
    }
  }

  /**
   * Extract assistant text from OpenAI chat completion message
   * Supports both string and content-part formats.
   * @private
   */
  _extractAssistantText(message) {
    if (!message) return '';

    if (typeof message.content === 'string') {
      return message.content;
    }

    if (Array.isArray(message.content)) {
      return message.content
        .map(part => {
          if (typeof part === 'string') return part;
          if (part && typeof part.text === 'string') return part.text;
          if (part && part.type === 'text' && typeof part.text === 'string') return part.text;
          if (part && part.type === 'output_text' && Array.isArray(part.content)) {
            return part.content
              .map(inner => (typeof inner?.text === 'string' ? inner.text : ''))
              .join('');
          }
          return '';
        })
        .join('');
    }

    return '';
  }

  /**
   * Parse score from LLM response
   * @private
   */
  _parseScore(response, scoringType) {
    if (scoringType === 'binary') {
      const normalized = response.toUpperCase();
      if (normalized.includes('PASS')) return true;
      if (normalized.includes('FAIL')) return false;

      throw new Error(`Could not parse binary score from: "${response}"`);
    } else {
      // Extract first number from response
      const match = response.match(/\d+/);
      if (!match) {
        throw new Error(`Could not parse numeric score from: "${response}"`);
      }

      const score = parseInt(match[0], 10);
      if (score < 0 || score > 100) {
        throw new Error(`Score out of range: ${score}`);
      }

      return score;
    }
  }

  /**
   * Validate configuration
   * @protected
   */
  _validateConfig(config) {
    if (!config.provider) {
      throw new ProviderConfigError(
        'provider is required for AIScorer',
        { providedKeys: Object.keys(config) }
      );
    }

    if (!['openai', 'anthropic'].includes(config.provider)) {
      throw new ProviderConfigError(
        `Invalid provider: ${config.provider}. Must be 'openai' or 'anthropic'`,
        { provider: config.provider }
      );
    }

    if (!config.apiKey) {
      throw new ProviderConfigError(
        'apiKey is required for AIScorer',
        { provider: config.provider }
      );
    }
  }

  /**
   * Get scorer type
   * @returns {string}
   */
  getType() {
    return 'ai';
  }

  /**
   * Get scorer name
   * @returns {string}
   */
  getName() {
    return `ai-${this.provider}`;
  }

  /**
   * Get capabilities
   * @returns {object}
   */
  getCapabilities() {
    return {
      supportsBinary: true,
      supportsNumeric: true,
      requiresApiKey: true,
      isDeterministic: this.temperature === 0,
      averageLatency: '2-5s'
    };
  }

  /**
   * Health check
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      await this._getClient();
      return true;
    } catch (error) {
      return false;
    }
  }
}
