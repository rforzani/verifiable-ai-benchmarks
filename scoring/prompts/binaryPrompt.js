/**
 * Binary scoring prompt template
 * Evaluates agent output as PASS or FAIL
 */

export function binaryPrompt({ agentOutput, idealOutput, criteria }) {
  return `You are evaluating an AI agent's output against an ideal reference output.

Your task is to determine if the agent's output is functionally equivalent to the ideal output, even if the implementation differs.

IDEAL OUTPUT (reference/expected):
\`\`\`
${idealOutput}
\`\`\`

AGENT'S ACTUAL OUTPUT:
\`\`\`
${agentOutput}
\`\`\`

EVALUATION CRITERIA:
${criteria}

INSTRUCTIONS:
- Respond with ONLY "PASS" or "FAIL"
- PASS if: The agent output achieves the same goal/functionality as the ideal output, even if the exact implementation or wording differs
- PASS if: Minor stylistic differences exist but core functionality is correct
- FAIL if: The agent output does not meet the requirements
- FAIL if: Critical functionality is missing or incorrect
- FAIL if: The output is empty, irrelevant, or contains major errors

Your response (PASS or FAIL):`;
}
