pragma circom 2.0.0;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/switcher.circom";

/*
 * Merkle Tree Path Verifier
 *
 * Verifies that a leaf is included in a Merkle tree by checking the authentication path.
 * Uses Poseidon hash for cryptographic security.
 *
 * Proves: The leaf at the given path index hashes to the claimed root.
 */
template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal input root;

    component selectors[levels];
    component hashers[levels];

    signal hashes[levels + 1];
    hashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        // Determine whether we hash (current, sibling) or (sibling, current)
        // based on the path index bit
        selectors[i] = Switcher();
        selectors[i].sel <== pathIndices[i];
        selectors[i].L <== hashes[i];
        selectors[i].R <== pathElements[i];

        // Hash the pair
        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== selectors[i].outL;
        hashers[i].inputs[1] <== selectors[i].outR;

        hashes[i + 1] <== hashers[i].out;
    }

    // Final hash must match the claimed root
    root === hashes[levels];
}

/*
 * Multi-element Merkle Tree Verifier
 *
 * Verifies multiple leaves are included in the same Merkle tree.
 * Useful for verifying a subset of test cases.
 */
template MerkleMultiChecker(numLeaves, levels) {
    signal input leaves[numLeaves];
    signal input pathElements[numLeaves][levels];
    signal input pathIndices[numLeaves][levels];
    signal input root;

    component checkers[numLeaves];

    for (var i = 0; i < numLeaves; i++) {
        checkers[i] = MerkleTreeChecker(levels);
        checkers[i].leaf <== leaves[i];
        for (var j = 0; j < levels; j++) {
            checkers[i].pathElements[j] <== pathElements[i][j];
            checkers[i].pathIndices[j] <== pathIndices[i][j];
        }
        checkers[i].root <== root;
    }
}

/*
 * Test Case Leaf Hash Computer
 *
 * Computes the Merkle tree leaf hash for a single test case.
 * Hash includes all test data to ensure integrity.
 *
 * Leaf = Poseidon(testId, promptHash, idealOutputHash, agentOutputHash, score)
 */
template TestCaseLeafHash() {
    signal input testId;
    signal input promptHash;
    signal input idealOutputHash;
    signal input agentOutputHash;
    signal input score;

    signal output leafHash;

    component hasher = Poseidon(5);
    hasher.inputs[0] <== testId;
    hasher.inputs[1] <== promptHash;
    hasher.inputs[2] <== idealOutputHash;
    hasher.inputs[3] <== agentOutputHash;
    hasher.inputs[4] <== score;

    leafHash <== hasher.out;
}

/*
 * Batch Test Case Leaf Hash Computer
 *
 * Computes Merkle leaf hashes for multiple test cases.
 */
template BatchTestCaseLeafHash(numTests) {
    signal input testIds[numTests];
    signal input promptHashes[numTests];
    signal input idealOutputHashes[numTests];
    signal input agentOutputHashes[numTests];
    signal input scores[numTests];

    signal output leafHashes[numTests];

    component hashers[numTests];

    for (var i = 0; i < numTests; i++) {
        hashers[i] = TestCaseLeafHash();
        hashers[i].testId <== testIds[i];
        hashers[i].promptHash <== promptHashes[i];
        hashers[i].idealOutputHash <== idealOutputHashes[i];
        hashers[i].agentOutputHash <== agentOutputHashes[i];
        hashers[i].score <== scores[i];

        leafHashes[i] <== hashers[i].leafHash;
    }
}

/*
 * Merkle Tree Root Computer (Fixed Size)
 *
 * Builds a complete binary Merkle tree from a fixed number of leaves.
 * The tree is built bottom-up by hashing pairs of nodes at each level.
 * For odd numbers of nodes, the last node is duplicated.
 *
 * This matches the standard Merkle tree construction algorithm.
 *
 * Parameters:
 * - numLeaves: Must be a power of 2 OR we handle padding
 * - levels: log2(numLeaves)
 *
 * For 16 leaves: levels = 4 (16 → 8 → 4 → 2 → 1)
 * For 10 leaves padded to 16: same, pad with zeros
 */
template MerkleTreeRoot(numLeaves, levels) {
    signal input leaves[numLeaves];
    signal output root;

    // We'll build the tree level by level
    // Level 0 = leaves, Level 'levels' = root

    // For 16 leaves (2^4), we need arrays sized for:
    // Level 0: 16, Level 1: 8, Level 2: 4, Level 3: 2, Level 4: 1
    // We'll use the maximum size (numLeaves) for all levels for simplicity

    signal nodes[levels + 1][numLeaves];
    component hashers[levels][numLeaves / 2];

    // Level 0: Copy input leaves
    for (var i = 0; i < numLeaves; i++) {
        nodes[0][i] <== leaves[i];
    }

    // Build tree level by level
    // At each level, we hash pairs of nodes
    var nodesInLevel = numLeaves;

    for (var level = 0; level < levels; level++) {
        var nodesInNextLevel = nodesInLevel \ 2; // Integer division

        for (var i = 0; i < nodesInNextLevel; i++) {
            hashers[level][i] = Poseidon(2);
            hashers[level][i].inputs[0] <== nodes[level][2 * i];
            hashers[level][i].inputs[1] <== nodes[level][2 * i + 1];
            nodes[level + 1][i] <== hashers[level][i].out;
        }

        // If odd number of nodes, duplicate the last one
        // Note: This only matters if nodesInLevel is odd, which happens
        // when we're not working with a perfect power of 2
        // For our use case (padding to power of 2), this won't trigger
        // But we include it for completeness
        if (nodesInLevel % 2 == 1) {
            nodes[level + 1][nodesInNextLevel] <== nodes[level][nodesInLevel - 1];
            nodesInNextLevel = nodesInNextLevel + 1;
        }

        nodesInLevel = nodesInNextLevel;
    }

    // Root is at nodes[levels][0]
    root <== nodes[levels][0];
}
