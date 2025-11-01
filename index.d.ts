// Type definitions for @agent-verifier/research
// Project: https://github.com/rforzani/agent-verifier
// Definitions by: Riccardo Forzani

declare module '@agent-verifier/research' {
  // ============= Core Interfaces =============

  export interface TestCase {
    id: string;
    prompt: string;
    idealOutput: string;
    scoringType: 'binary' | 'numeric';
    scoringCriteria?: string;
    metadata?: Record<string, any>;
  }

  export interface ExecutionLog {
    timestamp: number;
    testId: string;
    toolName?: string;
    toolInput?: any;
    toolOutput?: any;
    toolUseId?: string;
    eventType?: string;
    metadata?: Record<string, any>;
  }

  export interface TestResult {
    testId: string;
    prompt: string;
    idealOutput: string;
    agentOutput: string;
    score: number | boolean;
    scoringType: 'binary' | 'numeric';
    success: boolean;
    logs: ExecutionLog[];
    duration?: number;
  }

  export interface VerificationResult {
    full: {
      merkleRoot: string;
      score: number;
      numTests: number;
      executionTime: number;
    };
    subset: {
      merkleRoot: string;
      score: number;
      numTests: number;
      publicIndices: number[];
      publicData: Array<{
        testId: string;
        prompt: string;
        idealOutput: string;
        agentOutput: string;
        score: number | boolean;
        scoringType: 'binary' | 'numeric';
        success: boolean;
      }>;
    };
    zkProof: any;
    providers: {
      agent: {
        name: string;
        version: string;
      };
      scorer: {
        name: string;
        type: string;
      };
    };
    metadata: {
      timestamp: string;
      libraryVersion: string;
      testSuiteSize: number;
      publicPercentage: string;
    };
  }

  // ============= ExecutionContext =============

  export class ExecutionContext {
    constructor(testId: string, options?: Record<string, any>);
    logToolCall(params: {
      toolName: string;
      toolInput: any;
      toolOutput: any;
      toolUseId?: string;
      metadata?: Record<string, any>;
    }): void;
    logEvent(eventType: string, data?: Record<string, any>): void;
    setProvider(name: string, version: string): void;
    complete(result?: Record<string, any>): void;
    fail(error: Error): void;
    getLogs(): ExecutionLog[];
    getMetadata(): Record<string, any>;
    getSummary(): {
      testId: string;
      provider: string | null;
      toolCallCount: number;
      eventCount: number;
      duration: number | null;
      isComplete: boolean;
      hasError: boolean;
    };
    hasToolCalls(): boolean;
    serializeForHash(): string;
    clearLogs(): void;
  }

  // ============= Provider Interfaces =============

  export abstract class AgentProvider {
    constructor(config: Record<string, any>);
    abstract execute(prompt: string, context: ExecutionContext): Promise<string>;
    abstract getName(): string;
    getVersion(): string;
    getCapabilities(): {
      streaming: boolean;
      toolCalling: boolean;
      multiModal: boolean;
      contextWindow: string;
    };
    cleanup(): Promise<void>;
    healthCheck(): Promise<boolean>;
  }

  export abstract class ScorerProvider {
    constructor(config: Record<string, any>);
    abstract score(params: {
      agentOutput: string;
      idealOutput: string;
      scoringType: 'binary' | 'numeric';
      criteria?: string;
      metadata?: Record<string, any>;
    }): Promise<number | boolean>;
    abstract getType(): string;
    abstract getName(): string;
    getVersion(): string;
    supportsType(scoringType: 'binary' | 'numeric'): boolean;
    getCapabilities(): {
      supportsBinary: boolean;
      supportsNumeric: boolean;
      requiresApiKey: boolean;
      isDeterministic: boolean;
      averageLatency: string;
    };
    batchScore(scoringTasks: Array<{
      agentOutput: string;
      idealOutput: string;
      scoringType: 'binary' | 'numeric';
      criteria?: string;
      metadata?: Record<string, any>;
    }>): Promise<Array<number | boolean>>;
    cleanup(): Promise<void>;
    healthCheck(): Promise<boolean>;
  }

  // ============= Concrete Provider Implementations =============

  export interface AnthropicProviderConfig {
    apiKey: string;
    model?: string;
    sdkOptions?: {
      maxTurns?: number;
      permissionMode?: string;
      cwd?: string;
      mcpServers?: Record<string, any>;
      agents?: Array<any>;
      [key: string]: any;
    };
  }

