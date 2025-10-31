import crypto from 'crypto';

/**
 * Cryptographic utility functions
 */

/**
 * Create SHA-256 hash of data
 * @param {string|Buffer|object} data - Data to hash
 * @returns {Buffer} Hash as buffer
 */
export function sha256(data) {
  let input = data;

  // Convert objects to deterministic JSON string
  if (typeof data === 'object' && !Buffer.isBuffer(data)) {
    input = JSON.stringify(data);
  }

  return crypto.createHash('sha256').update(input).digest();
}

/**
 * Create SHA-256 hash and return as hex string
 * @param {string|Buffer|object} data - Data to hash
 * @returns {string} Hex string hash
 */
export function sha256Hex(data) {
  return sha256(data).toString('hex');
}

/**
 * Hash two buffers together (for Merkle tree)
 * @param {Buffer} left - Left hash
 * @param {Buffer} right - Right hash
 * @returns {Buffer} Combined hash
 */
export function hashPair(left, right) {
  return sha256(Buffer.concat([left, right]));
}

/**
 * Deterministic JSON serialization
 * Sorts object keys for consistent hashing
 * @param {object} obj - Object to serialize
 * @returns {string} Serialized JSON string
 */
export function deterministicStringify(obj) {
  if (obj === null || obj === undefined) {
    return JSON.stringify(obj);
  }

  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(deterministicStringify).join(',') + ']';
  }

  const keys = Object.keys(obj).sort();
  const pairs = keys.map(key => {
    return JSON.stringify(key) + ':' + deterministicStringify(obj[key]);
  });

  return '{' + pairs.join(',') + '}';
}

/**
 * Generate random hex string
 * @param {number} bytes - Number of random bytes
 * @returns {string} Random hex string
 */
export function randomHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
