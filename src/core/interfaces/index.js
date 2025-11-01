/**
 * Core Interfaces for Research Library
 *
 * These abstract base classes define the contracts that all providers must implement.
 * They enable the plugin architecture that makes this library provider-agnostic.
 */

export { AgentProvider } from './AgentProvider.js';
export { ScorerProvider } from './ScorerProvider.js';
export { ExecutionContext } from './ExecutionContext.js';
