import { ScorerProvider } from '../../core/interfaces/ScorerProvider.js';
import { ProviderConfigError, ScoringError } from '../../core/errors/index.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { promisify } from 'util';
import { execFile } from 'child_process';

const execFileAsync = promisify(execFile);

/**
 * HumanEvalScorer - Executes official HumanEval unit tests against agent code.
 *
 * Runs the agent's Python solution inside an isolated Python process and evaluates it
 * using the benchmark's provided `check` harness. Produces deterministic pass/fail
 * signals for each task.
 */
export class HumanEvalScorer extends ScorerProvider {
  /**
   * @param {object} [config={}]
   * @param {string} [config.pythonCommand='python3'] - Python executable to use.
   * @param {number} [config.timeoutMs=10000] - Execution timeout per task (ms).
   */
  constructor(config = {}) {
    super(config);

    this.pythonCommand = config.pythonCommand || 'python3';
    this.timeoutMs = config.timeoutMs || 10000;

    if (typeof this.pythonCommand !== 'string' || this.pythonCommand.length === 0) {
      throw new ProviderConfigError('HumanEvalScorer requires a valid pythonCommand string');
    }
  }

  getType() {
    return 'deterministic';
  }

  getName() {
    return 'human-eval-scorer';
  }

  /**
   * Executes the HumanEval tests and returns a deterministic score.
   */
  async score({ agentOutput, scoringType, metadata }) {
    this._validateScoringType(scoringType);

    if (!metadata?.entryPoint || !metadata?.testCode) {
      throw new ScoringError(
        'HumanEvalScorer requires entryPoint and testCode metadata',
        metadata?.taskId || metadata?.testId,
        { metadata }
      );
    }

    const evaluationResult = await this._runHumanEval(agentOutput, metadata);

    if (scoringType === 'binary') {
      return evaluationResult.passed === true;
    }

    const numericScore = evaluationResult.passed ? 100 : 0;
    this._validateScore(numericScore, 'numeric');
    return numericScore;
  }

