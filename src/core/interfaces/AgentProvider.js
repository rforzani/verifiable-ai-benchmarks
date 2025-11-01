import { ProviderConfigError, ProviderExecutionError } from '../errors/index.js';

/**
 * AgentProvider - Abstract Base Class
 *
 * Defines the interface that all agent providers must implement.
 * Providers can be for any AI system: OpenAI, Anthropic, LangChain, custom agents, etc.
 *
 * Contract:
 * - execute() must return a string (agent's output)
 * - execute() receives an ExecutionContext for logging
 * - All errors should be wrapped in ProviderExecutionError
 * - Providers should validate their config in the constructor
 *
 * @abstract
 */
export class AgentProvider {
  /**
   * Create an agent provider
   * @param {object} config - Provider-specific configuration
   */
  constructor(config = {}) {
    if (new.target === AgentProvider) {
      throw new Error('AgentProvider is abstract and cannot be instantiated directly');
    }
    this.config = config;
    this._validateConfig(config);
  }

  /**
   * Execute agent on a prompt
   *
   * @param {string} prompt - Input prompt for the agent
   * @param {ExecutionContext} context - Execution context with logging capabilities
   * @returns {Promise<string>} Agent's output text
   * @throws {ProviderExecutionError} If execution fails
   *
   * @abstract
   */
  async execute(prompt, context) {
    throw new Error('AgentProvider.execute() must be implemented by subclass');
  }

  /**
   * Get provider name for logging and identification
   * @returns {string} Provider identifier (e.g., 'openai', 'anthropic', 'custom')
   * @abstract
   */
  getName() {
    throw new Error('AgentProvider.getName() must be implemented by subclass');
  }

  /**
   * Get provider version for reproducibility
   * @returns {string} Version string (e.g., '1.0.0')
   */
  getVersion() {
    return '1.0.0';
  }

  /**
   * Validate provider configuration
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
   * Get provider capabilities metadata
   * @returns {object} Capabilities object
   */
  getCapabilities() {
    return {
      streaming: false,
      toolCalling: false,
      multiModal: false,
      contextWindow: 'unknown'
    };
  }

  /**
   * Optional: Perform any necessary cleanup
   * @returns {Promise<void>}
   */
  async cleanup() {
    // Override if needed
  }

  /**
   * Optional: Health check to verify provider is ready
   * @returns {Promise<boolean>} True if provider is healthy
   */
  async healthCheck() {
    return true;
  }

  /**
   * Convert provider-specific errors to standard format
   * @param {Error} error - Original error
   * @param {string} context - Context where error occurred
   * @returns {ProviderExecutionError}
   * @protected
   */
  _wrapError(error, context = 'execution') {
    return new ProviderExecutionError(
      `${this.getName()} provider error during ${context}: ${error.message}`,
      {
        originalError: error.message,
        provider: this.getName(),
        context
      }
    );
  }
}
