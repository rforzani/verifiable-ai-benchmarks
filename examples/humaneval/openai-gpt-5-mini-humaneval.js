import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import {
  ResearchVerifier,
  OpenAIProvider,
  HumanEvalScorer
} from '../../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HUMAN_EVAL_PATH = path.join(__dirname, '../../benchmarks/humaneval/humaneval.jsonl');

const DEFAULT_SYSTEM_PROMPT = [
  'You are an expert Python developer.',
  'Follow the provided signature exactly and return only valid Python code without commentary or fences.',
  'Ensure the function passes the hidden unit tests.'
].join(' ');

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';
const DEFAULT_TEMPERATURE = parseOptionalFloat(process.env.OPENAI_TEMPERATURE, 1);
const DEFAULT_MAX_TOKENS = parseOptionalInt(process.env.OPENAI_MAX_TOKENS, 5000);
const HUMAN_EVAL_LIMIT = parseOptionalInt(process.env.HUMAN_EVAL_LIMIT, null);
const HUMAN_EVAL_TIMEOUT_MS = parseOptionalInt(process.env.HUMAN_EVAL_TIMEOUT_MS, 15000);
const HUMAN_EVAL_PYTHON = process.env.HUMAN_EVAL_PYTHON || 'python3';

function parseOptionalInt(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalFloat(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return 'N/A';
  if (ms < 1) return `${ms.toFixed(3)} ms`;
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(2)} s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m ${remainingSeconds.toFixed(0)}s`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'N/A';
  const sign = bytes < 0 ? '-' : '';
  let value = Math.abs(bytes);
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const decimals = value >= 10 || unitIndex === 0 ? 1 : 2;
  return `${sign}${value.toFixed(decimals)} ${units[unitIndex]}`;
}

function formatNumber(value, fractionDigits = 2) {
  if (!Number.isFinite(value)) return 'N/A';
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits
  });
}

function formatPercentage(part, total) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total === 0) return 'N/A';
  return `${((part / total) * 100).toFixed(2)}%`;
}

function collectSystemProfile() {
  const cpus = os.cpus() || [];
  const primaryCpu = cpus[0] || {};
  return {
    platform: `${process.platform} ${process.arch}`,
    release: os.release(),
    cpuModel: primaryCpu.model || 'Unknown CPU',
    cpuCount: cpus.length,
    nodeVersion: process.version,
    totalMem: os.totalmem(),
    freeMem: os.freemem()
  };
}

function reportBenchmarkSummary({
  result,
  benchmark,
  datasetStats,
  systemProfile,
  totalDurationMs,
  memoryEnd,
  resourceEnd
}) {
  const memoryStart = benchmark.memoryStart;
  const rssDelta = memoryEnd.rss - memoryStart.rss;
  const heapDelta = memoryEnd.heapUsed - memoryStart.heapUsed;
  const externalDelta = (memoryEnd.external ?? 0) - (memoryStart.external ?? 0);
  const arrayBuffersDelta = (memoryEnd.arrayBuffers ?? 0) - (memoryStart.arrayBuffers ?? 0);

  const proofStats = benchmark.proof;
  const averageProofTime = proofStats.calls > 0 ? proofStats.totalTimeMs / proofStats.calls : 0;
  const protocol = result.zkProof?.protocol || proofStats.lastProtocol || 'unknown';
  const placeholderProofs = Boolean(result.zkProof?.isPlaceholder || proofStats.placeholderRuns);
  const subsetPercentage = formatPercentage(result.subset.numTests, result.full.numTests);
  const processPeakRss = resourceEnd ? resourceEnd.maxRSS * 1024 : null;

  console.log('\n' + '='.repeat(60));
  console.log('BENCHMARKING SUMMARY (RESEARCH-GRADE)');
  console.log('='.repeat(60));

  console.log('\nSystem Profile:');
  console.log(`  Node.js: ${systemProfile.nodeVersion}`);
  console.log(`  Platform: ${systemProfile.platform} (kernel ${systemProfile.release})`);
  console.log(`  CPU: ${systemProfile.cpuModel} ×${systemProfile.cpuCount || 1}`);
  console.log(`  Physical memory: ${formatBytes(systemProfile.totalMem)} (free ${formatBytes(systemProfile.freeMem)})`);

  console.log('\nWorkload Characterisation:');
  console.log(`  Tasks evaluated: ${formatNumber(datasetStats.totalTasks, 0)} (${subsetPercentage} public subset)`);
  console.log(`  Avg prompt length: ${formatNumber(datasetStats.avgPromptChars)} chars`);
  console.log(`  Avg canonical solution length: ${formatNumber(datasetStats.avgSolutionChars)} chars`);
  console.log(`  Avg unit test length: ${formatNumber(datasetStats.avgTestLines)} lines`);

  console.log('\nRuntime Metrics:');
  console.log(`  Total wall-clock time: ${formatDuration(totalDurationMs)}`);
  console.log(`  Agent execution window (verifier): ${formatDuration(result.full.executionTime)}`);
  if (proofStats.calls > 0) {
    console.log(
      `  ZK proof generation: ${formatDuration(proofStats.totalTimeMs)} total ` +
      `(avg ${formatDuration(averageProofTime)}, max ${formatDuration(proofStats.maxTimeMs)})`
    );
  } else {
    console.log('  ZK proof generation: not invoked');
  }

  console.log('\nMemory Footprint:');
  console.log(`  RSS baseline → final: ${formatBytes(memoryStart.rss)} → ${formatBytes(memoryEnd.rss)} (Δ ${formatBytes(rssDelta)})`);
  console.log(`  Heap used change: ${formatBytes(heapDelta)} (final ${formatBytes(memoryEnd.heapUsed)})`);
  if (externalDelta || arrayBuffersDelta) {
    console.log(`  External/ArrayBuffers Δ: ${formatBytes(externalDelta)} / ${formatBytes(arrayBuffersDelta)}`);
  }
  if (proofStats.rssPeakBytes) {
    console.log(`  Peak RSS observed during proofs: ${formatBytes(proofStats.rssPeakBytes)}`);
    console.log(`  Max instantaneous RSS swing: ${formatBytes(proofStats.maxDeltaBytes)}`);
  }
  if (processPeakRss) {
    console.log(`  Process peak RSS (OS reported): ${formatBytes(processPeakRss)}`);
  }

  console.log('\nProof System Summary:');
  console.log(`  Protocol: ${protocol}`);
  console.log(`  Proof calls: ${formatNumber(proofStats.calls, 0)} (failures ${formatNumber(proofStats.failures, 0)})`);
  console.log(`  Placeholder proofs: ${placeholderProofs ? 'yes' : 'no'}`);
  console.log(`  Public subset size: ${formatNumber(result.subset.numTests, 0)} tests (${subsetPercentage})`);
  console.log(`  Reported aggregate score (full / subset): ${result.full.score.toFixed(2)} / ${result.subset.score.toFixed(2)}`);

  console.log('\nObserved System Requirements:');
  const observedPeak = proofStats.rssPeakBytes || memoryEnd.rss;
  console.log(`  Minimum RAM headroom suggested: ≥ ${formatBytes(observedPeak * 1.25)}`);
  console.log(`  Network access: required for OpenAI API (latency bound on agent execution)`);
  console.log(`  Deterministic tooling: python interpreter at ${HUMAN_EVAL_PYTHON} for HumanEval tests`);

  console.log('\nUse these measurements when reporting state-of-the-art benchmark results.');
  console.log('='.repeat(60) + '\n');
}

async function loadHumanEvalTasks(limit) {
  const datasetRaw = await fs.readFile(HUMAN_EVAL_PATH, 'utf8');
  const lines = datasetRaw.split('\n').map(l => l.trim()).filter(Boolean);
  const tasks = [];
  for (const line of lines) {
    const parsed = JSON.parse(line);
    tasks.push(parsed);
    if (limit && tasks.length >= limit) break;
  }
  if (tasks.length === 0) throw new Error('No HumanEval tasks found in dataset');
  return tasks;
}

function buildHumanEvalPrompt(task) {
  return [
    'Complete the following Python function so that it satisfies the specification.',
    'Return only the implementation without additional explanations or code fences.',
    '',
    task.prompt.trim(),
    '',
    '# Your solution:'
  ].join('\n');
}

async function main() {
  console.log('Research Library - OpenAI GPT-5-mini HumanEval');
  console.log('='.repeat(60));
  console.log();

  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required.');
    console.error('Create a .env file with: OPENAI_API_KEY=your-api-key');
    process.exit(1);
  }

  let tasks;
  try {
    tasks = await loadHumanEvalTasks(HUMAN_EVAL_LIMIT);
  } catch (error) {
    console.error('Failed to load HumanEval dataset:', error.message);
    process.exit(1);
  }

  console.log(`Loaded HumanEval benchmark with ${tasks.length} tasks${HUMAN_EVAL_LIMIT ? ` (limit: ${HUMAN_EVAL_LIMIT})` : ''}.`);
  console.log();

  const testSuite = tasks.map(task => ({
    id: task.task_id,
    prompt: buildHumanEvalPrompt(task),
    idealOutput: task.canonical_solution,
    scoringType: 'binary',
    scoringCriteria: 'Solution must pass the official HumanEval unit tests.',
    metadata: {
      taskId: task.task_id,
      entryPoint: task.entry_point,
      testCode: task.test
    }
  }));

  const datasetStats = (() => {
    const totalTasks = testSuite.length || 1;
    const totalPromptChars = testSuite.reduce((sum, t) => sum + (t.prompt?.length || 0), 0);
    const totalSolutionChars = tasks.reduce((sum, t) => sum + (t.canonical_solution?.length || 0), 0);
    const totalTestLines = tasks.reduce((sum, t) => sum + (t.test ? t.test.split('\n').length : 0), 0);
    return {
      totalTasks: testSuite.length,
      avgPromptChars: totalPromptChars / totalTasks,
      avgSolutionChars: totalSolutionChars / totalTasks,
      avgTestLines: totalTestLines / totalTasks
    };
  })();

  const systemProfile = collectSystemProfile();

  const agentProvider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: DEFAULT_MODEL,
    systemPrompt: process.env.OPENAI_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT,
    temperature: DEFAULT_TEMPERATURE,
    maxTokens: DEFAULT_MAX_TOKENS
  });

  const scorerProvider = new HumanEvalScorer({
    pythonCommand: HUMAN_EVAL_PYTHON,
    timeoutMs: HUMAN_EVAL_TIMEOUT_MS
  });

  const verifier = new ResearchVerifier({
    testSuite,
    agentProvider,
    scorerProvider,
    outputDir: './output',
    parallelConfig: {
      enabled: true,
      maxConcurrent: parseOptionalInt(process.env.HUMAN_EVAL_CONCURRENCY, 6)
    }
  });

  const supportsResourceUsage = typeof process.resourceUsage === 'function';
  const benchmark = {
    totalStart: performance.now(),
    memoryStart: process.memoryUsage(),
    resourceStart: supportsResourceUsage ? process.resourceUsage() : null,
    proof: { calls: 0, totalTimeMs: 0, maxTimeMs: 0, placeholderRuns: 0, failures: 0, rssPeakBytes: 0, maxDeltaBytes: 0, lastProtocol: null }
  };
  benchmark.proof.rssPeakBytes = benchmark.memoryStart.rss;

  const originalGenerateDualProof = verifier.proofGenerator.generateDualProof.bind(verifier.proofGenerator);
  verifier.proofGenerator.generateDualProof = async (...args) => {
    benchmark.proof.calls += 1;
    const proofStart = performance.now();
    const rssBefore = process.memoryUsage().rss;
    let proofResult; let succeeded = false;
    try {
      proofResult = await originalGenerateDualProof(...args);
      succeeded = true;
    } finally {
      const durationMs = performance.now() - proofStart;
      const rssAfter = process.memoryUsage().rss;
      const deltaBytes = rssAfter - rssBefore;
      benchmark.proof.totalTimeMs += durationMs;
      benchmark.proof.maxTimeMs = Math.max(benchmark.proof.maxTimeMs, durationMs);
      benchmark.proof.rssPeakBytes = Math.max(benchmark.proof.rssPeakBytes, rssAfter);
      benchmark.proof.maxDeltaBytes = Math.max(benchmark.proof.maxDeltaBytes, Math.abs(deltaBytes));
      if (proofResult?.protocol) benchmark.proof.lastProtocol = proofResult.protocol;
      if (proofResult?.isPlaceholder) benchmark.proof.placeholderRuns += 1;
      if (!succeeded) benchmark.proof.failures += 1;
    }
    return proofResult;
  };

  let result;
  try {
    console.log('Starting HumanEval verification...\n');
    result = await verifier.runAndProve();

    const totalDurationMs = performance.now() - benchmark.totalStart;
    const memoryEnd = process.memoryUsage();
    const resourceEnd = supportsResourceUsage ? process.resourceUsage() : null;
    benchmark.proof.rssPeakBytes = Math.max(benchmark.proof.rssPeakBytes, memoryEnd.rss);

    console.log('\n' + '='.repeat(60));
    console.log('HUMANEVAL RESULTS');
    console.log('='.repeat(60));
    console.log();
    console.log(`📊 Full Dataset Pass Rate: ${result.full.score.toFixed(2)}%`);
    console.log(`🔍 Public Subset Pass Rate: ${result.subset.score.toFixed(2)}%`);
    console.log(`⏱️  Execution Time: ${(result.full.executionTime / 1000).toFixed(2)}s`);
    console.log();
    if (result.zkProof.isPlaceholder) {
      console.log('⚠️  WARNING: Placeholder proofs detected!');
      console.log('   Compile circuits before using this in production.');
      console.log();
    }
    console.log('✅ Verification complete!');
    console.log('='.repeat(60));

    reportBenchmarkSummary({
      result,
      benchmark,
      datasetStats,
      systemProfile,
      totalDurationMs,
      memoryEnd,
      resourceEnd
    });
  } finally {
    verifier.proofGenerator.generateDualProof = originalGenerateDualProof;
    await agentProvider.cleanup?.();
    await scorerProvider.cleanup?.();
  }
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