  /**
   * Executes the HumanEval harness in Python.
   * @private
   */
  async _runHumanEval(agentOutput, metadata) {
    // Be tolerant to LLM formatting: try to sanitize common markdown wrappers
    const sanitized = this._sanitizePythonCandidate(agentOutput, metadata.entryPoint);

    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'humaneval-'));
    const scriptPath = path.join(tempDir, `runner-${randomUUID()}.py`);
    const runnerSource = this._buildRunnerSource(sanitized, metadata);

    try {
      await fs.promises.writeFile(scriptPath, runnerSource, 'utf8');

      const { stdout } = await execFileAsync(this.pythonCommand, [scriptPath], {
        timeout: this.timeoutMs,
        maxBuffer: 10 * 1024 * 1024
      });

      const output = this._extractLastJson(stdout);
      if (!output) {
        throw new Error('Runner did not produce JSON output');
      }

      return output;
    } catch (error) {
      if (error.code === 'ENOENT' && error.path === this.pythonCommand) {
        throw new ScoringError(
          `Python executable "${this.pythonCommand}" not found`,
          metadata?.taskId || metadata?.testId,
          { error: error.message }
        );
      }

      if (error.killed || error.signal === 'SIGTERM') {
        throw new ScoringError(
          `HumanEval runner timed out after ${this.timeoutMs}ms`,
          metadata?.taskId || metadata?.testId,
          { timeoutMs: this.timeoutMs }
        );
      }

      const stdout = error.stdout ? error.stdout.toString() : '';
      const stderr = error.stderr ? error.stderr.toString() : '';
      const parsed = this._extractLastJson(stdout || stderr);

      if (parsed) {
        return parsed;
      }

      throw new ScoringError(
        `HumanEval runner failed: ${error.message}`,
        metadata?.taskId || metadata?.testId,
        { stdout, stderr }
      );
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Builds the Python runner script that evaluates the candidate code.
   * @private
   */
  _buildRunnerSource(agentOutput, metadata) {
    const candidateCode = agentOutput ?? '';
    const entryPoint = metadata.entryPoint;
    const testCode = metadata.testCode;
    const taskId = metadata.taskId || metadata.testId || '';

    return `import json
import sys
import traceback

result = {"task_id": ${JSON.stringify(taskId)}, "passed": False}

candidate_code = ${JSON.stringify(candidateCode)}
entry_point = ${JSON.stringify(entryPoint)}
test_code = ${JSON.stringify(testCode)}

namespace = {}

def emit(data):
    print(json.dumps(data, ensure_ascii=False))

try:
    exec(candidate_code, namespace)
except Exception as error:
    result.update({"error": "candidate_import_error", "details": str(error), "traceback": traceback.format_exc()})
    emit(result)
    sys.exit(0)

if entry_point not in namespace:
    result.update({"error": "missing_entry_point"})
    emit(result)
    sys.exit(0)

namespace["candidate"] = namespace[entry_point]

try:
    exec(test_code, namespace)
except Exception as error:
    result.update({"error": "test_import_error", "details": str(error), "traceback": traceback.format_exc()})
    emit(result)
    sys.exit(0)

if "check" not in namespace:
    result.update({"error": "missing_check_function"})
    emit(result)
    sys.exit(0)

try:
    namespace["check"](namespace[entry_point])
    result.update({"passed": True})
except AssertionError as assertion_error:
    result.update({"error": "assertion_error", "details": str(assertion_error)})
except Exception as runtime_error:
    result.update({"error": "runtime_error", "details": str(runtime_error), "traceback": traceback.format_exc()})

emit(result)
sys.exit(0)
`;
  }

  /**
   * Attempt to extract pure Python code from LLM output.
   * - Extract the first fenced code block if present
   * - Strip triple backticks and language tags
   * - Drop anything before "# Your solution:" if present
   * - Optionally trim any "if __name__ == '__main__'" usage examples
   * This is best-effort and keeps original text if no obvious wrappers are found.
   * @private
   */
  _sanitizePythonCandidate(text, entryPoint) {
    if (typeof text !== 'string') return '';
    let s = text.trim();

    // If output contains a marker, keep text after it
    const markerIdx = s.indexOf('# Your solution:');
    if (markerIdx !== -1) {
      s = s.slice(markerIdx + '# Your solution:'.length).trimStart();
    }

    // Extract fenced code block if present
    const fenceRe = /```(?:python|py)?\s*([\s\S]*?)```/i;
    const fenceMatch = s.match(fenceRe);
    if (fenceMatch && fenceMatch[1]) {
      s = fenceMatch[1].trim();
    }

    // Remove stray backticks lines
    s = s.replace(/^```.*$/gm, '').trim();

    // Strip common leading prose like "Here is the function" on its own line
    s = s.replace(/^(?:Here is .*?:|Solution:|Answer:|Code:|Implementation:)[\s\S]*?\n+/i, '').trim();

    // If entryPoint is known, try to discard anything before its definition
    if (entryPoint && typeof entryPoint === 'string') {
      const lit = `def ${entryPoint}`;
      let idx = s.indexOf(lit);
      if (idx < 0) {
        const esc = entryPoint.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
        try {
          const re = new RegExp(`(^|\\n)\\s*def\\s+${esc}\\s*\\(`, 'm');
          const m = s.match(re);
          if (m && m.index !== undefined) {
            idx = m.index + (m[1] ? m[1].length : 0);
          }
        } catch (_) {
          idx = -1;
        }
      }
      if (idx >= 0) {
        const before = s.slice(0, idx);
        const hasCodeBefore = /\bdef\b/.test(before) || /\bclass\b/.test(before) || /\bimport\b/.test(before);
        if (!hasCodeBefore) {
          s = s.slice(idx);
        }
      }
    }

    // Remove typical main-guard snippets and prints/examples
    s = s.replace(/if __name__ == ['\"]__main__['\"]:[\s\S]*$/m, '').trim();

    return s;
  }

  /**
   * Extracts the trailing JSON object from stdout/stderr.
   * @private
   */
  _extractLastJson(output) {
    if (!output) return null;
    const lines = output
      .toString()
      .trim()
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      try {
        return JSON.parse(line);
      } catch (_) {
        continue;
      }
    }

    return null;
  }
}
