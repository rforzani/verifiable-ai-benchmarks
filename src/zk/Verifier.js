import * as snarkjs from 'snarkjs';

/**
 * ZK Proof Verifier
 * Verifies Groth16 proofs for agent verification
 */
export class Verifier {
  /**
   * Verify a ZK proof
   * @param {object} proof - The proof object
   * @param {object} publicInputs - Public inputs {merkleRoot, score, numTests}
   * @param {object} verificationKey - Verification key
   * @returns {Promise<boolean>} True if proof is valid
   */
  async verify(proof, publicInputs, verificationKey) {
    // Check if this is a placeholder proof
    if (proof.isPlaceholder || verificationKey.nPublic === undefined) {
      console.warn('⚠️  Verifying placeholder proof (always returns true)');
      console.warn('   Setup real ZK proofs: npm run compile:circuits && npm run setup:ceremony');
      return this.verifyPlaceholder(proof, publicInputs);
    }

    try {
      // Format public signals in correct order (must match circuit)
      const publicSignals = this.formatPublicSignals(publicInputs);

      // Verify using snarkjs
      const isValid = await snarkjs.groth16.verify(
        verificationKey,
        publicSignals,
        proof
      );

      return isValid;

    } catch (error) {
      console.error('❌ Proof verification failed:', error.message);
      return false;
    }
  }

  /**
   * Format public inputs as signals array
   * @private
   */
  formatPublicSignals(publicInputs) {
    // Must match the order in the circuit's public inputs
    // Circom computations happen in the BN128 scalar field (Fr), so any
    // large input like a SHA-256 hash must be reduced modulo r.
    const BN128_R = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

    const merkleRootModR = (BigInt('0x' + publicInputs.merkleRoot) % BN128_R).toString();
    const claimedScore = Math.round(publicInputs.score).toString();
    const numTests = publicInputs.numTests.toString();

    return [merkleRootModR, claimedScore, numTests];
  }

  /**
   * Verify placeholder proof (basic sanity checks)
   * @private
   */
  verifyPlaceholder(proof, publicInputs) {
    // Just verify the public signals match
    if (!proof.publicSignals || proof.publicSignals.length !== 3) {
      return false;
    }

    // Check merkle root matches
    const claimedMerkleRoot = proof.publicSignals[0];
    const expectedMerkleRoot = BigInt('0x' + publicInputs.merkleRoot).toString();

    if (claimedMerkleRoot !== expectedMerkleRoot) {
      return false;
    }

    // Check score matches
    const claimedScore = parseInt(proof.publicSignals[1], 10);
    const expectedScore = Math.round(publicInputs.score);

    if (claimedScore !== expectedScore) {
      return false;
    }

    // Check numTests matches
    const claimedNumTests = parseInt(proof.publicSignals[2], 10);
    if (claimedNumTests !== publicInputs.numTests) {
      return false;
    }

    return true;
  }

  /**
   * Verify proof from exported JSON files
   * @param {string} proofPath - Path to proof JSON
   * @param {string} publicInputsPath - Path to public inputs JSON
   * @param {string} vkeyPath - Path to verification key JSON
   * @returns {Promise<boolean>} True if proof is valid
   */
  async verifyFromFiles(proofPath, publicInputsPath, vkeyPath) {
    const fs = await import('fs');

    const proof = JSON.parse(await fs.promises.readFile(proofPath, 'utf8'));
    const publicInputs = JSON.parse(await fs.promises.readFile(publicInputsPath, 'utf8'));
    const vkey = JSON.parse(await fs.promises.readFile(vkeyPath, 'utf8'));

    return this.verify(proof, publicInputs, vkey);
  }
}
