import { AgentProvider } from '../../core/interfaces/AgentProvider.js';

/**
 * CustomProvider - Base class for custom agent implementations
 *
 * Extend this class to integrate any custom agent framework or workflow.
 * This provider provides a simple template for wrapping custom agent logic.
 *
 * Example:
 * ```javascript
 * class MyAgentProvider extends CustomProvider {
 *   async execute(prompt, context) {
 *     const output = await myCustomFramework.run(prompt);
 *     context.logToolCall({
 *       toolName: 'MyFramework',
 *       toolInput: { prompt },
 *       toolOutput: { output }
 *     });
 *     return output;
 *   }
 * }
 * ```
 *
 * @extends AgentProvider
 */
export class CustomProvider extends AgentProvider {
  /**
   * Create a custom provider
   *
   * @param {object} config - Provider configuration
   * @param {Function} [config.executor] - Custom executor function
   * @param {string} [config.name='custom'] - Provider name
   */
  constructor(config = {}) {
    super(config);
    this.executor = config.executor;
    this.providerName = config.name || 'custom';
  }

  /**
   * Execute agent on a prompt
   *
   * If an executor function was provided in config, it will be used.
   * Otherwise, this method should be overridden in subclass.
   *
   * @param {string} prompt - Input prompt
   * @param {ExecutionContext} context - Execution context for logging
   * @returns {Promise<string>} Agent output
   */
  async execute(prompt, context) {
    context.setProvider(this.getName(), this.getVersion());

    if (this.executor) {
      try {
        const output = await this.executor(prompt, context);
        context.complete({ output });
        return output;
      } catch (error) {
        context.fail(error);
        throw this._wrapError(error, 'execution');
      }
    }

    throw new Error('CustomProvider.execute() must be implemented or executor function provided');
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getName() {
    return this.providerName;
  }

  /**
   * Get provider version
   * @returns {string}
   */
  getVersion() {
    return '1.0.0';
  }

  /**
   * Validate configuration
   * @protected
   */
  _validateConfig(config) {
    // Custom validation can be added by subclasses
    return true;
  }
}
