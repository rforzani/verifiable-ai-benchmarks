import { ExecutionContext } from './ExecutionContext.js';
import { ExecutionLogger } from '../logging/ExecutionLogger.js';
import fs from 'fs';
import path from 'path';

/**
 * Agent Executor
 * Supports TWO modes:
 * 1. Default: Simple Claude SDK execution
 * 2. Custom: User-provided executor function for complex workflows
 *
 * Custom executors can:
 * - Chain multiple agent calls
 * - Use different AI providers (OpenAI, Anthropic, etc.)
 * - Implement routing, validation, retry logic, etc.
 * - All logging is automatically captured
 */
export class AgentExecutor {
  constructor(config) {
    this.apiKey = config.anthropicApiKey;
    this.model = config.model || 'claude-haiku-4-5';
    this.sdkOptions = config.sdkOptions || {};

    // Custom executor function (optional)
    // Signature: async (test, context) => string (output)
    this.customExecutor = config.customExecutor || null;

    // Per-test isolation: create subdirectory for each test
    this.isolateTests = config.isolateTests !== false; // Default: true

    // Global logger (aggregates all test logs)
    this.globalLogger = new ExecutionLogger();

    // Execution state
    this.executionStartTime = null;
    this.executionEndTime = null;

    // Track created test directories for cleanup
    this.createdTestDirectories = new Set();
  }

  /**
   * Execute agent on a single test case
   * Uses custom executor if provided, otherwise default SDK execution
   * @param {object} test - Full test case object
   * @param {string} testId - Test case ID for logging
   * @returns {Promise<object>} Execution result
   */
  async execute(test, testId) {
    this.executionStartTime = Date.now();

    try {
      // Determine working directory for this test
      let testCwd = this.sdkOptions.cwd || process.cwd();

      if (this.isolateTests) {
        // Create isolated subdirectory for this test
        testCwd = path.join(testCwd, testId);
        fs.mkdirSync(testCwd, { recursive: true });
        this.createdTestDirectories.add(testCwd);
      }

      // Create execution context for this test
      const context = new ExecutionContext({
        anthropicApiKey: this.apiKey,
        testId,
        sdkOptions: {
          model: this.model,
          permissionMode: 'acceptEdits',
          maxTurns: 50,
          allowDangerouslySkipPermissions: true,
          ...this.sdkOptions,
          cwd: testCwd  // Override with isolated directory for this test
        }
      });

      let output;

      if (this.customExecutor) {
        // Use custom executor function
        output = await this.customExecutor(test, context);
      } else {
        // Default: single Claude SDK call with test prompt
        output = await context.runClaudeAgent(test.prompt);
      }

      this.executionEndTime = Date.now();

      // Merge context logs into global logger
      this.mergeLogsFrom(context.getLogger());

      return {
        output: output || '',
        success: true,
        metadata: {
          duration: this.executionEndTime - this.executionStartTime,
          toolCalls: context.getLogs().length
        }
      };

    } catch (error) {
      this.executionEndTime = Date.now();
      throw new Error(`Agent execution failed for test ${testId}: ${error.message}`);
    }
  }

  /**
   * Merge logs from execution context into global logger
   * @param {ExecutionLogger} contextLogger - Logger from execution context
   * @private
   */
  mergeLogsFrom(contextLogger) {
    const logs = contextLogger.getAllLogs();
    for (const log of logs) {
      // Re-log each entry
      if (log.testId && !this.globalLogger.testLogs.has(log.testId)) {
        this.globalLogger.setCurrentTest(log.testId);
      }
      this.globalLogger.logToolCall({
        toolName: log.toolName,
        toolInput: log.toolInput,
        toolOutput: log.toolOutput,
        toolUseId: log.toolUseId
      });
    }
  }

  /**
   * Get execution logger
   * @returns {ExecutionLogger} Logger instance
   */
  getLogger() {
    return this.globalLogger;
  }

  /**
   * Get logs for a specific test
   * @param {string} testId - Test case ID
   * @returns {Array} Array of log entries
   */
  getLogsForTest(testId) {
    return this.globalLogger.getLogsForTest(testId);
  }

  /**
   * Get all execution logs
   * @returns {Array} All log entries
   */
  getAllLogs() {
    return this.globalLogger.getAllLogs();
  }

  /**
   * Get execution summary
   * @returns {object} Execution summary with statistics
   */
  getExecutionSummary() {
    return this.globalLogger.getSummary();
  }

  /**
   * Clear all logs (useful for testing)
   */
  clearLogs() {
    this.globalLogger.clear();
  }

  /**
   * Clean up all created test directories
   * @returns {Promise<void>}
   */
  async cleanupTestDirectories() {
    for (const dir of this.createdTestDirectories) {
      try {
        if (fs.existsSync(dir)) {
          await fs.promises.rm(dir, { recursive: true, force: true });
        }
      } catch (error) {
        console.warn(`Failed to cleanup test directory ${dir}: ${error.message}`);
      }
    }
    this.createdTestDirectories.clear();
  }

  /**
   * Get list of created test directories
   * @returns {Array<string>} Array of directory paths
   */
  getCreatedTestDirectories() {
    return Array.from(this.createdTestDirectories);
  }
}
