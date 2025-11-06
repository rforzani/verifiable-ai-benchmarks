import { AgentProvider } from '../../core/interfaces/AgentProvider.js';
import { ProviderConfigError } from '../../core/errors/index.js';

/**
 * AnthropicChatProvider - Lightweight Messages API integration (no tools)
 *
 * Optimized for simple code-gen tasks like HumanEval: fast, deterministic,
 * and without invoking the Claude Agent SDK tool runtime.
 */
export class AnthropicChatProvider extends AgentProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-haiku-4-5';
    this.systemPrompt = config.systemPrompt || 'You are a helpful AI assistant.';
    this.temperature = config.temperature !== undefined ? config.temperature : 0;
    this.maxTokens = config.maxTokens || 800;
    this._client = null;
  }

  async _getClient() {
    if (!this._client) {
      try {
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        this._client = new Anthropic({ apiKey: this.apiKey });
      } catch (error) {
        throw new ProviderConfigError(
          'Failed to load @anthropic-ai/sdk. Install with: npm install @anthropic-ai/sdk',
          { originalError: error.message }
        );
      }
    }
    return this._client;
  }

  async execute(prompt, context) {
    try {
      context.setProvider(this.getName(), this.getVersion());
      const client = await this._getClient();

      const request = {
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: this.systemPrompt,
        messages: [
          { role: 'user', content: [{ type: 'text', text: prompt }] }
        ]
      };

      context.logToolCall({
        toolName: 'Anthropic Messages',
        toolInput: {
          model: this.model,
          temperature: this.temperature,
          maxTokens: this.maxTokens
        },
        toolOutput: { status: 'calling' }
      });

      const resp = await client.messages.create(request);
      const text = (resp.content || [])
        .filter(part => part.type === 'text')
        .map(part => part.text)
        .join('\n')
        .trim();

      if (!text) {
        throw new Error('Empty response from Anthropic Messages');
      }

      context.logToolCall({
        toolName: 'Anthropic Messages',
        toolInput: { id: resp.id },
        toolOutput: {
          output: text.length > 500 ? text.slice(0, 500) + '…' : text,
          stopReason: resp.stop_reason,
          tokensIn: resp.usage?.input_tokens,
          tokensOut: resp.usage?.output_tokens
        }
      });

      context.complete({
        output: text,
        tokensUsed: (resp.usage?.input_tokens || 0) + (resp.usage?.output_tokens || 0),
        finishReason: resp.stop_reason
      });

      return text;
    } catch (error) {
      context.fail(error);
      throw this._wrapError(error);
    }
  }

  getName() {
    return 'anthropic-chat';
  }

  getCapabilities() {
    return {
      streaming: false,
      toolCalling: false,
      multiModal: false,
      contextWindow: '200k',
      supportedModels: [
        'claude-haiku-4-5',
        'claude-sonnet-4-5',
        'claude-3-5-haiku-latest'
      ]
    };
  }

  _validateConfig(config) {
    if (!config.apiKey) {
      throw new ProviderConfigError('apiKey is required for AnthropicChatProvider');
    }
  }
}

