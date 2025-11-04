import crypto from 'crypto';
import { deterministicStringify } from './crypto.js';

// BN254 prime field (Groth16 / snarkjs default)
export const SNARK_FIELD =
  BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

let poseidonInstancePromise = null;

/**
 * Lazily build and cache Poseidon hasher
 * @returns {Promise<any>} Poseidon instance from circomlibjs
 */
export async function getPoseidon() {
  if (!poseidonInstancePromise) {
    poseidonInstancePromise = import('circomlibjs').then(({ buildPoseidon }) => buildPoseidon());
  }
  return poseidonInstancePromise;
}

/**
 * Normalize arbitrary values into snark field elements
 * @param {bigint|number|string} value - Value to normalise
 * @returns {bigint}
 */
export function toFieldElement(value) {
  let bigintValue;

  if (typeof value === 'bigint') {
    bigintValue = value;
  } else if (typeof value === 'number') {
    bigintValue = BigInt(Math.trunc(value));
  } else if (typeof value === 'string') {
    if (value.startsWith('0x') || value.startsWith('0X')) {
      bigintValue = BigInt(value);
    } else if (/^\d+$/.test(value)) {
      bigintValue = BigInt(value);
    } else {
      bigintValue = sha256Field(value);
    }
  } else {
    throw new TypeError(`Cannot convert value of type ${typeof value} to field element`);
  }

  bigintValue %= SNARK_FIELD;
  if (bigintValue < 0n) {
    bigintValue += SNARK_FIELD;
  }
  return bigintValue;
}

/**
 * Convert field element to fixed-length hex string (32 bytes)
 * @param {bigint} value
 * @returns {string}
 */
export function fieldToHex(value) {
  const normalized = toFieldElement(value);
  return normalized.toString(16).padStart(64, '0');
}

/**
 * Deterministically serialise data prior to hashing
 * @param {string|Buffer|object} data
 * @returns {Buffer}
 */
export function normaliseDataToBuffer(data) {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (typeof data === 'string') {
    return Buffer.from(data, 'utf8');
  }

  if (typeof data === 'object') {
    return Buffer.from(deterministicStringify(data), 'utf8');
  }

  if (data === undefined || data === null) {
    return Buffer.from(JSON.stringify(data), 'utf8');
  }

  throw new TypeError(`Unsupported data type for hashing: ${typeof data}`);
}

/**
 * Compute SHA-256 hash of data as buffer
 * @param {string|Buffer|object} data
 * @returns {Buffer}
 */
export function sha256Buffer(data) {
  return crypto.createHash('sha256').update(normaliseDataToBuffer(data)).digest();
}

/**
 * Compute SHA-256 hash mapped into the snark field (truncated to 31 bytes)
 * @param {string|Buffer|object} data
 * @returns {bigint}
 */
export function sha256Field(data) {
  const hash = sha256Buffer(data);
  // Take first 31 bytes to stay strictly below field modulus
  const truncated = hash.subarray(0, 31);
  return toFieldElement(BigInt(`0x${truncated.toString('hex')}`));
}

/**
 * Poseidon hash helper that accepts arbitrary field inputs
 * @param {Array<bigint|number|string>} inputs
 * @returns {Promise<bigint>}
 */
export async function poseidonHash(inputs) {
  const poseidon = await getPoseidon();
  const normalized = inputs.map(toFieldElement);
  return poseidon.F.toObject(poseidon(normalized));
}

/**
 * Combine five components into a leaf hash using Poseidon as specified
 * @param {object} params
 * @param {bigint|number|string} params.testId
 * @param {bigint|number|string} params.promptHash
 * @param {bigint|number|string} params.idealOutputHash
 * @param {bigint|number|string} params.agentOutputHash
 * @param {bigint|number|string} params.score
 * @returns {Promise<bigint>}
 */
export async function poseidonLeaf({
  testId,
  promptHash,
  idealOutputHash,
  agentOutputHash,
  score
}) {
  return poseidonHash([
    toFieldElement(testId),
    toFieldElement(promptHash),
    toFieldElement(idealOutputHash),
    toFieldElement(agentOutputHash),
    toFieldElement(score)
  ]);
}

/**
 * Convert arbitrary identifier into stable field element by hashing
 * @param {string|number} identifier
 * @returns {bigint}
 */
export function identifierToField(identifier) {
  if (typeof identifier === 'number') {
    return toFieldElement(identifier);
  }

  if (typeof identifier === 'string') {
    return sha256Field(identifier);
  }

  throw new TypeError(`Unsupported identifier type: ${typeof identifier}`);
}
