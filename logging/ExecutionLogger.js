import { sha256Hex } from '../utils/crypto.js';

/**
 * Execution Logger
 * Captures all tool calls during agent execution
 * Logs are used for:
 * 1. Execution transparency (optional output)
 * 2. ZK circuit verification (hash commitment)
 */
export class ExecutionLogger {
  constructor() {
    this.logs = [];              // All logs in sequence
    this.testLogs = new Map();   // testId -> logs[]
    this.currentTestId = null;
    this.sequenceNumber = 0;
  }

  /**
   * Set the current test being executed
   * @param {string} testId - Test case ID
   */
  setCurrentTest(testId) {
    this.currentTestId = testId;

    if (!this.testLogs.has(testId)) {
      this.testLogs.set(testId, []);
    }
  }

  /**
   * Log a tool call
   * @param {object} params - Tool call parameters
   * @param {string} params.toolName - Name of tool (e.g., "Bash", "Read")
   * @param {object} params.toolInput - Tool input parameters
   * @param {any} params.toolOutput - Tool output/result
   * @param {string} params.toolUseId - SDK tool use ID
   */
  logToolCall({ toolName, toolInput, toolOutput, toolUseId }) {
    const logEntry = {
      testId: this.currentTestId,
      toolUseId,
      toolName,
      toolInput: this.sanitizeData(toolInput),
      toolOutput: this.sanitizeData(toolOutput),
      timestamp: Date.now(),
      sequenceNumber: this.sequenceNumber++
    };

    this.logs.push(logEntry);

    // Also add to test-specific logs
    if (this.currentTestId) {
      this.testLogs.get(this.currentTestId).push(logEntry);
    }
  }

  /**
   * Sanitize data by removing non-deterministic fields
   * @param {any} data - Data to sanitize
   * @returns {any} Sanitized data
   */
  sanitizeData(data) {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    // Remove non-deterministic fields
    const sanitized = { ...data };
    delete sanitized.uuid;
    delete sanitized.session_id;

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Get logs for a specific test
   * @param {string} testId - Test case ID
   * @returns {Array} Array of log entries
   */
  getLogsForTest(testId) {
    return this.testLogs.get(testId) || [];
  }

  /**
   * Get all logs in sequence
   * @returns {Array} All log entries
   */
  getAllLogs() {
    return this.logs;
  }

  /**
   * Get tool call count for a test
   * @param {string} testId - Test case ID
   * @returns {number} Number of tool calls
   */
  getToolCallCount(testId) {
    return this.getLogsForTest(testId).length;
  }

  /**
   * Get total tool call count across all tests
   * @returns {number} Total tool calls
   */
  getTotalToolCallCount() {
    return this.logs.length;
  }

  /**
   * Compute hash of all logs (for ZK circuit)
   * @returns {string} Hex string hash of logs
   */
  computeLogsHash() {
    // Create deterministic log representation
    const logsData = this.logs.map(log => ({
      testId: log.testId,
      toolName: log.toolName,
      toolInput: log.toolInput,
      toolOutput: log.toolOutput,
      sequenceNumber: log.sequenceNumber
      // Note: timestamp and toolUseId are NOT included for determinism
    }));

    return sha256Hex(JSON.stringify(logsData));
  }

  /**
   * Compute hash of logs for a specific test
   * @param {string} testId - Test case ID
   * @returns {string} Hex string hash
   */
  computeTestLogsHash(testId) {
    const testLogs = this.getLogsForTest(testId);

    const logsData = testLogs.map(log => ({
      toolName: log.toolName,
      toolInput: log.toolInput,
      toolOutput: log.toolOutput,
      sequenceNumber: log.sequenceNumber
    }));

    return sha256Hex(JSON.stringify(logsData));
  }

  /**
   * Get execution summary
   * @returns {object} Summary statistics
   */
  getSummary() {
    const testSummaries = [];

    for (const [testId, logs] of this.testLogs.entries()) {
      const toolCounts = {};

      for (const log of logs) {
        toolCounts[log.toolName] = (toolCounts[log.toolName] || 0) + 1;
      }

      testSummaries.push({
        testId,
        totalToolCalls: logs.length,
        toolCounts,
        logsHash: this.computeTestLogsHash(testId)
      });
    }

    return {
      totalTests: this.testLogs.size,
      totalToolCalls: this.logs.length,
      overallLogsHash: this.computeLogsHash(),
      testSummaries
    };
  }

  /**
   * Clear all logs (useful for testing)
   */
  clear() {
    this.logs = [];
    this.testLogs.clear();
    this.currentTestId = null;
    this.sequenceNumber = 0;
  }

  /**
   * Export logs as JSON
   * @returns {string} JSON string of all logs
   */
  exportJSON() {
    return JSON.stringify({
      logs: this.logs,
      summary: this.getSummary()
    }, null, 2);
  }
}
