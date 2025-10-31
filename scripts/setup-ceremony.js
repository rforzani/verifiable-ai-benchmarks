import * as snarkjs from 'snarkjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const circuitsDir = path.join(projectRoot, 'circuits');

async function performTrustedSetup() {
  console.log('🔐 Agent Verifier - Dual Circuit Trusted Setup Ceremony');
  console.log('='.repeat(60));

  const mainR1csPath = path.join(circuitsDir, 'verifier.r1cs');
  const subsetR1csPath = path.join(circuitsDir, 'verifier-subset.r1cs');

  // Shared Powers of Tau (can be reused across both circuits)
  // Power 20 supports up to 2^20 = 1,048,576 constraints (our main circuit has ~637k)
  const ptauRawPath = path.join(circuitsDir, 'powersOfTau28_hez_20.ptau');
  const ptauPath = path.join(circuitsDir, 'powersOfTau28_hez_final_20.ptau');

  // Main circuit keys
  const mainZkeyIntermediatePath = path.join(circuitsDir, 'verifier_0001.zkey');
  const mainZkeyPath = path.join(circuitsDir, 'verifier_final.zkey');
  const mainVkeyPath = path.join(circuitsDir, 'verification_key.json');

  // Subset circuit keys
  const subsetZkeyIntermediatePath = path.join(circuitsDir, 'verifier-subset_0001.zkey');
  const subsetZkeyPath = path.join(circuitsDir, 'verifier-subset_final.zkey');
  const subsetVkeyPath = path.join(circuitsDir, 'verification_key_subset.json');

  try {
    // Check if both circuits exist
    if (!fs.existsSync(mainR1csPath) || !fs.existsSync(subsetR1csPath)) {
      console.error('✗ Circuits not compiled!');
      console.error('\nPlease run: npm run compile:circuits');
      process.exit(1);
    }

    console.log('✓ Found both compiled circuits');

    // Step 1: Download or use Powers of Tau (shared between circuits)
    console.log('\n[1/7] Setting up Powers of Tau (shared)...');

    if (!fs.existsSync(ptauPath)) {
      console.log('  Downloading Powers of Tau (this may take a moment)...');
      console.log('  For production, use: https://github.com/iden3/snarkjs#7-prepare-phase-2');

      // For now, generate a small ptau for testing (NOT secure for production)
      console.log('  Generating test ptau (NOT secure for production)...');

      // Build curve and create a raw ptau (Phase 1)
      const curve = await snarkjs.curves.getCurveFromName('BN128');
      const power = 20; // 2^20 = 1,048,576 constraints (main circuit has ~637k)
      await snarkjs.powersOfTau.newAccumulator(curve, power, ptauRawPath, console);

      // Prepare Phase 2 (required for groth16 setup)
      await snarkjs.powersOfTau.preparePhase2(ptauRawPath, ptauPath, console);

      // Optional: cleanup raw ptau
      try { fs.unlinkSync(ptauRawPath); } catch (_) {}

      console.log('  ⚠️  WARNING: Using test ptau. For production, download from:');
      console.log('      https://github.com/iden3/snarkjs#7-prepare-phase-2');
    } else {
      console.log('  ✓ Found existing Powers of Tau');
    }

    // Step 2: Generate zkey for main circuit (Phase 2 - circuit-specific)
    console.log('\n[2/7] Generating proving key for main circuit (Phase 2)...');

    await snarkjs.zKey.newZKey(mainR1csPath, ptauPath, mainZkeyIntermediatePath);
    console.log('  ✓ Main circuit proving key (initial) generated');

    // Step 3: Contribute to ceremony for main circuit
    console.log('\n[3/7] Contributing to main circuit ceremony...');

    const mainContributionName = 'Agent Verifier Main Contribution';
    const mainContributionEntropy = Math.random().toString();

    await snarkjs.zKey.contribute(
      mainZkeyIntermediatePath,
      mainZkeyPath,
      mainContributionName,
      mainContributionEntropy
    );

    console.log('  ✓ Main circuit contribution added');

    // Step 4: Export verification key for main circuit
    console.log('\n[4/7] Exporting main circuit verification key...');

    const mainVKey = await snarkjs.zKey.exportVerificationKey(mainZkeyPath);

    await fs.promises.writeFile(
      mainVkeyPath,
      JSON.stringify(mainVKey, null, 2)
    );

    console.log('  ✓ Main circuit verification key exported');

    // Step 5: Generate zkey for subset circuit
    console.log('\n[5/7] Generating proving key for subset circuit (Phase 2)...');

    await snarkjs.zKey.newZKey(subsetR1csPath, ptauPath, subsetZkeyIntermediatePath);
    console.log('  ✓ Subset circuit proving key (initial) generated');

    // Step 6: Contribute to ceremony for subset circuit
    console.log('\n[6/7] Contributing to subset circuit ceremony...');

    const subsetContributionName = 'Agent Verifier Subset Contribution';
    const subsetContributionEntropy = Math.random().toString();

    await snarkjs.zKey.contribute(
      subsetZkeyIntermediatePath,
      subsetZkeyPath,
      subsetContributionName,
      subsetContributionEntropy
    );

    console.log('  ✓ Subset circuit contribution added');

    // Step 7: Export verification key for subset circuit
    console.log('\n[7/7] Exporting subset circuit verification key...');

    const subsetVKey = await snarkjs.zKey.exportVerificationKey(subsetZkeyPath);

    await fs.promises.writeFile(
      subsetVkeyPath,
      JSON.stringify(subsetVKey, null, 2)
    );

    console.log('  ✓ Subset circuit verification key exported');

    // Display key info
    console.log('\n' + '='.repeat(60));
    console.log('✅ Dual circuit trusted setup complete!');
    console.log('\nGenerated files:');
    console.log('  Main Circuit:');
    console.log('    - verifier_final.zkey (proving key)');
    console.log('    - verification_key.json (verification key)');
    console.log('  Subset Circuit:');
    console.log('    - verifier-subset_final.zkey (proving key)');
    console.log('    - verification_key_subset.json (verification key)');
    console.log('\nCircuit capabilities:');
    console.log('  Main Circuit:');
    console.log('    - Up to 100 tests (full dataset)');
    console.log('    - Dual-proof verification with subset linking');
    console.log('    - Enhanced commitments (logs, library version, scoring)');
    console.log('  Subset Circuit:');
    console.log('    - Up to 10 public tests (10% subset)');
    console.log('    - Simple public verification (no commitments needed)');
    console.log('  Both:');
    console.log('    - Score range: 0-100');
    console.log('    - Groth16 proof system');

    console.log('\n⚠️  Security Note:');
    console.log('  This setup uses a test ceremony. For production:');
    console.log('  1. Use perpetual Powers of Tau');
    console.log('  2. Perform multiple contributions');
    console.log('  3. Conduct a secure MPC ceremony');

  } catch (error) {
    console.error('\n❌ Trusted setup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

performTrustedSetup();
