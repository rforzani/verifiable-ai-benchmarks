/**
 * Numeric scoring prompt template
 * Evaluates agent output on a 0-100 scale
 */

export function numericPrompt({ agentOutput, idealOutput, criteria }) {
  return `You are evaluating an AI agent's output on a numeric scale from 0 to 100.

IDEAL OUTPUT (reference):
\`\`\`
${idealOutput}
\`\`\`

AGENT'S ACTUAL OUTPUT:
\`\`\`
${agentOutput}
\`\`\`

EVALUATION CRITERIA:
${criteria}

SCORING RUBRIC:
- 0-20: Completely wrong, irrelevant, or no meaningful output
- 21-40: Partially correct but with major issues or missing key components
- 41-60: Somewhat correct with significant gaps or errors
- 61-80: Mostly correct with minor issues or missing details
- 81-95: Very good, meets requirements with only trivial issues
- 96-100: Excellent, meets or exceeds all requirements

EVALUATION FACTORS:
- Correctness: Does it solve the problem correctly?
- Completeness: Are all requirements addressed?
- Quality: Is the solution well-structured and appropriate?

INSTRUCTIONS:
- Respond with ONLY a single number between 0 and 100
- Do not include any explanation or additional text
- Be fair but precise in your evaluation

Your score (0-100):`;
}
