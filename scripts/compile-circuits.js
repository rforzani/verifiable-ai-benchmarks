import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const circuitsDir = path.join(projectRoot, 'src/zk/circuits');
const outputDir = path.join(projectRoot, 'circuits');

async function compileCircuits() {
  console.log('🔧 Agent Verifier - Dual Circuit Compilation');
  console.log('='.repeat(60));

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    // Check if circom is installed
    console.log('\n[1/5] Checking circom installation...');
    try {
      const { stdout } = await execAsync('circom --version');
      console.log('✓ Circom found:', stdout.trim());
    } catch (error) {
      console.error('✗ Circom not found!');
      console.error('\nPlease install circom:');
      console.error('  npm install -g circom');
      console.error('  or visit: https://docs.circom.io/getting-started/installation/');
      process.exit(1);
    }

    // Compile main verifier circuit (full dataset)
    console.log('\n[2/5] Compiling main verifier circuit (full dataset)...');
    const mainCircuitPath = path.join(circuitsDir, 'verifier.circom');

    const mainCompileCmd = `circom ${mainCircuitPath} --r1cs --wasm --sym -o ${outputDir}`;
    console.log('  Running:', mainCompileCmd);

    const { stdout: mainOut, stderr: mainErr } = await execAsync(mainCompileCmd);

    if (mainErr) {
      console.log('  Compilation output:', mainErr);
    }

    console.log('✓ Main circuit compiled successfully');
    console.log('  Generated files:');
    console.log('    - verifier.r1cs (constraint system)');
    console.log('    - verifier.wasm (witness generator)');
    console.log('    - verifier.sym (symbol table)');

    // Compile subset verifier circuit (public 5%)
    console.log('\n[3/5] Compiling subset verifier circuit (public 5%)...');
    const subsetCircuitPath = path.join(circuitsDir, 'verifier-subset.circom');

    const subsetCompileCmd = `circom ${subsetCircuitPath} --r1cs --wasm --sym -o ${outputDir}`;
    console.log('  Running:', subsetCompileCmd);

    const { stdout: subsetOut, stderr: subsetErr } = await execAsync(subsetCompileCmd);

    if (subsetErr) {
      console.log('  Compilation output:', subsetErr);
    }

    console.log('✓ Subset circuit compiled successfully');
    console.log('  Generated files:');
    console.log('    - verifier-subset.r1cs (constraint system)');
    console.log('    - verifier-subset.wasm (witness generator)');
    console.log('    - verifier-subset.sym (symbol table)');

    // Generate circuit info for main circuit
    console.log('\n[4/5] Generating main circuit info...');
    const mainInfoCmd = `snarkjs r1cs info ${path.join(outputDir, 'verifier.r1cs')}`;

    try {
      const { stdout: infoOut } = await execAsync(mainInfoCmd);
      console.log('✓ Main circuit info:');
      console.log(infoOut);
    } catch (error) {
      console.log('  (snarkjs not found - skipping info)');
    }

    // Generate circuit info for subset circuit
    console.log('\n[5/5] Generating subset circuit info...');
    const subsetInfoCmd = `snarkjs r1cs info ${path.join(outputDir, 'verifier-subset.r1cs')}`;

    try {
      const { stdout: infoOut } = await execAsync(subsetInfoCmd);
      console.log('✓ Subset circuit info:');
      console.log(infoOut);
    } catch (error) {
      console.log('  (snarkjs not found - skipping info)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Dual circuit compilation complete!');
    console.log('\nNext steps:');
    console.log('  1. Run trusted setup: npm run setup:ceremony');
    console.log('  2. Use the library with dual ZK proofs!');

  } catch (error) {
    console.error('\n❌ Compilation failed:', error.message);
    if (error.stderr) {
      console.error('\nError details:', error.stderr);
    }
    process.exit(1);
  }
}

compileCircuits();
