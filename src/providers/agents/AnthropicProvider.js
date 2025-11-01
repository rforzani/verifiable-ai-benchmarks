import { AgentProvider } from '../../core/interfaces/AgentProvider.js';
import { ProviderConfigError, ProviderExecutionError } from '../../core/errors/index.js';

/**
 * AnthropicProvider - Claude Agent SDK Integration
 *
 * Wraps the Anthropic Claude Agent SDK to provide agent execution with full tool support.
 * This provider maintains full backward compatibility with the original verifier-library.
 *
 * Features:
 * - Full Claude Agent SDK support (Read, Write, Bash, etc.)
 * - Automatic tool call logging via PostToolUse hooks
 * - Configurable SDK options (model, maxTurns, mcpServers, etc.)
 * - Streaming support
 *
 * @extends AgentProvider
 */
export class AnthropicProvider extends AgentProvider {
  /**
   * Create an Anthropic provider
   *
   * @param {object} config - Provider configuration
   * @param {string} config.apiKey - Anthropic API key
   * @param {string} [config.model='claude-haiku-4-5'] - Model to use
   * @param {object} [config.sdkOptions={}] - Claude Agent SDK options
   * @param {number} [config.sdkOptions.maxTurns=50] - Maximum agent turns
   * @param {string} [config.sdkOptions.permissionMode='acceptEdits'] - Permission mode
   * @param {string} [config.sdkOptions.cwd] - Working directory
   * @param {object} [config.sdkOptions.mcpServers] - MCP servers configuration
   * @param {Array} [config.sdkOptions.agents] - Sub-agents configuration
   */
  constructor(config) {
    super(config);

    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-haiku-4-5';
    this.sdkOptions = {
      maxTurns: 50,
      permissionMode: 'acceptEdits',
      allowDangerouslySkipPermissions: true,
      ...config.sdkOptions
    };

    // Lazy load the SDK (only if used)
    this._sdk = null;
  }

  /**
   * Get Claude Agent SDK query function
   * @private
   */
  async _getSDK() {
    if (!this._sdk) {
      try {
        const module = await import('@anthropic-ai/claude-agent-sdk');
        this._sdk = module.query;
      } catch (error) {
        throw new ProviderConfigError(
          'Failed to load @anthropic-ai/claude-agent-sdk. Install it with: npm install @anthropic-ai/claude-agent-sdk',
          { originalError: error.message }
        );
      }
    }
    return this._sdk;
  }

  /**
   * Execute agent on a prompt using Claude Agent SDK
   *
   * @param {string} prompt - Input prompt
   * @param {ExecutionContext} context - Execution context for logging
   * @returns {Promise<string>} Agent output
   */
  async execute(prompt, context) {
    try {
      context.setProvider(this.getName(), this.getVersion());

      // Get SDK
      const query = await this._getSDK();

      // Create logging hooks for the SDK
      const loggingHooks = this._createLoggingHooks(context);

      // Merge with user-provided hooks
      const mergedHooks = this._mergeHooks(loggingHooks, this.sdkOptions.hooks || {});

      // Prepare SDK options
      const finalOptions = {
        ...this.sdkOptions,
        model: this.model,
        hooks: mergedHooks
      };

      // Execute agent using SDK
      let output = '';
      const agentQuery = query({ prompt, options: finalOptions });

      for await (const message of agentQuery) {
        // Track streaming messages
        if (message.type === 'result' && message.subtype === 'success') {
          output = message.result || '';
        } else if (message.type === 'error') {
          throw new ProviderExecutionError(
            `Claude Agent SDK error: ${message.error || 'Unknown error'}`,
            { messageType: message.type, subtype: message.subtype }
          );
        }
      }

      context.complete({ output });
      return output;

    } catch (error) {
      context.fail(error);
      throw this._wrapError(error, 'execution');
    }
  }

  /**
   * Create logging hooks for Claude Agent SDK
   * @private
   */
  _createLoggingHooks(context) {
    return {
      PostToolUse: [{
        hooks: [async (hookInput, toolUseID) => {
          context.logToolCall({
            toolName: hookInput.tool_name,
            toolInput: hookInput.tool_input,
            toolOutput: hookInput.tool_response,
            toolUseId: toolUseID
          });
          return {};
        }]
      }],
      PreToolUse: [{
        hooks: [async () => {
          // Auto-approve all tools (configurable via sdkOptions)
          return { decision: 'approve' };
        }]
      }]
    };
  }

  /**
   * Merge hooks (logging + user hooks)
   * @private
   */
  _mergeHooks(loggingHooks, userHooks) {
    const merged = {};
    const allEvents = new Set([
      ...Object.keys(loggingHooks),
      ...Object.keys(userHooks)
    ]);

    for (const event of allEvents) {
      merged[event] = [
        ...(loggingHooks[event] || []),
        ...(userHooks[event] || [])
      ];
    }

    return merged;
  }

  /**
   * Validate configuration
   * @protected
   */
  _validateConfig(config) {
    if (!config.apiKey) {
      throw new ProviderConfigError(
        'apiKey is required for AnthropicProvider',
        { providedKeys: Object.keys(config) }
      );
    }

    if (typeof config.apiKey !== 'string' || config.apiKey.trim().length === 0) {
      throw new ProviderConfigError(
        'apiKey must be a non-empty string',
        { apiKeyType: typeof config.apiKey }
      );
    }
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getName() {
    return 'anthropic';
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
      streaming: true,
      toolCalling: true,
      multiModal: false,
      contextWindow: '200k',
      supportedModels: [
        'claude-haiku-4-5',
        'claude-sonnet-4-5',
        'claude-opus-4-1'
      ]
    };
  }

  /**
   * Health check
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      await this._getSDK();
      return true;
    } catch (error) {
      return false;
    }
  }
}
