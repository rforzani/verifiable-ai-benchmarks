import { deterministicStringify, sha256Hex } from '../utils/crypto.js';

/**
 * Log Serializer
 * Converts execution logs into formats suitable for ZK circuits
 */
export class LogSerializer {
  /**
   * Serialize logs for ZK circuit input
   * @param {Array} logs - Array of log entries
   * @returns {object} Serialized logs ready for circuit
   */
  static serializeForCircuit(logs) {
    return logs.map(log => ({
      testId: log.testId,
      toolName: log.toolName,
      toolInputHash: this.hashToolData(log.toolInput),
      toolOutputHash: this.hashToolData(log.toolOutput),
      sequenceNumber: log.sequenceNumber
    }));
  }

  /**
   * Hash tool input/output data deterministically
   * @param {any} data - Data to hash
   * @returns {string} Hex string hash
   */
  static hashToolData(data) {
    const serialized = deterministicStringify(data);
    return sha256Hex(serialized);
  }

  /**
   * Serialize logs for human-readable export
   * @param {Array} logs - Array of log entries
   * @returns {string} Pretty-printed JSON
   */
  static serializeForExport(logs) {
    const exportData = logs.map(log => ({
      testId: log.testId,
      sequence: log.sequenceNumber,
      tool: log.toolName,
      timestamp: new Date(log.timestamp).toISOString(),
      input: this.truncateForDisplay(log.toolInput),
      output: this.truncateForDisplay(log.toolOutput)
    }));

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Truncate data for display purposes
   * @param {any} data - Data to truncate
   * @param {number} maxLength - Maximum string length
   * @returns {any} Truncated data
   */
  static truncateForDisplay(data, maxLength = 200) {
    if (typeof data === 'string') {
      if (data.length > maxLength) {
        return data.substring(0, maxLength) + '... [truncated]';
      }
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      const str = JSON.stringify(data);
      if (str.length > maxLength) {
        return str.substring(0, maxLength) + '... [truncated]';
      }
      return data;
    }

    return data;
  }

  /**
   * Group logs by test ID
   * @param {Array} logs - Array of log entries
   * @returns {Map} Map of testId -> logs[]
   */
  static groupByTest(logs) {
    const grouped = new Map();

    for (const log of logs) {
      if (!grouped.has(log.testId)) {
        grouped.set(log.testId, []);
      }
      grouped.get(log.testId).push(log);
    }

    return grouped;
  }

  /**
   * Create compact representation for ZK circuit
   * @param {Array} logs - Array of log entries
   * @returns {Array} Compact representation
   */
  static createCompactRepresentation(logs) {
    return logs.map(log => [
      log.sequenceNumber,
      log.toolName,
      this.hashToolData(log.toolInput),
      this.hashToolData(log.toolOutput)
    ]);
  }
}
