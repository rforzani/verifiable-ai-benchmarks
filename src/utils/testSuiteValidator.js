/**
 * Test suite validation utilities
 */

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate test suite structure and content
 * @param {Array} testSuite - Test suite to validate
 * @throws {ValidationError} If validation fails
 */
export function validateTestSuite(testSuite) {
  // Must be an array
  if (!Array.isArray(testSuite)) {
    throw new ValidationError('Test suite must be an array');
  }

  // Must not be empty
  if (testSuite.length === 0) {
    throw new ValidationError('Test suite cannot be empty');
  }

  const ids = new Set();

  for (let i = 0; i < testSuite.length; i++) {
    const test = testSuite[i];

    // Check required fields
    if (!test.id) {
      throw new ValidationError(`Test at index ${i} missing required field: id`);
    }

    if (!test.prompt) {
      throw new ValidationError(`Test at index ${i} missing required field: prompt`);
    }

    if (!test.idealOutput) {
      throw new ValidationError(`Test at index ${i} missing required field: idealOutput`);
    }

    if (!test.scoringType) {
      throw new ValidationError(`Test at index ${i} missing required field: scoringType`);
    }

    // Validate field types
    if (typeof test.id !== 'string') {
      throw new ValidationError(`Test at index ${i}: id must be a string`);
    }

    if (typeof test.prompt !== 'string') {
      throw new ValidationError(`Test at index ${i}: prompt must be a string`);
    }

    if (typeof test.idealOutput !== 'string') {
      throw new ValidationError(`Test at index ${i}: idealOutput must be a string`);
    }

    // Check unique IDs
    if (ids.has(test.id)) {
      throw new ValidationError(`Duplicate test ID: ${test.id}`);
    }
    ids.add(test.id);

    // Check valid scoring type
    if (!['binary', 'numeric'].includes(test.scoringType)) {
      throw new ValidationError(
        `Test ${test.id}: invalid scoringType "${test.scoringType}". Must be "binary" or "numeric"`
      );
    }

    // Validate optional fields
    if (test.scoringCriteria !== undefined && typeof test.scoringCriteria !== 'string') {
      throw new ValidationError(`Test ${test.id}: scoringCriteria must be a string`);
    }
  }
}

/**
 * Normalize test case for consistent processing
 * @param {object} test - Test case
 * @returns {object} Normalized test case
 */
export function normalizeTestCase(test) {
  return {
    id: test.id,
    prompt: test.prompt.trim(),
    idealOutput: test.idealOutput.trim(),
    scoringType: test.scoringType,
    scoringCriteria: test.scoringCriteria?.trim() || null,
    metadata: test.metadata || {}
  };
}