  export class AnthropicProvider extends AgentProvider {
    constructor(config: AnthropicProviderConfig);
    execute(prompt: string, context: ExecutionContext): Promise<string>;
    getName(): string;
    getVersion(): string;
  }

  export interface OpenAIProviderConfig {
    apiKey: string;
    model?: string;
    baseURL?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    tools?: Array<any>;
  }

  export class OpenAIProvider extends AgentProvider {
    constructor(config: OpenAIProviderConfig);
    execute(prompt: string, context: ExecutionContext): Promise<string>;
    getName(): string;
    getVersion(): string;
  }

  export interface CustomProviderConfig {
    executor?: (prompt: string, context: ExecutionContext) => Promise<string>;
    name?: string;
    [key: string]: any;
  }

  export class CustomProvider extends AgentProvider {
    constructor(config?: CustomProviderConfig);
    execute(prompt: string, context: ExecutionContext): Promise<string>;
    getName(): string;
  }

  export interface AIScorerConfig {
    provider: 'openai' | 'anthropic';
    apiKey: string;
    model?: string;
    temperature?: number;
    maxRetries?: number;
    baseURL?: string;
  }

  export class AIScorer extends ScorerProvider {
    constructor(config: AIScorerConfig);
    score(params: {
      agentOutput: string;
      idealOutput: string;
      scoringType: 'binary' | 'numeric';
      criteria?: string;
      metadata?: Record<string, any>;
    }): Promise<number | boolean>;
    getType(): string;
    getName(): string;
  }

  export interface DeterministicScorerConfig {
    method?: 'exact' | 'substring' | 'jaccard' | 'levenshtein' | 'token';
    caseSensitive?: boolean;
    ignoreWhitespace?: boolean;
    binaryThreshold?: number;
  }

  export class DeterministicScorer extends ScorerProvider {
    constructor(config?: DeterministicScorerConfig);
    score(params: {
      agentOutput: string;
      idealOutput: string;
      scoringType: 'binary' | 'numeric';
      criteria?: string;
      metadata?: Record<string, any>;
    }): Promise<number | boolean>;
    getType(): string;
    getName(): string;
  }

  // ============= Main Verifier Class =============

  export interface ResearchVerifierConfig {
    testSuite: TestCase[];
    agentProvider: AgentProvider;
    scorerProvider: ScorerProvider;
    selectionConfig?: {
      publicPercentage?: number;
      minimumPublic?: number;
    };
    zkConfig?: Record<string, any>;
    outputDir?: string;
    parallelConfig?: {
      enabled?: boolean;
      maxConcurrent?: number;
    };
  }

  export class ResearchVerifier {
    constructor(config: ResearchVerifierConfig);
    runAndProve(): Promise<VerificationResult>;
    static verify(
      proof: any,
      publicInputs: Record<string, any>,
      verificationKey: any
    ): Promise<boolean>;
  }

  // ============= Utility Functions =============

  export function validateTestSuite(testSuite: TestCase[]): void;
  export function normalizeTestCase(test: TestCase): TestCase;

  // ============= Error Classes =============

  export class ResearchLibraryError extends Error {
    code: string;
    details: Record<string, any>;
    timestamp: string;
  }

  export class ProviderConfigError extends ResearchLibraryError {}
  export class ProviderExecutionError extends ResearchLibraryError {}
  export class AgentExecutionError extends ResearchLibraryError {
    testId: string;
  }
  export class ScoringError extends ResearchLibraryError {
    testId: string | null;
  }
  export class CircuitCompilationError extends ResearchLibraryError {}
  export class ProofGenerationError extends ResearchLibraryError {}
  export class CircuitInputValidationError extends ResearchLibraryError {
    field: string;
    value: any;
    expected: string;
  }
  export class ProofVerificationError extends ResearchLibraryError {}
  export class MerkleTreeError extends ResearchLibraryError {}
  export class ValidationError extends ResearchLibraryError {}
  export class ConfigValidationError extends ResearchLibraryError {}
  export class TimeoutError extends ResearchLibraryError {
    operation: string;
    timeout: number;
  }
  export class ResourceError extends ResearchLibraryError {
    resource: string;
  }
}
