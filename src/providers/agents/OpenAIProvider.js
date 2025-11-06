import { AgentProvider } from '../../core/interfaces/AgentProvider.js';
import { ProviderConfigError, ProviderExecutionError } from '../../core/errors/index.js';

/**
 * OpenAIProvider - OpenAI Chat Completions Integration
 *
 * Provides execution using OpenAI's chat completion API.
 *
 * Features:
 * - Chat completion with configurable models
 * - System prompts for AI behavior
 * - Temperature and parameter control
 * - Automatic logging of API calls
 * - Function/tool calling support
 *
 * @extends AgentProvider
 */
export class OpenAIProvider extends AgentProvider {
  /**
   * Create an OpenAI provider
   *
   * @param {object} config - Provider configuration
   * @param {string} config.apiKey - OpenAI API key
   * @param {string} [config.model='gpt-5'] - Model to use
   * @param {string} [config.baseURL] - Custom API base URL (for Azure, etc.)
   * @param {string} [config.systemPrompt] - System prompt for AI behavior
   * @param {number} [config.temperature=0.7] - Temperature (0-2)
   * @param {number} [config.maxTokens=4000] - Maximum tokens in response
   * @param {number} [config.topP=1] - Nucleus sampling parameter
   * @param {number} [config.frequencyPenalty=0] - Frequency penalty
   * @param {number} [config.presencePenalty=0] - Presence penalty
   * @param {Array} [config.tools] - Function/tool definitions
   */
  constructor(config) {
    super(config);

    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4o';
    this.baseURL = config.baseURL;
    this.systemPrompt = config.systemPrompt || 'You are a helpful AI assistant.';

    // Model parameters
    this.temperature = config.temperature !== undefined ? config.temperature : 0.7;
    this.maxTokens = config.maxTokens || 4000;
    this.topP = config.topP !== undefined ? config.topP : 1;
    this.frequencyPenalty = config.frequencyPenalty || 0;
    this.presencePenalty = config.presencePenalty || 0;
    this.tools = config.tools || null;

    // Lazy load OpenAI client
    this._client = null;
  }

  /**
   * Get OpenAI client (lazy initialization)
   * @private
   */
  async _getClient() {
    if (!this._client) {
      try {
        const { default: OpenAI } = await import('openai');
        this._client = new OpenAI({
          apiKey: this.apiKey,
          baseURL: this.baseURL
        });
      } catch (error) {
        throw new ProviderConfigError(
          'Failed to load openai package. Install it with: npm install openai',
          { originalError: error.message }
        );
      }
    }
    return this._client;
  }

  /**
   * Execute agent on a prompt using OpenAI Chat Completions
   *
   * @param {string} prompt - Input prompt
   * @param {ExecutionContext} context - Execution context for logging
   * @returns {Promise<string>} Agent output
   */
  async execute(prompt, context) {
    try {
      context.setProvider(this.getName(), this.getVersion());

      const client = await this._getClient();

      // Build messages array
      const messages = [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: prompt }
      ];

      // Prepare API parameters
      const params = {
        model: this.model,
        messages,
        temperature: this.temperature,
        top_p: this.topP,
        frequency_penalty: this.frequencyPenalty,
        presence_penalty: this.presencePenalty
      };

      // Some newer models (e.g., gpt-5 family) expect `max_completion_tokens`
      // while others expect `max_tokens`. Choose based on model name.
      const useMaxCompletion = typeof this.model === 'string' && this.model.includes('gpt-5');
      if (useMaxCompletion) {
        params.max_completion_tokens = this.maxTokens;
      } else {
        params.max_tokens = this.maxTokens;
      }

      // Add tools if configured
      if (this.tools && this.tools.length > 0) {
        params.tools = this.tools;
        params.tool_choice = 'auto';
      }

      // Log the API call
      context.logToolCall({
        toolName: 'OpenAI Chat Completion',
        toolInput: {
          model: this.model,
          prompt: prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''),
          temperature: this.temperature,
          maxTokens: this.maxTokens
        },
        toolOutput: { status: 'calling' }
      });

      // Make API call
      const completion = await client.chat.completions.create(params);

      const message = completion.choices[0].message;
      let output = message.content || '';

      // Handle tool calls if present
      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          context.logToolCall({
            toolName: `OpenAI Tool: ${toolCall.function.name}`,
            toolInput: JSON.parse(toolCall.function.arguments || '{}'),
            toolOutput: { toolCallId: toolCall.id }
          });
        }
        // Note: In a full implementation, you would execute these tools
        // and send the results back to OpenAI in another API call
        output += `\n\n[Tool calls requested: ${message.tool_calls.map(tc => tc.function.name).join(', ')}]`;
      }

      // Log the response
      context.logToolCall({
        toolName: 'OpenAI Chat Completion',
        toolInput: { completionId: completion.id },
        toolOutput: {
          output: output.substring(0, 500) + (output.length > 500 ? '...' : ''),
          finishReason: completion.choices[0].finish_reason,
          tokensUsed: completion.usage?.total_tokens || 0,
          model: completion.model
        }
      });

      context.complete({
        output,
        tokensUsed: completion.usage?.total_tokens,
        finishReason: completion.choices[0].finish_reason
      });

      return output;

    } catch (error) {
      context.fail(error);
      throw this._wrapError(error, 'execution');
    }
  }

  /**
   * Validate configuration
   * @protected
   */
  _validateConfig(config) {
    if (!config.apiKey) {
      throw new ProviderConfigError(
        'apiKey is required for OpenAIProvider',
        { providedKeys: Object.keys(config) }
      );
    }

    if (typeof config.apiKey !== 'string' || config.apiKey.trim().length === 0) {
      throw new ProviderConfigError(
        'apiKey must be a non-empty string',
        { apiKeyType: typeof config.apiKey }
      );
    }

    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      throw new ProviderConfigError(
        'temperature must be between 0 and 2',
        { temperature: config.temperature }
      );
    }
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getName() {
    return 'openai';
  }

  /**
   * Get provider version
   * @returns {string}
   */
  getVersion() {
    return '1.0.0';
  }

  /**
   * Get provider capabilities
   * @returns {object}
   */
  getCapabilities() {
    return {
      streaming: false, // Not implemented in this version
      toolCalling: this.tools !== null,
      multiModal: this.model.includes('gpt-5') || this.model.includes('gpt-5-mini') || this.model.includes('gpt-5-nano'),
      contextWindow: this._getContextWindow(),
      supportedModels: [
        'gpt-5',
        'gpt-5-mini',
        'gpt-5-nano',
        'gpt-4.1',
      ]
    };
  }

  /**
   * Get context window size for model
   * @private
   */
  _getContextWindow() {
    if (this.model.includes('gpt-5')) {
      return '400k';
    } else {
      return '100k';
    }
  }

  /**
   * Health check
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const client = await this._getClient();
      // Make a minimal API call to test connectivity
      await client.models.list();
      return true;
    } catch (error) {
      return false;
    }
  }
}
