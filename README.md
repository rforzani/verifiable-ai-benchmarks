# no-reveal-agent-eval

**Private AI benchmarks, public verification.**  
This repository contains an implementation of a cryptographic evaluation pipeline that lets you publish *verifiable* AI/agent scores **without revealing** the private part of your benchmark.

It follows the idea of **dual zero-knowledge circuits**:
- one circuit proves the score on a **public** subset of tests (anyone can re-run these);
- one circuit proves the score on the **full** benchmark (public + hidden) **without showing** the hidden tests.

Both circuits are bound to:
- the **exact evaluation code** (content-addressable / Git commit),
- the **exact benchmark structure** (Merkle tree root),
- the **exact execution logs** (log hashing),
so the prover cannot evaluate with one method on public data and a looser method on private data.

---

## Why this exists

Evaluation of AI agents is stuck between two bad options:

1. **Fully public benchmarks** → great for reproducibility, but people overfit and the benchmark loses value.
2. **Fully private evaluation** → protects the test set, but everyone must “just trust” the evaluator.

This project shows that you don’t actually have to choose. With zero-knowledge proofs you can:
- keep the real test suite private,
- still prove you ran the **committed** evaluator on the **committed** tests,
- let others re-run the public slice to check you’re honest,
- and only reveal individual private tests **if someone challenges you**.

---

## What the system does

- Splits a benchmark into **public** and **private** partitions.
- Builds **Merkle tree commitments** for the tests (so later you can reveal single tests with their proof of inclusion).
- Wraps the agent-evaluation logic (judge, scoring, prompts, tool limits…) in a **content-addressable library** so the proof ties to a specific code version.
- Records agent behavior in **structured logs**, then commits to them with a hash.
- Generates **two Groth16 proofs**:
  - **Public proof**: proves accuracy `k1` on the revealed tests — anyone can re-evaluate these.
  - **Private proof**: proves accuracy `k2` on the full benchmark — but does not reveal the hidden tests.
- Allows **selective disclosure**: if there’s a dispute, you can reveal *just* the test and its log, plus the Merkle path, without dumping the whole dataset.

---

## Key ideas

- **Transparency through code**: the evaluator is not prose, it’s a versioned library. The proof checks the *hash* of that library.
- **Privacy through commitments**: tests and logs are not published, only their Merkle/hash roots are.
- **Two-layer verification**:
  - empirical: “I can re-run the public tests and I get the same numbers”
  - cryptographic: “I can verify the proof for the full benchmark even if I don’t see the private tests”
- **Challenge–response**: disclosure is **on demand**, not by default.

---

## Contributions (summary)

1. A **dual-circuit** ZK design for mixed-visibility AI benchmarks (public + hidden) with shared commitments.
2. A way to **bind** evaluation methodology, test structure and execution traces so they can’t be swapped after the fact.
3. A **selective transparency** mechanism: reveal single tests/logs with Merkle paths when challenged, keep the rest private.

---

## Status

- ✅ Core idea and prototype pipeline
- ✅ Groth16-based circuits for public/private partitions
- ✅ Merkle commitments for tests
- ✅ Log hashing
- 🟡 More adapters for different agent SDKs or a universal Wrapper to be created

---

## License

Apache 2.0
