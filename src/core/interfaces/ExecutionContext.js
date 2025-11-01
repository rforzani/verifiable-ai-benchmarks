/**
 * ExecutionContext - Universal Execution Context for Agent Providers
 *
 * Provides a consistent interface for:
 * - Logging tool calls and agent operations
 * - Tracking execution state
 * - Capturing metadata
 *
 * This context is passed to all AgentProvider.execute() calls and allows
 * providers to log their operations in a standardized way, regardless of
 * the underlying agent framework.
 *
 * The logged data is used to:
 * 1. Generate cryptographic commitments (proves agent actually ran)
 * 2. Provide auditability (can later reveal logs to prove execution)
 * 3. Track performance metrics
 */
export class ExecutionContext {
  /**
   * Create an execution context for a test
   * @param {string} testId - Unique test identifier
   * @param {object} [options={}] - Context options
   */
  constructor(testId, options = {}) {
    if (!testId) {
      throw new Error('ExecutionContext requires a testId');
    }

    this.testId = testId;
    this.options = options;

    // Execution tracking
    this.logs = [];
    this.metadata = {
      testId,
      startTime: Date.now(),
      endTime: null,
      duration: null
    };

    // Provider info (set by provider)
    this.providerName = null;
    this.providerVersion = null;

    // Execution state
    this.isComplete = false;
    this.error = null;
  }

  /**
   * Log a tool call or agent operation
   *
   * This is the primary method providers use to log their operations.
   * All tool calls (Read, Write, Bash, API calls, etc.) should be logged here.
   *
   * @param {object} params - Tool call parameters
   * @param {string} params.toolName - Name of the tool/operation
   * @param {object|string} params.toolInput - Input to the tool
   * @param {object|string} params.toolOutput - Output from the tool
   * @param {string} [params.toolUseId] - Optional unique ID for this tool use
   * @param {object} [params.metadata] - Optional additional metadata
   */
  logToolCall({ toolName, toolInput, toolOutput, toolUseId, metadata = {} }) {
    if (!toolName) {
      throw new Error('toolName is required for logToolCall');
    }

    const logEntry = {
      timestamp: Date.now(),
      testId: this.testId,
      toolName,
      toolInput: this._sanitizeInput(toolInput),
      toolOutput: this._sanitizeOutput(toolOutput),
      toolUseId: toolUseId || `tool-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      metadata: {
        ...metadata,
        provider: this.providerName
      }
    };

    this.logs.push(logEntry);
  }

  /**
   * Log a custom event (not a tool call)
   * @param {string} eventType - Type of event
   * @param {object} data - Event data
   */
  logEvent(eventType, data = {}) {
    const logEntry = {
      timestamp: Date.now(),
      testId: this.testId,
      eventType,
      data,
      metadata: {
        provider: this.providerName
      }
    };

    this.logs.push(logEntry);
  }

  /**
   * Set provider information
   * @param {string} name - Provider name
   * @param {string} version - Provider version
   */
  setProvider(name, version) {
    this.providerName = name;
    this.providerVersion = version;
    this.metadata.provider = name;
    this.metadata.providerVersion = version;
  }

  /**
   * Mark execution as complete
   * @param {object} [result={}] - Execution result data
   */
  complete(result = {}) {
    this.isComplete = true;
    this.metadata.endTime = Date.now();
    this.metadata.duration = this.metadata.endTime - this.metadata.startTime;
    this.metadata.result = result;
  }

  /**
   * Mark execution as failed
   * @param {Error} error - Error that occurred
   */
  fail(error) {
    this.isComplete = true;
    this.error = error;
    this.metadata.endTime = Date.now();
    this.metadata.duration = this.metadata.endTime - this.metadata.startTime;
    this.metadata.error = {
      message: error.message,
      type: error.constructor.name
    };
  }

  /**
   * Get all logs for this execution
   * @returns {Array<object>} Array of log entries
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Get execution metadata
   * @returns {object} Metadata object
   */
  getMetadata() {
    return { ...this.metadata };
  }

  /**
   * Get execution summary
   * @returns {object} Summary with statistics
   */
  getSummary() {
    return {
      testId: this.testId,
      provider: this.providerName,
      toolCallCount: this.logs.filter(log => log.toolName).length,
      eventCount: this.logs.filter(log => log.eventType).length,
      duration: this.metadata.duration,
      isComplete: this.isComplete,
      hasError: this.error !== null
    };
  }

  /**
   * Check if execution has any tool calls logged
   * @returns {boolean}
   */
  hasToolCalls() {
    return this.logs.some(log => log.toolName);
  }

  /**
   * Get logs serialized for hashing (for ZK commitment)
   * @returns {string} Serialized logs
   */
  serializeForHash() {
    // Sort logs by timestamp for determinism
    const sortedLogs = [...this.logs].sort((a, b) => a.timestamp - b.timestamp);

    // Create minimal representation for hashing
    const minimalLogs = sortedLogs.map(log => ({
      tool: log.toolName || log.eventType,
      input: this._truncateForHash(log.toolInput || log.data),
      output: this._truncateForHash(log.toolOutput)
    }));

    return JSON.stringify(minimalLogs);
  }

  /**
   * Clear all logs (useful for testing)
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Sanitize input data for logging (remove secrets, truncate large data)
   * @private
   */
  _sanitizeInput(input) {
    if (typeof input === 'string') {
      return input.length > 10000 ? input.substring(0, 10000) + '... [truncated]' : input;
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized = { ...input };

      // Remove common secret fields
      const secretFields = ['apiKey', 'api_key', 'token', 'password', 'secret', 'authorization'];
      for (const field of secretFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      }

      return sanitized;
    }

    return input;
  }

  /**
   * Sanitize output data for logging
   * @private
   */
  _sanitizeOutput(output) {
    if (typeof output === 'string') {
      return output.length > 10000 ? output.substring(0, 10000) + '... [truncated]' : output;
    }
    return output;
  }

  /**
   * Truncate data for hash computation
   * @private
   */
  _truncateForHash(data) {
    if (!data) return '';

    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return str.length > 500 ? str.substring(0, 500) + '...' : str;
  }
}
