import { query } from '@anthropic-ai/claude-agent-sdk';
import { ExecutionLogger } from '../logging/ExecutionLogger.js';

/**
 * Execution Context
 * Provides tools and logging for custom agent executors
 * Users can call Claude SDK, OpenAI, or any other AI provider
 * Logging is automatically captured via hooks
 */
export class ExecutionContext {
  constructor({ anthropicApiKey, testId, sdkOptions }) {
    this.anthropicApiKey = anthropicApiKey;
    this.testId = testId;
    this.sdkOptions = sdkOptions || {};
    this.logger = new ExecutionLogger();
    this.logger.setCurrentTest(testId);
  }

  /**
   * Execute Claude Agent SDK query with logging
   * @param {string} prompt - Prompt for agent
   * @param {object} options - Additional SDK options
   * @returns {AsyncGenerator} SDK query result stream
   */
  async *claudeAgent(prompt, options = {}) {
    const loggingHooks = this.createLoggingHooks();
    const userHooks = options.hooks || this.sdkOptions.hooks || {};
    const mergedHooks = this.mergeHooks(loggingHooks, userHooks);

    const finalOptions = {
      ...this.sdkOptions,
      ...options,
      hooks: mergedHooks
    };

    const agentQuery = query({ prompt, options: finalOptions });

    for await (const message of agentQuery) {
      yield message;
    }
  }

  /**
   * Helper: Run Claude agent and return final output
   * @param {string} prompt - Prompt for agent
   * @param {object} options - SDK options
   * @returns {Promise<string>} Final agent output
   */
  async runClaudeAgent(prompt, options = {}) {
    let output = '';

    for await (const message of this.claudeAgent(prompt, options)) {
      if (message.type === 'result' && message.subtype === 'success') {
        output = message.result || '';
      }
    }

    return output;
  }

  /**
   * Log a custom tool call (for non-SDK operations)
   * Use this when calling OpenAI, custom APIs, etc.
   * @param {object} params - Tool call parameters
   */
  logToolCall({ toolName, toolInput, toolOutput }) {
    this.logger.logToolCall({
      toolName,
      toolInput,
      toolOutput,
      toolUseId: `custom-${Date.now()}`
    });
  }

  /**
   * Get logs for this execution
   * @returns {Array} Execution logs
   */
  getLogs() {
    return this.logger.getLogsForTest(this.testId);
  }

  /**
   * Get logger instance
   * @returns {ExecutionLogger} Logger
   */
  getLogger() {
    return this.logger;
  }

  /**
   * Create logging hooks for Claude SDK
   * @private
   */
  createLoggingHooks() {
    return {
      PostToolUse: [{
        hooks: [async (hookInput, toolUseID) => {
          this.logger.logToolCall({
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
          return { decision: 'approve' };
        }]
      }]
    };
  }

  /**
   * Merge hooks
   * @private
   */
  mergeHooks(loggingHooks, userHooks) {
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
}
