/**
 * Custom Error Classes
 * Provides detailed error information for debugging and production monitoring
 */

/**
 * Base error class for all library errors
 */
export class ResearchLibraryError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Provider configuration errors
 */
export class ProviderConfigError extends ResearchLibraryError {
  constructor(message, details = {}) {
    super(message, 'PROVIDER_CONFIG_ERROR', details);
  }
}

/**
 * Provider execution errors
 */
export class ProviderExecutionError extends ResearchLibraryError {
  constructor(message, details = {}) {
    super(message, 'PROVIDER_EXECUTION_ERROR', details);
  }
}

/**
 * Agent execution errors
 */
export class AgentExecutionError extends ResearchLibraryError {
  constructor(message, testId, details = {}) {
    super(message, 'AGENT_EXECUTION_ERROR', { testId, ...details });
    this.testId = testId;
  }
}

/**
 * Scoring errors
 */
export class ScoringError extends ResearchLibraryError {
  constructor(message, testId, details = {}) {
    super(message, 'SCORING_ERROR', { testId, ...details });
    this.testId = testId;
  }
}

/**
 * Circuit compilation errors
 */
export class CircuitCompilationError extends ResearchLibraryError {
  constructor(message, details = {}) {
    super(message, 'CIRCUIT_COMPILATION_ERROR', details);
  }
}

/**
 * Proof generation errors
 */
export class ProofGenerationError extends ResearchLibraryError {
  constructor(message, details = {}) {
    super(message, 'PROOF_GENERATION_ERROR', details);
  }
}

/**
 * Circuit input validation errors
 */
export class CircuitInputValidationError extends ResearchLibraryError {
  constructor(field, value, expected, details = {}) {
    const message = `Circuit input validation failed: ${field} = ${value}, expected ${expected}`;
    super(message, 'CIRCUIT_INPUT_VALIDATION_ERROR', { field, value, expected, ...details });
    this.field = field;
    this.value = value;
    this.expected = expected;
  }
}

/**
 * Proof verification errors
 */
export class ProofVerificationError extends ResearchLibraryError {
  constructor(message, details = {}) {
    super(message, 'PROOF_VERIFICATION_ERROR', details);
  }
}

/**
 * Merkle tree errors
 */
export class MerkleTreeError extends ResearchLibraryError {
  constructor(message, details = {}) {
    super(message, 'MERKLE_TREE_ERROR', details);
  }
}

/**
 * Test suite validation errors
 */
export class ValidationError extends ResearchLibraryError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

/**
 * Configuration validation errors
 */
export class ConfigValidationError extends ResearchLibraryError {
  constructor(message, details = {}) {
    super(message, 'CONFIG_VALIDATION_ERROR', details);
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends ResearchLibraryError {
  constructor(operation, timeout, details = {}) {
    const message = `Operation "${operation}" timed out after ${timeout}ms`;
    super(message, 'TIMEOUT_ERROR', { operation, timeout, ...details });
    this.operation = operation;
    this.timeout = timeout;
  }
}

/**
 * Resource errors (memory, disk, etc.)
 */
export class ResourceError extends ResearchLibraryError {
  constructor(resource, message, details = {}) {
    super(message, 'RESOURCE_ERROR', { resource, ...details });
    this.resource = resource;
  }
}
