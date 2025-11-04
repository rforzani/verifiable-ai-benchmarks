import { deterministicStringify, sha256Hex } from '../utils/crypto.js';

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

  _ensureBucket(testId) {
    if (!this.testLogs.has(testId)) {
      this.testLogs.set(testId, []);
    }
  }

  /**
   * Set the current test being executed
   * @param {string} testId - Test case ID
   */
  setCurrentTest(testId) {
    this.currentTestId = testId;
    this._ensureBucket(testId);
  }

  /**
   * Log a tool call
   * @param {object} params - Tool call parameters
   * @param {string} params.toolName - Name of tool (e.g., "Bash", "Read")
   * @param {object} params.toolInput - Tool input parameters
   * @param {any} params.toolOutput - Tool output/result
   * @param {string} params.toolUseId - SDK tool use ID
   */
  logToolCall({ toolName, toolInput, toolOutput, toolUseId, metadata = {} }) {
    const testId = this.currentTestId || metadata.testId;
    if (!testId) {
      throw new Error('ExecutionLogger.logToolCall requires a testId. Call setCurrentTest() first.');
    }

    this._ensureBucket(testId);

    const logEntry = {
      testId,
      toolUseId: toolUseId || null,
      toolName,
      toolInput: this.sanitizeData(toolInput),
      toolOutput: this.sanitizeData(toolOutput),
      metadata: this.sanitizeData(metadata),
      timestamp: Date.now(),
      sequenceNumber: this.sequenceNumber++
    };

    this.logs.push(logEntry);

    // Also add to test-specific logs
    this.testLogs.get(testId).push(logEntry);
  }

  /**
   * Ingest logs captured by ExecutionContext for a specific test.
   * @param {string} testId
   * @param {Array<object>} contextLogs
   */
  recordTestLogs(testId, contextLogs = []) {
    if (!testId || !Array.isArray(contextLogs) || contextLogs.length === 0) {
      return;
    }

    this._ensureBucket(testId);

    for (const contextLog of contextLogs) {
      const isToolLog = Boolean(contextLog.toolName);
      const entry = {
        testId,
        toolUseId: contextLog.toolUseId || null,
        toolName: contextLog.toolName || null,
        eventType: contextLog.eventType || null,
        toolInput: this.sanitizeData(contextLog.toolInput ?? contextLog.data ?? null),
        toolOutput: this.sanitizeData(contextLog.toolOutput ?? null),
        metadata: this.sanitizeData(contextLog.metadata ?? {}),
        timestamp: contextLog.timestamp ?? Date.now(),
        sequenceNumber: this.sequenceNumber++,
        kind: isToolLog ? 'tool' : 'event'
      };

      this.logs.push(entry);
      this.testLogs.get(testId).push(entry);
    }
  }

  /**
   * Sanitize data by removing non-deterministic fields
   * @param {any} data - Data to sanitize
   * @returns {any} Sanitized data
   */
  sanitizeData(data) {
    if (typeof data === 'bigint') {
      return data.toString();
    }

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
    for (const key of Object.keys(sanitized)) {
      if (this._isVolatileKey(key)) {
        delete sanitized[key];
        continue;
      }

      if (typeof sanitized[key] === 'bigint') {
        sanitized[key] = sanitized[key].toString();
      }
    }

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
   * Build sanitized commitment transcript for hashing.
   * @returns {Array<object>}
   */
  getSanitizedLogs() {
    return this.logs.map(log => this._createSanitizedEntry(log));
  }

  /**
   * Compute hash of logs for a specific test
   * @param {string} testId - Test case ID
   * @returns {string} Hex string hash
   */
  computeLogsHash() {
    return sha256Hex(deterministicStringify(this.getSanitizedLogs()));
  }

  /**
   * Compute hash of all logs (for ZK circuit)
   * @returns {string} Hex string hash of logs
   */
  computeTestLogsHash(testId) {
    const testLogs = this.getLogsForTest(testId);

    const logsData = testLogs.map(log => this._createSanitizedEntry(log));

    return sha256Hex(deterministicStringify(logsData));
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
        const label = log.toolName || log.eventType || log.kind || 'log';
        toolCounts[label] = (toolCounts[label] || 0) + 1;
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

  /**
   * Determine if a key should be excluded from commitments.
   * @param {string} key
   * @returns {boolean}
   * @private
   */
  _isVolatileKey(key) {
    if (!key) return false;
    const lower = String(key).toLowerCase();
    if (['uuid', 'session_id', 'sessionid', 'tooluseid', 'idempotencykey'].includes(lower)) {
      return true;
    }
    if (
      lower.includes('token') ||
      lower.includes('timestamp') ||
      lower.includes('latency') ||
      lower.includes('duration')
    ) {
      return true;
    }
    if (lower === 'traceid' || lower === 'trace_id') {
      return true;
    }
    return false;
  }

  /**
   * Convert a raw log entry into the canonical commitment-friendly structure.
   * @param {object} log
   * @returns {object}
   * @private
   */
  _createSanitizedEntry(log) {
    const base = {
      testId: log.testId,
      sequenceNumber: log.sequenceNumber,
      kind: log.kind || (log.toolName ? 'tool' : (log.eventType ? 'event' : 'log')),
      name: log.toolName || log.eventType || null,
      input: this.sanitizeData(log.toolInput ?? null),
      output: this.sanitizeData(log.toolOutput ?? null),
      data: this.sanitizeData(log.data ?? null),
      metadata: this.sanitizeData(log.metadata ?? {})
    };

    return base;
  }
}
