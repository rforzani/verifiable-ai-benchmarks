/**
 * Agent Verifier Research Library
 *
 * Universal AI Agent Verification with Zero-Knowledge Proofs
 * Provider-Agnostic Research Framework
 *
 * @module @agent-verifier/research
 * @author Riccardo Forzani
 * @license MPL-2.0
 */

// Core functionality
export { ResearchVerifier } from './core/ResearchVerifier.js';

// Interfaces (for extending)
export {
  AgentProvider,
  ScorerProvider,
  ExecutionContext
} from './core/interfaces/index.js';

// Errors (for handling)
export * from './core/errors/index.js';

// Provider implementations
export {
  AnthropicProvider,
  OpenAIProvider,
  CustomProvider,
  AIScorer,
  DeterministicScorer
} from './providers/index.js';

// Utilities (for advanced use cases)
export { MerkleTree } from './merkle/index.js';
export { TestSelector } from './selection/index.js';
export { ProofGenerator, Verifier } from './zk/index.js';
export { ExecutionLogger, LogSerializer } from './logging/index.js';
export { validateTestSuite, normalizeTestCase } from './utils/testSuiteValidator.js';
