# Private AI Benchmarks with Public Verification via Dual-Circuit Zero-Knowledge Proofs

## Table of Contents

1. [Abstract](#abstract)
2. [Introduction](#introduction)
3. [Related Work](#3-related-work)
   - [3.1 AI Benchmarking and Evaluation Integrity](#31-ai-benchmarking-and-evaluation-integrity)
   - [3.2 Zero-Knowledge Proofs in Machine Learning](#32-zero-knowledge-proofs-in-machine-learning)
   - [3.3 Verifiable Computation and Authenticated Execution](#33-verifiable-computation-and-authenticated-execution)
   - [3.4 Gap Identification and Positioning](#34-gap-identification-and-positioning)
4. [Technical Approach](#4-technical-approach)
   - [4.1 Problem Formalization and Threat Model](#41-problem-formalization-and-threat-model)
   - [4.2 Architecture Overview](#42-architecture-overview)
   - [4.3 Cryptographic Commitments](#43-cryptographic-commitments)
   - [4.4 Subset Circuit Design](#44-subset-circuit-design)
   - [4.5 Main Circuit Design](#45-main-circuit-design)
   - [4.6 Selective Disclosure Protocol](#46-selective-disclosure-protocol)
   - [4.7 Proof Generation and Verification Protocol](#47-proof-generation-and-verification-protocol)
5. [Implementation](#5-implementation)
   - [5.1 Circuit Implementation](#51-circuit-implementation)
   - [5.2 Evaluation Framework](#52-evaluation-framework)
   - [5.3 Verification Implementation](#53-verification-implementation)
6. [Experimental Evaluation](#6-experimental-evaluation)
   - [6.1 Experimental Setup](#61-experimental-setup)
   - [6.2 Correctness Validation](#62-correctness-validation)
   - [6.3 Computational Performance Analysis](#63-computational-performance-analysis)
   - [6.4 Proof System Validation](#64-proof-system-validation)
   - [6.5 System Requirements Analysis](#65-system-requirements-analysis)
   - [6.6 Proof Package Availability and Reproducibility](#66-proof-package-availability-and-reproducibility)
7. [References](#references)

## Abstract

AI benchmark providers face a fundamental dilemma between publishing test cases to enable verification and keeping them private to prevent overfitting. We present a cryptographic framework that resolves this tension through dual zero-knowledge proof circuits operating on public and private test partitions. Our system generates two Groth16 proofs that cryptographically guarantee identical evaluation methodology. The first circuit proves accuracy on revealed test cases that anyone can independently reproduce. The second circuit proves accuracy on the complete benchmark including hidden tests. Merkle tree commitments bind test structure and enable selective disclosure for challenge-response protocols. Content-addressable library versioning and execution log hashing prevent methodology substitution attacks where different procedures are applied to public versus private tests.

We implement the system and evaluate it on established benchmarks with up to one thousand test cases. Empirical testing reproduces published accuracy results for multiple models, validating correctness of the cryptographic evaluation pipeline. Proof generation completes within practical time bounds on standard hardware, while verification time remains constant regardless of private test set size. Compared to trusted third-party evaluation, our approach eliminates centralized trust assumptions while adding modest computational overhead. Compared to fully public benchmarks, we maintain equivalent verifiability while protecting against overfitting. This framework enables benchmark providers to maintain proprietary test suites while providing cryptographic guarantees of performance claims.

---

## Introduction

Evaluating artificial intelligence systems requires benchmarks that accurately measure capabilities while resisting gaming through repeated optimization. This issue of benchmark measurement validity has intensified as foundation models have achieved high-level performance on established tests. When benchmarks are fully public, they inevitably cause models to optimize specifically through memorization of common test patterns, and eventually achieve scores that exceed their genuine capabilities on novel tasks. The phenomenon manifests across domains from question answering to code generation, where models demonstrate impressive benchmark performance yet can lower their performance with similar but unseen problems. Recent 2024 Datasets and Benchmarks research [1] shows that even top-performing large language models suffer notable accuracy drops—up to 8%—when evaluated on newly created tests that closely resemble, but are not identical to, widely used benchmarks, indicating that their purported abilities often reflect overfitting rather than true generalization. This pattern underscores the critical importance of preventing benchmark contamination in evaluating genuine model capabilities.

Organizations developing proprietary AI systems face difficult choices when reporting performance. Publishing complete test suites enables transparent verification but exposes benchmarks to contamination. Independent auditors can reproduce claimed results through direct execution, providing strong evidence of accuracy. However, once test cases enter the public domain, they lose value as future evaluation instruments. Models trained after publication can incorporate test content directly or indirectly through data pipelines that aggregate internet content. The benchmark becomes a measure of memorization rather than capability.

Keeping test suites private preserves benchmark integrity but sacrifices verifiability. Researchers must either trust self-reported results or rely on third-party evaluation services. The former approach provides no assurance that claimed performance reflects actual capabilities. The latter approach concentrates trust in evaluators who must maintain secure infrastructure, resist social engineering, and avoid conflicts of interest. Both alternatives prove unsatisfactory for high-stakes decisions about model deployment, procurement, or regulatory compliance where independent verification is essential.

Presently, the strategies employed to resolve this dilemma each entail significant trade-offs that constrain their practical utility in rigorous evaluation settings. Hardware-secured trusted execution environments offer cryptographic guarantees of benchmark integrity and model isolation, but their adoption necessitates proprietary infrastructure and engenders dependence on a limited set of hardware vendors, thereby introducing systemic trust and supply-chain risks. Periodically refreshing benchmark suites—in which new test cases are generated and the previous ones are retired once compromised—creates a perpetual cycle of arms race between evaluators and developers. This approach imposes sustained resource and engineering burdens, disrupts longitudinal performance tracking, and can obscure trends in model development due to shifting evaluation criteria. Federated evaluation protocols, which distribute verification tasks among multiple semi-trusted parties, can attenuate centralized risk but entail substantial logistical and coordination overhead, as well as residual reliance on the integrity of at least some participating evaluators. Finally, differential privacy mechanisms can mathematically constrain the information a model extracts from test interactions, thus limiting the extent of inadvertent benchmark leakage. However, these techniques cannot fully address the structural vulnerability that once test cases are disseminated—be it through leakage or publication—their utility as unbiased evaluative instruments is fundamentally compromised. As a result, current methodologies for safeguarding benchmark validity remain subject to operational, technical, and trust-related limitations that hinder their effectiveness for high-stakes independent verification.

This paper presents a cryptographic framework that fundamentally reconsiders the relationship between transparency and privacy in AI evaluation. Rather than treating these properties as opposed objectives requiring compromise, we recognize that modern zero-knowledge proof systems enable demonstrating claims about private data without revealing the data itself. By carefully decomposing the evaluation process into components that can be independently committed through cryptographic primitives, we construct a system that provides cryptographic verification of performance claims while maintaining test case privacy by default, with selective disclosure capabilities that enable responding to specific challenges without complete revelation.

The key technical insight is that AI agent evaluation comprises multiple separable components, each amenable to cryptographic binding. The test cases themselves can be committed through Merkle trees, creating a cryptographic fingerprint that uniquely identifies the test suite without revealing individual tests. The evaluation methodology, including judging logic and scoring procedures, can be bound through content-addressable versioning that commits to specific, auditable code implementations. The actual execution behavior during evaluation can be captured through comprehensive logging and committed through cryptographic hashing. Zero-knowledge proof circuits can then demonstrate that claimed performance metrics are mathematically consistent with these committed components, proving that specific accuracy thresholds were achieved on the committed test suite using the committed methodology, without revealing the private test cases, execution traces, or intermediate results.

Our framework employs a dual-circuit architecture that stratifies verification across public and private test partitions. The first circuit operates on a revealed subset of test cases that anyone can independently reproduce, providing immediate empirical validation of claimed performance on a representative sample. The second circuit operates on the complete test suite including both public and private tests, proving that the same evaluation methodology applied to the larger benchmark yields the claimed overall accuracy. The cryptographic binding between these circuits ensures that the public subset is genuinely part of the complete set and that methodology remains consistent across both portions. This architecture enables stakeholders to reproduce results on the public portion for empirical validation, verify zero-knowledge proofs for the complete evaluation for cryptographic assurance, and request selective disclosure of specific private tests for challenge response, creating a layered verification structure that balances efficiency with thoroughness.

Verification remains extremely efficient regardless of scale. The system imposes modest storage overhead for proofs and disclosure of public test sets, with typical proof file sizes under forty kilobytes regardless of the underlying benchmark size. These performance characteristics indicate that the approach scales to production use cases while maintaining the strong verification properties that zero-knowledge proofs provide.

The contributions of this work are threefold. First, we present the architecture and implementation of a dual-circuit zero-knowledge proof system for AI evaluation that cryptographically binds test structure, evaluation methodology, and execution traces while enabling selective transparency. Second, we provide comprehensive performance evaluation demonstrating practical feasibility at realistic benchmark scales, including detailed analysis of proof generation time, verification efficiency, and storage requirements. Third, we contribute security analysis establishing the threat model, analyzing attack vectors, and demonstrating how the cryptographic composition of Merkle commitments, versioned methodology binding, and execution log commitments creates robust guarantees against manipulation while supporting privacy preservation.

---

## 3. Related Work

### 3.1 AI Benchmarking and Evaluation Integrity

The evolution of AI benchmarks has followed a progression from static datasets toward increasingly sophisticated evaluation frameworks designed to address the limitations of their predecessors. The General Language Understanding Evaluation (GLUE) benchmark established foundational principles for multi-task evaluation by aggregating performance across diverse natural language understanding tasks. However, performance on GLUE rapidly approached and surpassed non-expert human performance, indicating limited headroom for continued research progress. This saturation motivated the development of SuperGLUE, which introduced "a new set of more difficult language understanding tasks" specifically designed to provide more challenging evaluation criteria [2].

The Beyond the Imitation Game Benchmark (BIG-bench) represents the next generation in this evolutionary progression, featuring 204 tasks contributed by 450 authors across 132 institutions, with problems spanning "linguistics, childhood development, math, common-sense reasoning, biology, physics, social bias, software development, and beyond". BIG-bench explicitly focused on "tasks that are believed to be beyond the capabilities of current language models," attempting to create evaluation frameworks that would remain relevant as model capabilities advanced. Each generation attempted to address limitations of predecessors through scale, diversity, or complexity, with BIG-bench achieving unprecedented scope in task variety and collaborative development [3].

Despite these architectural improvements, benchmark contamination has emerged as a fundamental problem with concrete evidence of performance inflation over time. Recent empirical research [1] demonstrates that "even top-performing large language models suffer notable accuracy drops—up to 8%—when evaluated on newly created tests that closely resemble, but are not identical to, widely used benchmarks". This pattern indicates that apparent model capabilities often reflect overfitting rather than genuine generalization. The contamination problem manifests across domains, where models achieve impressive benchmark performance yet demonstrate degraded performance when confronted with similar but unseen problems.

The Galactica incident provides a compelling example of how benchmark contamination undermines evaluation validity. Despite achieving high scores on closed-book question answering benchmarks, the model exhibited significant performance degradation when questions were paraphrased or presented in slightly different formats, revealing that success derived from memorization rather than understanding. This case illustrates how benchmark exposure creates systematic vulnerabilities that persist even when evaluation protocols appear rigorous.

Current mitigation strategies demonstrate effectiveness within constrained operational contexts but suffer from fundamental limitations that prevent scalable deployment. Kaggle competitions exemplify how hidden test sets can maintain evaluation integrity, but this approach "requires trusted infrastructure" and concentrates verification responsibilities in centralized platforms. The success of Kaggle's model depends on maintaining secure evaluation environments and resisting social engineering attacks, requirements that may not scale to academic or regulatory contexts where multiple stakeholders require independent verification capabilities [4, 5, 6].

OpenAI's phased release strategy for GPT-4 evaluation demonstrates that temporary privacy can preserve benchmark integrity during initial assessment periods, but "cannot be maintained indefinitely" [7]. Once evaluation results are published, test content inevitably enters the public domain through research publications, model cards, or informal communications. The temporary protection delays contamination rather than preventing it, creating a time-limited window of validity that diminishes as information propagates through research communities.

Academic conferences like BIG-bench employ delayed release strategies where complete benchmarks are withheld during initial evaluation phases. However, this approach "only postpones contamination" rather than providing sustainable protection. The collaborative nature of BIG-bench development, while enabling unprecedented task diversity, also increases the number of participants with access to unreleased content, expanding potential leak vectors. Once academic papers describing the benchmark are published, test cases become publicly available for incorporation into training datasets [8].

Each current approach fundamentally requires either institutional trust or accepts eventual compromise of benchmark integrity. Trusted evaluation services depend on maintaining secure infrastructure, establishing service level agreements, and trusting evaluators' honesty and competence. Delayed release strategies depend on coordinating disclosure across multiple institutions while managing potential conflicts of interest. Neither approach provides mathematical guarantees against manipulation or maintains long-term benchmark utility.

Differential privacy research has attempted to address evaluation contamination through theoretical bounds on information leakage, but practical implementation reveals fundamental limitations. While differential privacy mechanisms can "mathematically constrain the information a model extracts from test interactions", they cannot prevent contamination once test distribution characteristics become known. Recent work demonstrates that "theoretical bounds on information leakage do not prevent practical contamination". Once models can identify test distribution properties—such as typical question formats, answer distributions, or domain-specific patterns—they can be optimized for that distribution without requiring access to specific test instances [9, 10].

This distribution-level contamination represents a more subtle but equally problematic form of benchmark gaming. Models can achieve inflated performance by learning to exploit systematic biases in test construction, answer key patterns, or evaluation methodology, even when individual test cases remain private. The differential privacy literature acknowledges this limitation, with empirical studies showing that "prior evaluations underestimate privacy leakage by an order of magnitude" when realistic adversarial capabilities are considered. These findings establish that protecting individual tests is necessary but not sufficient for maintaining benchmark integrity.

The convergence of evidence from multiple research communities demonstrates that current approaches to benchmark contamination mitigation operate within a fundamental tension between verification requirements and privacy protection. Static benchmarks become contaminated once public, dynamic benchmarks require trusted infrastructure for generation and evaluation, and privacy-preserving techniques provide mathematical bounds but cannot prevent distribution-level gaming. This analysis establishes the need for novel approaches that can provide cryptographic verification of evaluation claims while maintaining test case privacy, addressing contamination at both individual and distributional levels without requiring centralized trust assumptions.

Differential privacy research has attempted to address evaluation contamination through theoretical bounds on information leakage, but practical implementation reveals fundamental limitations. While differential privacy mechanisms can mathematically constrain the information a model extracts from test interactions, they cannot prevent contamination once test distribution characteristics become known. Empirical studies demonstrate that models can identify test distribution properties such as typical question formats, answer distributions, or domain-specific patterns, then be optimized for that distribution without requiring access to specific test instances. This represents a critical gap in existing approaches: differential privacy protects individual data points but fails to protect the statistical patterns and structural properties of test suites that enable systematic gaming. The information theoretic analysis shows that any verification mechanism requiring observable outputs inherently leaks distributional information—the fundamental tension is not between privacy and utility but between different types of privacy guarantees.

Distribution-level contamination represents a form of benchmark gaming that occurs even when individual test cases remain perfectly private, though the severity depends critically on what distributional properties are exposed and how. Models can achieve inflated performance by learning to exploit systematic patterns in test construction methodology, answer key distributions, or evaluation scoring procedures, effectively overfitting to the benchmark's statistical characteristics rather than developing genuine capabilities. However, quantitative analysis of information leakage demonstrates important distinctions in attack capability. When a deterministic 5% public subset is exposed from a thousand-test benchmark, adversaries can estimate population mean parameters within confidence intervals of width approximately 0.55 standard deviations, enabling optimization for typical test characteristics. Yet this statistical knowledge differs fundamentally from test memorization—adversaries cannot determine specific prompts, expected outputs, or correct answers for the 95% of tests that remain hidden, and rare test categories representing less than 2% of the benchmark remain largely undetectable in the public sample. The differential privacy literature acknowledges these nuanced tradeoffs, with recent work showing that prior evaluations underestimate privacy leakage by an order of magnitude when realistic adversarial capabilities are considered, but also establishing that content privacy and distributional privacy represent distinct security properties requiring separate analysis.

The framework we present addresses multiple layers of evaluation integrity simultaneously while accepting carefully analyzed tradeoffs. Our system provides cryptographic guarantees against three critical attack vectors that existing approaches fail to prevent. First, test substitution attacks where adversaries claim evaluation on one test suite but actually use different tests are prevented through Merkle tree commitments that bind test content with collision resistance. Second, methodology substitution attacks where different evaluation procedures are applied to public versus private test partitions are prevented through content-addressable library versioning and matching commitments across both zero-knowledge circuits. Third, score manipulation attacks where adversaries claim inflated accuracy are prevented through circuit constraints that verify score aggregation matches individual test results. However, the system accepts distributional information leakage as a necessary consequence of enabling public verification—the deterministic 5% public subset intentionally reveals test distribution properties within statistical confidence bounds to allow empirical validation through reproduction. This represents a deliberate design tradeoff: we prioritize cryptographic guarantees against content substitution and methodology divergence over perfect distributional privacy, recognizing that verification fundamentally requires observable sample results. The limitation is that adversaries can optimize for estimated distribution characteristics, but they cannot memorize specific test cases, exploit methodology inconsistencies, or manipulate scores without cryptographic detection. This combination of guarantees addresses the most severe threats to benchmark integrity while maintaining practical verification capabilities that no existing approach provides.

### 3.2 Zero-Knowledge Proofs in Machine Learning

Applications of zero-knowledge proofs to machine learning problems have emerged as a significant research area, but prior work fundamentally focuses on proving properties of models rather than properties of evaluation processes. The zkML systems landscape demonstrates sophisticated approaches to model verification while revealing the conceptual gap that the present work addresses.

zkML systems like EZKL and Modulus Labs enable proving that a specific neural network produced a specific output on a specific input. This addresses model verification but not benchmark integrity. Systems like zkCNN and zkForest show that proof generation for neural network evaluation is computationally feasible at moderate scales. However, these systems assume the model is the secret asset requiring protection, whereas the framework presented here treats the benchmark as the secret requiring protection [12, 13].

Work on private prediction demonstrates that proofs can show that a model inference respects privacy constraints without revealing the model or the input. Systems like ezDPS achieve remarkable efficiency by combining "discrete wavelet transformation, principal components analysis, and support vector machines into a verifiable inference chain". This shares the goal of proving computational processes without revealing private data, but training verification requires different cryptographic primitives than evaluation verification because the computation differs fundamentally [14].

Reference work on verifiable training proves that a model was trained according to claimed procedures without revealing training data. This shares the goal of proving computational processes without revealing private data, but training verification requires different cryptographic primitives than evaluation verification because training involves iterative parameter updates across epochs, while evaluation involves deterministic scoring against ground truth. Recent advances demonstrate "zero-knowledge proofs of training" that enable parties to "prove that they have correctly trained a committed model based on a committed dataset". However, the computational patterns, circuit constraints, and verification requirements differ substantially between training processes and benchmark evaluation processes [11].

Applying ZK proofs to evaluation rather than prediction or training represents a novel application domain with distinct requirements. Evaluation involves scoring agent outputs against their ideal versions, aggregating results across test suites, and proving methodological consistency. These requirements have not been addressed specifically in prior ZK-ML work, which focuses on model inference integrity rather than benchmark evaluation integrity.

### 3.3 Verifiable Computation and Authenticated Execution

Verifiable computation systems like Pinocchio, TinyRAM, and more recent zkVMs provide general frameworks for proving arbitrary computation executed correctly. These systems enable a prover to demonstrate that a specific program produced a specific output on specific inputs without requiring the verifier to reexecute the computation. Pinocchio established foundational techniques for translating programs into quadratic arithmetic programs that can be verified through cryptographic proofs. Modern zkVMs extend this approach to support more general programming models, with systems like RISC Zero and Nexus enabling "verifiable off-chain computation" for Rust programs while producing succinct cryptographic proofs. However, these general-purpose systems do not address the specific structure of AI evaluation with its requirements for partial transparency, selective disclosure, and methodological binding across partitions [15, 16, 17].

Trusted execution environments like Intel SGX and ARM TrustZone provide hardware-based attestation of computation integrity through specialized processor features rather than cryptographic proofs. Intel SGX creates secure enclaves that protect code and data from privileged software attacks, while ARM TrustZone partitions system resources between "secure world" and "normal world" execution contexts. These systems achieve verification through hardware trust anchors and remote attestation protocols that prove the integrity of enclave initialization and execution. However, their security properties depend fundamentally on trusting hardware manufacturers, supply chain integrity, and resistance to side-channel attacks including power management vulnerabilities. The approach presented here provides software-only verification without hardware dependencies, enabling verification by any party with access to public proof data rather than requiring specialized hardware platforms [18, 19, 20, 21, 22, 23, 24].

Blockchain-based approaches to verifiable computation leverage smart contracts to enforce evaluation rules through public execution on distributed ledgers. These systems achieve transparency through on-chain computation where every operation becomes part of an immutable public record verified by network consensus. Some blockchain systems incorporate ZK proofs for privacy-preserving computation, enabling provers to demonstrate computational integrity without revealing private inputs. However, general-purpose blockchain virtual machines impose significant computational overhead compared to specialized circuits designed for specific verification tasks. More critically, blockchain-based evaluation cannot support private benchmarks because on-chain data becomes inherently public through the consensus mechanism, creating the same contamination vulnerabilities that motivate private evaluation approaches [25, 26].

The limitations of each category become apparent when considering AI benchmark evaluation requirements. General verifiable computation systems provide computational flexibility but lack mechanisms for partial disclosure, deterministic subset selection, and methodology commitment binding that benchmark evaluation requires. Trusted execution environments provide hardware security guarantees but cannot enable independent verification by parties without access to compatible hardware platforms. Blockchain-based systems provide public verifiability but fundamentally cannot maintain benchmark privacy due to their transparency requirements. None of these approaches addresses the specific combination of properties that AI evaluation demands: cryptographic verification of performance claims, selective disclosure of test content for challenge-response, and binding evaluation methodology across public-private partitions without requiring hardware trust or complete transparency.

### 3.4 Gap Identification and Positioning

This analysis reveals that no existing system provides the specific combination of properties required for trustworthy AI benchmark evaluation. Current approaches operate within fundamental limitations that prevent them from simultaneously achieving public verifiability, test case privacy, and methodological integrity without centralized trust assumptions.

The AI benchmarking community has developed sophisticated contamination detection techniques and mitigation strategies, yet these approaches either accept eventual benchmark compromise through public release or concentrate trust in centralized evaluation services. Differential privacy mechanisms provide theoretical bounds on information leakage but cannot prevent distributional contamination or methodology substitution attacks. Academic delayed-release strategies postpone rather than prevent contamination, while hardware-based trusted execution depends on supply chain security and vendor trust that may not be acceptable for high-stakes evaluation scenarios.

The zero-knowledge machine learning community has achieved remarkable progress in model verification and private inference, demonstrating that cryptographic proofs can verify neural network computations at practical scales. However, these systems fundamentally address different security properties than benchmark evaluation requires. zkML systems prove that specific models produce specific outputs on specific inputs, treating models as the secret asset requiring protection. Private prediction systems prove inference integrity while protecting user data and model parameters. Verifiable training systems prove optimization procedures while protecting training datasets. None of these approaches addresses the evaluation integrity problem where benchmark content must remain private while enabling public verification of performance claims.

The verifiable computation community provides general frameworks for proving arbitrary computations, but these systems lack the specialized requirements that AI evaluation demands. General-purpose verifiable computation systems like Pinocchio provide computational flexibility but cannot handle partial transparency, selective disclosure, or methodological binding across test partitions. Trusted execution environments achieve verification through hardware trust rather than cryptographic proofs, introducing supply chain dependencies that may be unacceptable in adversarial evaluation contexts. Blockchain-based approaches provide public verifiability but cannot maintain benchmark privacy due to their transparency requirements.

The framework presented here enables public verification of private benchmark performance through cryptographic proofs rather than hardware or institutional trust. The dual-circuit architecture maintains methodological transparency through content-addressable versioning while keeping test cases and execution traces private by default. Merkle tree commitments enable selective disclosure for challenge-response through authentication paths without requiring complete revelation. This combination of properties—cryptographic verification of performance claims, selective transparency for challenge response, and methodological binding across public-private partitions—addresses the specific requirements of AI benchmark integrity that prior work in evaluation security, ZK-ML, or verifiable computation has not directly tackled.

The approach transforms benchmark integrity from a trust problem requiring institutional coordination into a mathematical verification problem enabling independent validation by any party with access to public proof data. Rather than depending on evaluator honesty, hardware security, or benchmark refresh cycles, the system provides cryptographic guarantees that claimed performance was achieved using specified methodology on committed test content. This represents a fundamental advance in evaluation assurance that enables rigorous verification without sacrificing benchmark utility or requiring centralized infrastructure.

## 4. Technical Approach

### 4.1 Problem Formalization and Threat Model

The evaluation verification problem can be formalized as follows. Consider a benchmark provider with test suite T containing n test cases, an evaluation methodology M consisting of judging logic and aggregation procedures, and an AI agent A. The provider claims that executing A on T under methodology M produces aggregate accuracy α. The verification problem requires enabling any party to verify this claim without revealing the contents of T.

The security requirements for this system must satisfy three fundamental properties derived from zero-knowledge proof theory. First, completeness requires that honest providers can always generate valid proofs for true claims—if agent A truly achieves accuracy α on test suite T using methodology M, then the cryptographic protocol must produce proofs that verify successfully with probability 1. Second, soundness requires that dishonest providers cannot generate valid proofs for false claims except with negligible probability—if A does not achieve the claimed accuracy, or if different methodology was applied, then any attempt to generate accepting proofs must fail except with probability negligible in the security parameter. Third, zero-knowledge requires that proofs reveal no information about private tests beyond what can be inferred from public tests and claimed accuracy—the proof verification process must not leak test content, intermediate results, or execution traces that could enable future benchmark gaming.

The threat model identifies adversarial capabilities and trusted components within realistic attack scenarios. Adversaries may attempt to report inflated accuracy scores by claiming higher performance than actually achieved through selective reporting of favorable runs. However, they cannot use different evaluation methodologies for public versus private tests because the system requires identical methodology commitments as public inputs to both zero-knowledge circuits—any divergence in evaluation procedures would cause constraint failures and proof invalidity. Adversaries also cannot substitute different test cases than committed because Merkle tree commitments cryptographically bind the exact test content, and the circuits require valid authentication paths proving that each test was actually present in the committed tree structure. They may attempt to manipulate the deterministic partitioning process to influence which tests become public, though this is prevented by basing selection on cryptographic hashes of test identifiers that cannot be practically reversed or manipulated. The primary remaining attack vector is attempting to create misleading impressions through careful timing of evaluation claims or selective disclosure of results, though comprehensive execution logging provides auditability against such manipulation attempts.

The system assumes adversaries cannot break fundamental cryptographic primitives including collision-resistant hashing used in Merkle tree construction and the soundness properties of Groth16 zero-knowledge proofs, which reduce to the hardness of discrete logarithm problems on elliptic curves. Adversaries may have black-box access to evaluation methodology through public implementations or reverse engineering, but cannot modify committed library implementations during proof generation. The security analysis assumes standard cryptographic models where adversaries are computationally bounded and cannot find hash collisions or forge zero-knowledge proofs except with negligible probability.

The system explicitly does not protect against certain attack vectors that lie outside the scope of cryptographic verification. Dataset contamination where test content leaks into training data before evaluation cannot be prevented through cryptographic means, as the contamination occurs during model development rather than evaluation execution. Adversaries who compromise the hardware executing evaluation can manipulate results before proof generation—the system assumes evaluation execution occurs in a secure environment, though comprehensive execution logging provides post-hoc auditability if compromise is later suspected. The framework focuses on preventing evaluation-time manipulation rather than training-time contamination, recognizing that these represent distinct security problems requiring different technical approaches.

### 4.2 Architecture Overview

The system employs a dual-circuit architecture where two zero-knowledge proof circuits operate on different partitions of the test suite while maintaining cryptographic guarantees that identical evaluation methodology applies to both. This design enables public verification of a representative sample through direct reproduction while extending that verification to the complete benchmark through cryptographic proof.

The evaluation process begins with deterministic test suite partitioning that selects a public subset comprising five percent of tests based on the cryptographic hash of test identifiers. This deterministic selection mechanism prevents adversaries from strategically choosing easier tests for public disclosure while ensuring the public subset provides a representative sample of the complete benchmark. The system then executes the AI agent on all tests under committed evaluation methodology, recording execution traces and computing scores for both individual tests and aggregate metrics.

#### Test Suite Partitioning

```
Test Suite (n tests)
Deterministic 5% public selection
Complete benchmark ensures full representative partitioning
                    |
        +-----------+-----------+
        |                       |
   5% public              95% private
```

**Public Subset (0.05n tests)**
- Visible test cases available to all verifiers
- Enables empirical validation and reproduction
- Provides representative sample of complete benchmark
- Agent output, ideal output, test prompt, score: all public set

**Private Tests (0.95n tests)**
- Hidden from public view to prevent gaming
- Protected via zero-knowledge proofs
- Verifiable via Merkle authentication paths
- No content disclosure by default

Two zero-knowledge circuits prove distinct but related claims about this evaluation. The subset circuit operates on the public partition, taking actual test case data for revealed tests as private inputs along with their individual scores and execution log hashes. The circuit receives pre-computed methodology commitments as public inputs—specifically, content-addressable hashes of the evaluation library code and scoring criteria that were computed outside the circuit. Through internal computation, the circuit verifies that individual test scores aggregate correctly to the claimed subset accuracy, constructs a Merkle tree from the test case data, and outputs the computed Merkle root as a public signal. This output becomes the critical cryptographic anchor that binds the two circuits together.

The main circuit operates on the complete benchmark, receiving as private inputs the full test case data for all tests, Merkle authentication paths proving each test's membership in the committed tree, and the subset extraction data specifying which tests belong to the public partition. Crucially, the main circuit also receives raw methodology data as private inputs—the actual hashes of library code and scoring criteria before commitment computation. Rather than accepting methodology commitments as arbitrary public inputs, the main circuit computes these commitments cryptographically within its constraint system using Poseidon hash functions, then outputs them as public signals. This design provides stronger security than simply matching public inputs across circuits because it proves that methodology commitments were derived from actual evaluation implementation rather than being fabricated values.

The cryptographic binding between circuits operates through three complementary mechanisms that together prevent evaluation manipulation. First, test selection binding ensures that the public subset genuinely represents tests extracted from the complete benchmark. The main circuit receives the subset Merkle root output by the subset circuit as a public input. During execution, the main circuit extracts test data at the claimed subset indices, recomputes what the Merkle root should be for those specific tests, and constrains this recomputed root to equal the public input from the subset circuit. If an adversary attempted to use different tests for public verification than were actually present in the complete evaluation, this constraint would fail and proof generation would be impossible.

Second, methodology binding ensures that identical evaluation procedures apply to both partitions. The main circuit computes methodology commitments from raw data and outputs them as public signals. External verification confirms that these outputs match the public inputs to the subset circuit. This matching requirement, combined with the fact that the main circuit must cryptographically derive its commitments from actual methodology data, prevents adversaries from applying different scoring criteria, library versions, or evaluation procedures to public versus private tests.

Third, empirical binding validates that cryptographic commitments correspond to observable behavior. Verifiers can reproduce the evaluation on public tests by executing the committed library code on revealed test cases, computing scores according to the committed methodology, and comparing results against claimed accuracy. This direct validation provides evidence that the methodology commitments actually represent the evaluation procedures that produced the claimed results, rather than being arbitrary cryptographic values disconnected from actual computation.

The architecture supports a three-tier verification workflow that provides complementary assurance at different confidence levels. At the empirical tier, any party can independently execute evaluation on public tests and verify that computed scores match claimed performance, providing direct observable evidence of evaluation correctness on the disclosed partition. At the cryptographic tier, verifiers validate both zero-knowledge proofs using the published verification keys and public inputs, confirming that the proofs satisfy all circuit constraints and that the mathematical relationships between commitments, scores, and test data hold as claimed. At the binding tier, verifiers confirm that the subset Merkle root flows correctly from subset circuit output to main circuit input, that methodology commitments computed in the main circuit match those used in the subset circuit, and that aggregate scores are consistent across both proofs.

This layered verification structure provides defense in depth where breaking security requires simultaneously defeating multiple independent cryptographic mechanisms. The Merkle tree commitments prevent test substitution through collision-resistant hashing. The in-circuit computation of methodology commitments prevents arbitrary value injection. The constraint that the main circuit's recomputed subset root must match the subset circuit's output prevents partition manipulation. The empirical validation tier provides an additional check that catches implementation errors or methodology divergence that might evade purely cryptographic verification. Together, these mechanisms transform benchmark integrity from a trust problem requiring institutional coordination into a mathematical verification problem enabling independent validation by any party with access to the published proof package.

### 4.3 Cryptographic Commitments

The dual-circuit architecture relies on three distinct commitment mechanisms that bind different aspects of the evaluation process to specific cryptographic values. These commitments transform mutable evaluation components—test content, methodology implementation, and execution behavior—into immutable cryptographic fingerprints that enable verification without revelation. Each commitment mechanism addresses a different attack vector while supporting the selective disclosure properties required for challenge-response protocols.

#### Test Content Commitment

Test content is committed through Merkle tree construction, which provides both binding and efficient selective disclosure. Each test case in the benchmark is first hashed individually by computing a deterministic representation of its components. For a test with identifier i, the leaf hash is computed as the concatenation of five elements: the test identifier itself, a cryptographic hash of the prompt text, a hash of the expected output, a hash of the agent's actual output during evaluation, and the numerical score assigned to that test. These five values are combined using the Poseidon hash function, which operates natively within zero-knowledge circuit constraint systems and provides collision resistance equivalent to traditional cryptographic hash functions.

The individual leaf hashes are then organized into a complete binary Merkle tree through iterative pairwise hashing. Beginning with the n leaf hashes representing the test suite, the construction proceeds level by level, combining adjacent pairs through Poseidon hashing until a single root hash remains. If the number of leaves is not a power of two, the final level is padded with zero values to create a complete binary structure. This padding is deterministic and publicly specified, ensuring that any party constructing the tree from the same test data will produce an identical root.

The resulting Merkle root serves as a cryptographic commitment to the entire test suite with three critical security properties. First, the commitment is binding through collision resistance—an adversary cannot produce two different test suites that hash to the same root except with negligible probability bounded by the collision resistance of Poseidon. Second, the commitment reveals no information about individual test content beyond what can be inferred from the tree structure and any disclosed tests. Third, the tree structure enables efficient selective disclosure through authentication paths that prove a specific test was included in the committed suite without revealing other tests.

An authentication path for test at index i consists of the sibling hashes encountered when traversing from the leaf to the root. For a tree of depth d, the path contains d sibling values along with binary indicators specifying whether each sibling appears to the left or right of the path node. A verifier can reconstruct the root by starting with the claimed leaf hash, combining it with the first sibling according to the direction indicator, hashing the result, then repeating this process with each subsequent sibling until reaching the root level. If the reconstructed root matches the committed root, the verifier has mathematical proof that the disclosed test was present in the committed suite at the claimed position.

This Merkle tree approach provides stronger security than alternatives such as accumulator-based commitments or polynomial commitments because it requires no trusted setup, supports efficient verification with constant-size proofs, and enables revealing arbitrary subsets of tests through independent authentication paths. The tree structure also naturally supports the dual-circuit architecture's requirement to commit both to the complete benchmark and to the public subset, with the subset tree serving as a cryptographic anchor that the main circuit must respect when extracting public tests from the full dataset.

#### Methodology Commitment

Evaluation methodology is committed through content-addressable versioning that binds the cryptographic proof to specific, auditable code implementations. The methodology encompasses three components that together define how evaluation proceeds: the evaluation library code that orchestrates agent execution and result collection, the scoring procedures that judge agent outputs against expected results, and any configuration parameters that affect evaluation behavior such as timeout values or retry policies.

For each component, a cryptographic hash is computed from its complete source representation. The evaluation library is serialized as a deterministic byte sequence including all source files, dependencies at specific versions, and build configuration. This serialization is then hashed using SHA-256 to produce a content-addressable identifier that uniquely determines the library implementation. Any modification to the library code, its dependencies, or build process produces a different hash with overwhelming probability. Similarly, scoring criteria are serialized as structured data specifying the exact algorithms, thresholds, and decision procedures used to assign scores, then hashed to produce a scoring method identifier.

These content-addressable hashes serve as commitments that can be verified by anyone with access to the evaluation implementation. A verifier who possesses the library source code can independently compute its SHA-256 hash and confirm that it matches the committed value, providing assurance that the claimed library version corresponds to actual inspectable code rather than being an arbitrary identifier. This verification property distinguishes content-addressable versioning from simple version numbering schemes where the same version string might refer to different implementations depending on when or where the software was obtained.

The methodology commitments flow through the dual-circuit architecture asymmetrically through a two-stage hashing process that balances external verifiability with circuit efficiency. Before either circuit executes, the evaluation system computes SHA-256 hashes of the methodology components, producing content-addressable identifiers H_lib_sha256 for the evaluation library source code and H_score_sha256 for the scoring criteria specifications. These SHA-256 hashes uniquely determine the methodology implementation and can be independently verified by anyone who possesses the source code, since they can recompute the hashes and confirm they match the claimed values.

However, SHA-256 computation within zero-knowledge circuits requires hundreds of thousands of constraints, making it computationally prohibitive for proof generation. The architecture therefore introduces a second hashing stage using Poseidon, a zero-knowledge-friendly hash function that requires only a few hundred constraints within circuit constraint systems. The methodology commitments referenced throughout the architecture are defined as:

```
C_lib = Poseidon(H_lib_sha256)
C_score = Poseidon(H_score_sha256)
```

These Poseidon-hashed values serve as the cryptographic bindings that appear in circuit public inputs and outputs.

The subset circuit receives these methodology commitments as pre-computed public inputs, meaning the values C_lib and C_score are provided to the circuit as known parameters that were calculated outside the circuit before proof generation began. The subset circuit does not perform any commitment computation internally. Instead, it simply accepts these pre-computed Poseidon hash values as public parameters that define which methodology was used for evaluating the public test subset. This design enables efficient proof generation for the subset circuit because the expensive Poseidon hashing operation occurs once externally rather than being repeated within the circuit constraint system during witness generation.

The main circuit operates fundamentally differently to provide stronger security guarantees through proof of derivation. The main circuit receives the intermediate SHA-256 hashes as private inputs, specifically the values H_lib_sha256 and H_score_sha256 that resulted from hashing the actual methodology source code. The circuit then computes the methodology commitments internally by applying Poseidon hash within its constraint system, enforcing that the output values C_lib and C_score equal Poseidon applied to the input SHA-256 hashes. These computed commitment values become public outputs of the main circuit proof, appearing as public signals that anyone can observe when verifying the proof.

This asymmetric design prevents a critical attack where an adversary might provide arbitrary methodology commitment values to both circuits without proving these commitments correspond to any actual evaluation implementation. The subset circuit demonstrates that it used specific methodology commitment values when verifying public test results, but it does not cryptographically prove where those commitment values originated. The main circuit closes this security gap by proving through circuit constraints that its methodology commitments were derived from specific SHA-256 hashes via Poseidon computation. Since the circuit constraints mathematically enforce this derivation relationship, an adversary cannot generate a valid main circuit proof unless the methodology commitments truly equal Poseidon of the provided SHA-256 hashes.

External verification then binds the two circuits together by confirming that the methodology commitments output by the main circuit as public signals exactly match the methodology commitments that were provided as public inputs to the subset circuit. This matching requirement ensures both circuits operated with identical methodology. The main circuit cryptographically proved its commitments derived from actual SHA-256 hashes of methodology components through in-circuit Poseidon computation. The subset circuit used those same commitment values when verifying public test performance. Therefore, both circuits must have evaluated under the same methodology implementation, with the main circuit providing proof that the shared commitment values represent actual hashed source code rather than fabricated identifiers.

This asymmetric design prevents a subtle but important attack where an adversary might provide matching but meaningless commitment values to both circuits. By requiring the main circuit to compute commitments from raw data, the architecture ensures that at least one circuit cryptographically proves the commitments correspond to actual hashed methodology. External verification then confirms that the main circuit's computed commitments match the subset circuit's public inputs, binding the two proofs to identical evaluation procedures.

The content-addressable approach also supports auditability through selective disclosure. If a verifier challenges the evaluation methodology, the provider can reveal the complete library source code, scoring criteria specifications, and configuration files. The verifier can then hash these artifacts independently, confirm they match the committed values, inspect the code for correctness, and even execute the evaluation logic on test cases to verify it behaves as specified. This capability transforms methodology commitments from opaque cryptographic values into verifiable links to inspectable implementation artifacts.

#### Execution Commitment

Execution behavior during evaluation is committed through comprehensive logging that captures all observable agent operations with deterministic serialization. As the evaluation system executes each test case, it records every tool invocation, API call, file operation, or subprocess execution that occurs during agent processing. Each log entry contains the operation type, complete input parameters, output values, and a sequence number indicating temporal ordering within the evaluation session.

The logging mechanism sanitizes certain fields to ensure deterministic commitment computation. Specifically, timestamps are recorded for human auditability but excluded from commitment calculation, since slight timing variations between executions would produce different hashes despite identical behavioral sequences. Similarly, randomly generated session identifiers or unique request tokens are excluded from the commitment computation while being retained in the full logs for debugging purposes. This sanitization ensures that two executions following identical behavioral patterns produce identical log commitments even if they occur at different times or use different session identifiers.

The complete log sequence for each test case is serialized as a JSON structure containing the ordered list of operations with their sanitized parameters. These per-test logs are then aggregated into a complete execution log covering all tests in the evaluation run. The aggregated log is hashed using SHA-256 to produce an execution log hash that serves as the input to the circuits. Within each circuit, this SHA-256 hash is further processed using Poseidon to produce the execution logs commitment that appears in public outputs.

The two-stage hashing approach reflects different computational constraints at different stages of the verification pipeline. SHA-256 is used for the initial hashing of log data because it integrates naturally with standard software systems and provides efficient computation on conventional hardware. Poseidon is used within the circuits because it requires orders of magnitude fewer constraints than SHA-256 would require in a zero-knowledge proof system, making proof generation computationally tractable. The combination provides efficient computation at both stages while maintaining cryptographic security properties throughout.

Execution commitments serve multiple purposes within the verification architecture. During proof generation, they bind the zero-knowledge proofs to specific execution traces, preventing an adversary from generating proofs for evaluation runs that never actually occurred. The commitment appears as a public output from both circuits, enabling verifiers to confirm that both proofs refer to the same evaluation session. For challenge-response protocols, the execution logs can be selectively disclosed to prove that specific operations occurred during evaluation. A challenger might request logs for a particular test case, and the provider can reveal that subset of the execution trace along with evidence that it contributes to the committed execution hash.

The execution commitment also enables post-hoc auditability if compromise is suspected. If irregularities are detected after evaluation completes, investigators can request disclosure of execution logs and verify they match the committed hash. The logs can then be analyzed to determine whether evaluation proceeded according to specified methodology, whether any unusual operations occurred, or whether the agent exhibited unexpected behaviors. This auditability property complements the real-time cryptographic verification by providing a forensic capability that operates even when suspicions arise after proofs have been verified and accepted.

#### Commitment Composition

The three commitment mechanisms combine to create a complete cryptographic binding of the evaluation process. Test content commitments through Merkle trees ensure that specific test cases with specific expected outputs and specific agent outputs were evaluated. Methodology commitments through content-addressable versioning ensure that specific, inspectable code implementations performed the evaluation and scoring. Execution commitments through comprehensive logging ensure that specific behavioral sequences actually occurred during the evaluation session. Together, these commitments transform the claim "this agent achieved accuracy α on this benchmark" into a verifiable statement bound to concrete, auditable artifacts.

The commitment architecture supports the threat model by addressing distinct attack vectors at each layer. Test substitution attacks where an adversary evaluates on easier tests than claimed are prevented by Merkle commitments that bind proofs to specific test content. Methodology substitution attacks where different evaluation procedures apply to public versus private tests are prevented by content-addressable commitments that must match across circuits. Execution fabrication attacks where an adversary generates proofs without actually running evaluation are prevented by execution commitments that bind proofs to observable behavioral traces. The layered commitment structure ensures that defeating the system requires simultaneously breaking multiple independent cryptographic assumptions, providing defense in depth against sophisticated adversaries.

### 4.4 Subset Circuit Design

The subset circuit generates a zero-knowledge proof that the public test partition achieves claimed accuracy under committed evaluation methodology. This circuit operates exclusively on the revealed test subset, enabling any party to empirically validate its claims through independent reproduction while providing cryptographic assurance through proof verification.

#### Private Inputs

The subset circuit receives three categories of private witness data that are known to the prover but hidden from verifiers. For a public subset containing k tests, the circuit accepts test case data structured as k tuples where each tuple i contains five field elements. Specifically, the private inputs include the test identifier id_i, the cryptographic hash of the prompt text h_prompt,i, the hash of the expected output h_expected,i, the hash of the agent's actual output h_output,i, and the numerical score s_i assigned to that test. These values are formatted as elements of the scalar field of the BN254 elliptic curve, which provides the mathematical structure underlying the Groth16 proof system.

The circuit also receives the individual test scores as a separate private input array, represented as [s₁, s₂, ..., s_k] where each score is an integer value between zero and one hundred inclusive. While these scores appear redundantly in the test case tuples, providing them separately enables efficient aggregation constraints without requiring the circuit to extract score values from within the tuple structure during constraint evaluation. Finally, the circuit receives a pre-computed execution log hash H_logs as a private input, which represents the SHA-256 hash of the complete execution logs for the public subset evaluation.

#### Public Inputs

The subset circuit accepts four public parameters that define the claim being proven and enable external verification. The claimed aggregate accuracy for the public subset, denoted α_subset, represents the mean score across all public tests expressed as a value between zero and one hundred. This claimed accuracy is the primary assertion that the circuit proves through its constraint system. The number of tests in the public subset k serves as a structural parameter that determines array sizes and loop bounds within the circuit.

The methodology commitments C_lib and C_score are provided as public inputs representing the Poseidon hashes of the SHA-256 hashes of the evaluation library and scoring criteria respectively. These commitments were computed externally before circuit execution through the two-stage hashing process described in Section 2.3. Formally:

```
C_lib = Poseidon(H_lib,SHA256)
C_score = Poseidon(H_score,SHA256)
```

By accepting these commitments as public inputs, the circuit binds its proof to specific evaluation methodology that verifiers can independently audit by obtaining the library source code, computing its SHA-256 hash, applying Poseidon, and confirming the result matches the public commitment value.

#### Circuit Constraints and Operations

The subset circuit enforces five categories of constraints that collectively prove the claimed accuracy was achieved on the committed test suite under committed methodology. The circuit operations proceed sequentially through test case processing, Merkle tree construction, score aggregation verification, commitment computation, and range checking.

The circuit begins by computing cryptographic leaf hashes for each test case in the public subset. For test i, the leaf hash is computed as:

```
leaf_i = Poseidon(id_i || h_prompt,i || h_expected,i || h_output,i || s_i)
```

This five-element concatenation produces a unique cryptographic fingerprint for each test that binds together the test definition, agent behavior, and assigned score in a single hash value. The Poseidon hash function ensures collision resistance, meaning an adversary cannot produce two different test cases that hash to the same leaf value except with negligible probability.

Once all k leaf hashes are computed, the circuit constructs a complete binary Merkle tree through iterative pairwise hashing. If k is not a power of two, the leaf array is padded with zero values to the next power of two, ensuring the tree structure remains balanced. The tree construction proceeds level by level, where each level ℓ contains 2^(d-ℓ) nodes for a tree of depth d. At each level, adjacent node pairs are combined through Poseidon hashing, with:

```
node_j^(ℓ+1) = Poseidon(node_2j^(ℓ) || node_2j+1^(ℓ))
```

This process continues until a single root node remains. The final root value M_subset serves as a cryptographic commitment to the entire public test subset.

The circuit enforces score aggregation constraints that verify the claimed accuracy matches the actual test scores provided as private inputs. The aggregate constraint requires that the sum of all individual scores equals the claimed accuracy multiplied by the number of tests:

```
∑(i=1 to k) s_i = α_subset × k
```

This constraint ensures the prover cannot claim higher accuracy than was actually achieved, since the constraint system will fail to produce a valid proof if the equality does not hold. The circuit also enforces range constraints on each individual score, requiring 0 ≤ s_i ≤ 100 for all i ∈ {1, ..., k}, preventing the prover from using scores outside the valid range to satisfy the aggregation constraint artificially.

The execution logs commitment is computed within the circuit by applying Poseidon hash to the pre-computed SHA-256 execution log hash that was provided as a private input. Specifically, the circuit constrains that:

```
C_logs = Poseidon(H_logs)
```

This produces an execution commitment value that can be output as a public signal. This two-stage hashing mirrors the methodology commitment approach, where SHA-256 provides content-addressability for the actual log data while Poseidon provides circuit-efficient commitment computation.

#### Public Outputs

The subset circuit produces two public output signals that become part of the proof statement and can be observed by all verifiers. The computed Merkle root M_subset represents the cryptographic commitment to the public test suite and their evaluation results. This root value is derived entirely from the private test case data through the deterministic Merkle tree construction within the circuit. Critically, M_subset becomes a binding public input to the main circuit, creating the cryptographic link between the two proofs that prevents test substitution attacks.

The execution logs commitment C_logs serves as the second public output, binding the proof to specific evaluation behavior that occurred during the test execution. This commitment enables selective disclosure of execution logs for audit purposes while maintaining privacy by default. If a verifier challenges the evaluation, the prover can reveal the complete execution logs and demonstrate they hash to H_logs, which when processed through Poseidon produces the committed value C_logs that appears in the proof.

### 4.5 Main Circuit Design

The main circuit generates a zero-knowledge proof that the complete benchmark achieves claimed accuracy under the same evaluation methodology proven for the public subset. This circuit operates on all tests in the benchmark including both public and private partitions, proving not only that aggregate accuracy meets the claimed threshold but also that the public subset was genuinely extracted from the complete dataset and evaluated under identical methodology.

#### Private Inputs

The main circuit receives substantially more private witness data than the subset circuit due to its operation on the complete benchmark. For a benchmark containing n total tests, the circuit accepts complete test case data structured as n tuples where each tuple i contains the five field elements: test identifier id_i, prompt hash h_prompt,i, expected output hash h_expected,i, agent output hash h_output,i, and score s_i. These represent all tests in the benchmark, encompassing both the public subset that was proven by the subset circuit and the private tests that remain hidden from verifiers.

The circuit receives Merkle authentication paths for each test proving its membership in the committed full benchmark tree. For test i, the authentication path consists of the sibling hashes encountered when traversing from that test's leaf position to the root, along with directional indicators specifying whether each sibling appears to the left or right of the path node. For a tree of depth d = ⌈log₂ n⌉, each authentication path contains d sibling values denoted as:

```
path_i = [sibling_i,1, sibling_i,2, ..., sibling_i,d]
```

with corresponding direction bits:

```
dir_i = [b_i,1, b_i,2, ..., b_i,d]
```

where b_i,j ∈ {0,1} indicates left or right positioning.

The circuit also receives subset extraction data that specifies which tests belong to the public partition and enables recomputation of the subset Merkle root. This data consists of subset indices [idx₁, idx₂, ..., idx_k] identifying the positions within the full benchmark array where public tests appear, along with the subset scores [s_subset,1, s_subset,2, ..., s_subset,k] for those specific tests. These indices and scores enable the circuit to extract the claimed public subset from the complete dataset and verify it matches what the subset circuit proved.

The circuit receives raw methodology data as private inputs rather than pre-computed commitments, enabling cryptographic proof of commitment derivation. Specifically, the circuit receives the SHA-256 hash of the evaluation library source code H_lib,SHA256 and the SHA-256 hash of the scoring criteria H_score,SHA256. These are the same SHA-256 hashes that were used to compute the methodology commitments in the subset circuit, but here they are provided as private witness data that the circuit will process cryptographically to prove honest commitment computation. The circuit also receives the execution log hash H_logs as a private input, serving the same commitment binding purpose as in the subset circuit.

#### Public Inputs

The main circuit accepts seven public parameters that define the claims being proven and establish the cryptographic binding to the subset circuit. These parameters serve distinct roles in the verification architecture.

The first public parameter is the claimed aggregate accuracy for the complete benchmark, denoted α_full, which represents the mean score across all n tests expressed as a value between zero and one hundred. This is the primary performance claim that the circuit proves about the complete evaluation including hidden tests.

The second public parameter is the claimed aggregate accuracy for the subset, denoted α_subset, which serves as a separate public input that must equal the value proven by the subset circuit. This redundant specification enables the main circuit to verify that subset score aggregation matches the claim established in the subset circuit proof.

The third public parameter is the full benchmark Merkle root M_root, which serves as a public commitment to the complete test suite. This root was computed externally before circuit execution by constructing a Merkle tree from all test case data in the benchmark. By accepting M_root as a public input, the circuit binds its proof to a specific committed test suite that cannot be changed after commitment.

The fourth and fifth public parameters are structural values that define array sizes and aggregation bounds. The number of tests in the complete benchmark n determines the size of the full test array and the bounds for aggregation loops over all tests. The number of tests in the subset k determines the size of the subset extraction data and the bounds for subset-specific aggregation verification.

The sixth public parameter is the subset Merkle root M_subset, which represents the most critical public input for establishing cryptographic binding between the two circuits. This value is the Merkle root that was computed and output by the subset circuit as a public signal from its proof generation. By accepting M_subset as a public input, the main circuit creates an explicit cryptographic dependency where the main circuit proof can only be valid if it respects the subset commitment established by the subset circuit. The main circuit will recompute the subset Merkle root from its extracted subset data and constrain this recomputed value to equal the public input M_subset. This constraint provides cryptographic proof that the public subset used in the main circuit matches the public subset proven in the subset circuit, preventing test substitution attacks where an adversary might attempt to prove accuracy on a different public subset than was included in the complete benchmark.

The seventh set of public parameters, though not strictly inputs in the traditional sense, comprises values that will be matched through external verification rather than circuit constraints. Specifically, the methodology commitments C_lib and C_score that the main circuit computes and outputs must match the corresponding methodology commitments that were provided as public inputs to the subset circuit. While this matching occurs through external verification rather than being enforced within either circuit's constraint system, these values function as de facto public parameters that define which evaluation methodology both circuits must respect. The verification protocol confirms this consistency by extracting methodology commitments from both proofs and checking their equality, ensuring that identical evaluation procedures applied to both public and private test partitions.

#### Circuit Constraints and Operations

The main circuit enforces a substantially more complex constraint system than the subset circuit due to its dual responsibilities of verifying complete benchmark accuracy and proving consistency with the subset circuit's claims. The circuit operations proceed through seven phases: leaf hash computation, Merkle authentication path verification, subset extraction, subset Merkle root recomputation, score aggregation verification for both full and subset, and methodology commitment computation.

The circuit begins by computing cryptographic leaf hashes for all tests in the complete benchmark. For each test i where i ∈ {1, ..., n}, the leaf hash is computed identically to the subset circuit:

```
leaf_i = Poseidon(id_i || h_prompt,i || h_expected,i || h_output,i || s_i)
```

This ensures consistency in how test cases are represented cryptographically across both circuits. The leaf computation occurs for all tests regardless of whether they belong to the public or private partition, creating a uniform representation of the complete benchmark.

The circuit then verifies that each test's leaf hash validates against the committed full benchmark Merkle root through its authentication path. For each test i, the circuit performs iterative hashing starting from the computed leaf and proceeding to the root. At each level j of the tree, the circuit computes the parent node based on the directional indicator:

```
hash_i,j+1 = Poseidon(hash_i,j || sibling_i,j) if b_i,j = 0
hash_i,j+1 = Poseidon(sibling_i,j || hash_i,j) if b_i,j = 1
```

where hash_i,1 = leaf_i at the base level. This process continues for all d levels until reaching the root level. The circuit then constrains that the final computed hash equals the public input Merkle root:

```
hash_i,d+1 = M_root for all i ∈ {1, ..., n}
```

This constraint ensures that every test in the private witness data was actually present in the committed benchmark tree at the time of commitment. An adversary cannot substitute different test cases or modify test content without invalidating these authentication constraints.

After verifying all tests belong to the committed benchmark, the circuit extracts the claimed public subset and recomputes its Merkle root to verify consistency with the subset circuit. The circuit uses the subset indices to identify which tests should form the public partition. For each subset index idx_j where j ∈ {1, ..., k}, the circuit extracts the test case data at position idx_j in the full array and recomputes its leaf hash. These extracted leaf hashes are then organized into a complete binary Merkle tree following the same construction procedure as the subset circuit, padding to the next power of two if necessary and iteratively hashing pairs until producing a root:

```
M_recomputed = MerkleRoot([leaf_idx₁, leaf_idx₂, ..., leaf_idx_k])
```

The circuit enforces the critical binding constraint that this recomputed subset root must equal the public input subset root that came from the subset circuit:

```
M_recomputed = M_subset
```

This constraint cryptographically proves that the subset claimed in the main circuit matches the subset proven in the subset circuit. If an adversary attempted to use different tests for the public subset than were actually extracted from the full benchmark, or if different subset indices were used across the two circuits, this equality constraint would fail and proof generation would be impossible. This single constraint provides the cryptographic guarantee that prevents test substitution between partitions.

The circuit enforces score aggregation constraints for both the complete benchmark and the subset. For the full benchmark, the circuit verifies that the sum of all individual test scores equals the claimed full accuracy multiplied by the total number of tests:

```
∑(i=1 to n) s_i = α_full × n
```

For the subset, the circuit verifies that the sum of scores at the subset indices equals the claimed subset accuracy multiplied by the subset size:

```
∑(j=1 to k) s_idx_j = α_subset × k
```

Both constraints ensure the prover cannot claim inflated accuracy values that exceed what the individual test scores support. The circuit also enforces range constraints requiring 0 ≤ s_i ≤ 100 for all i ∈ {1, ..., n}, preventing manipulation through out-of-range score values.

The circuit computes methodology commitments from the raw SHA-256 hashes provided as private inputs, proving that commitments derive from actual methodology data rather than being arbitrary values. The circuit applies Poseidon hash to the SHA-256 hashes to produce commitment values:

```
C_lib = Poseidon(H_lib,SHA256)
C_score = Poseidon(H_score,SHA256)
```

These computed commitment values become public outputs of the circuit. By computing commitments within the circuit constraint system rather than accepting them as public inputs, the architecture ensures the commitments were honestly derived. An adversary cannot provide arbitrary commitment values disconnected from actual methodology implementation because the circuit constraints enforce the derivation relationship. Similarly, the circuit computes the execution logs commitment:

```
C_logs = Poseidon(H_logs)
```

This computation creates cryptographic binding to the evaluation execution behavior that can be verified through selective disclosure if challenges arise.

#### Public Outputs

The main circuit produces three public output signals that become part of the proof statement and enable external verification of methodology binding. The execution logs commitment C_logs serves as the first output, binding the main circuit proof to specific evaluation behavior. External verification confirms this value matches the execution logs commitment output by the subset circuit, proving both proofs refer to the same evaluation session.

The library version commitment C_lib serves as the second output, representing the Poseidon hash of the SHA-256 hash of the evaluation library source code. This commitment was computed within the circuit from raw methodology data, proving it derives from actual library implementation. External verification confirms this computed commitment matches the public input that was provided to the subset circuit, binding both proofs to identical evaluation library versions.

The scoring method commitment C_score serves as the third output, representing the Poseidon hash of the SHA-256 hash of the scoring criteria. Like the library commitment, this value was computed within the circuit and must match the corresponding public input to the subset circuit. This matching requirement ensures identical scoring procedures applied to both public and private test partitions.

The proof statement that the main circuit produces can be formally expressed as demonstrating knowledge of private inputs consisting of complete test case data {(id_i, h_prompt,i, h_expected,i, h_output,i, s_i)} for i=1 to n, Merkle authentication paths {path_i, dir_i} for i=1 to n, subset extraction data including indices and scores, and raw methodology hashes H_lib,SHA256, H_score,SHA256, and H_logs such that when processed through the circuit constraints, they satisfy all verification requirements. Specifically, the private inputs must validate against the public inputs M_root, α_full, α_subset, n, k, and critically M_subset while producing public outputs C_logs, C_lib, and C_score that match the subset circuit's commitments.

The security properties of the main circuit extend beyond the subset circuit by proving not only that claimed accuracy was achieved but also that the public subset used for empirical validation was genuinely extracted from the complete benchmark under identical methodology. The Merkle authentication path verification prevents test substitution within the full benchmark. The subset root recomputation and equality constraint prevent subset manipulation across circuits. The methodology commitment computation and output matching prevent methodology divergence between partitions. Together, these mechanisms create a cryptographic proof that the complete evaluation including hidden tests proceeded under the same verifiable conditions demonstrated on the public subset, enabling trust in private benchmark performance through mathematical verification rather than institutional assurance.

### 4.6 Selective Disclosure Protocol

The Merkle tree commitment architecture enables selective disclosure of individual private tests without compromising the remaining benchmark. When verifiers require deeper scrutiny beyond the public subset and cryptographic proofs, the protocol allows benchmark providers to reveal specific private tests with cryptographic proof of authenticity while maintaining privacy for all other tests.

#### Challenge Mechanism

A verifier issues a challenge by specifying test index i within the complete benchmark where i ∈ {1, ..., n} and i does not correspond to a public test. The benchmark provider responds by disclosing three components: the complete test case data including the full prompt text, expected output, agent output, and score s_i; the Merkle authentication path consisting of sibling hashes path_i = [sibling_i,1, sibling_i,2, ..., sibling_i,d] and direction bits dir_i = [b_i,1, b_i,2, ..., b_i,d]; and the relevant execution logs documenting the agent's evaluation process for this test.

#### Verification Procedure

The verifier performs three verification steps to confirm authenticity. First, the verifier independently computes the leaf hash from the disclosed test data:

```
leaf_i = Poseidon(id_i || h_prompt,i || h_expected,i || h_output,i || s_i)
```

where the component hashes are computed from the revealed full text rather than accepted as given values.

Second, the verifier validates the authentication path by performing iterative hashing from the computed leaf to the root. At each level j, the verifier computes:

```
hash_i,j+1 = Poseidon(hash_i,j || sibling_i,j) if b_i,j = 0
hash_i,j+1 = Poseidon(sibling_i,j || hash_i,j) if b_i,j = 1
```

starting with hash_i,1 = leaf_i and continuing for all d levels. The verifier confirms that the final reconstructed hash equals the committed Merkle root:

```
hash_i,d+1 = M_root
```

This equality provides cryptographic proof that the disclosed test was present in the committed benchmark at position i with the claimed content and score.

Third, the verifier examines execution logs and independently applies the committed scoring methodology to verify that the disclosed score reflects correct evaluation. For deterministic scoring, this verification is definitive. For AI-based scoring, the verifier confirms the disclosed score falls within expected ranges given the output quality.

#### Progressive Disclosure and Security Properties

The protocol supports revealing multiple tests through independent challenges without reducing security for unrevealed tests. Each disclosed test proves its own authenticity through authentication path verification, but reveals no information about other tests beyond tree structure implications. The Merkle tree construction ensures authentication paths for different leaves are cryptographically independent.

The aggregate accuracy constraint provides limited statistical information about unrevealed tests. Given disclosed test scores and claimed full accuracy α_full, the sum of unrevealed test scores must satisfy:

```
∑(j ∈ unrevealed) s_j = α_full × n - ∑(j ∈ disclosed) s_j
```

This bounds aggregate performance on unrevealed tests but does not reveal individual test content or scores.

The protocol prevents three attack categories. Authentication path verification prevents fabrication attacks where adversaries respond with fake test data, since only data producing the correct leaf hash and validating against the committed root can be successfully disclosed. The index-based challenge mechanism prevents selective disclosure manipulation where adversaries reveal only favorable tests, as verifiers specify arbitrary positions rather than allowing adversaries to choose. Privacy for unrevealed tests is maintained through cryptographic independence of authentication paths, ensuring that revealing tests at some positions provides no computational advantage for determining content at other positions.

This protocol balances benchmark privacy by default, graduated verification enabling different assurance levels, and cryptographic auditability ensuring disclosed tests can be verified without trust. The design addresses practical scenarios where benchmark providers must respond to specific concerns while maintaining security properties for routine verification.

### 4.7 Proof Generation and Verification Protocol

The following protocol specifies the operational procedures that benchmark providers and verifiers execute to generate and validate cryptographic proofs of evaluation claims. The protocol transforms the abstract dual-circuit architecture into concrete computational steps that produce verifiable proof packages enabling independent validation. This section formalizes the end-to-end workflow from initial test suite preparation through final verification acceptance or rejection.

#### Provider Protocol

The benchmark provider executes a five-phase protocol to generate verifiable proofs of evaluation results. The protocol begins with test suite preparation and deterministic partitioning before evaluation occurs, ensuring that test selection cannot be manipulated based on preliminary evaluation results or agent capabilities.

The provider first constructs the complete test suite containing n test cases, where each test i consists of a unique identifier id_i, a prompt defining the task, an expected output or reference solution, and scoring criteria specifying how agent outputs should be evaluated. The provider computes the full benchmark Merkle root M_root by hashing each test to create leaf nodes, constructing a complete binary Merkle tree from these leaves, and extracting the root hash. This commitment establishes the test suite composition before evaluation begins, preventing post-hoc test selection or modification.

The provider performs deterministic test partitioning to select the public subset using a cryptographic hash function applied to test identifiers. For each test i, the provider computes a selection value as the hash of the test identifier modulo a large prime, then selects tests with the lowest selection values to form the public subset of size k = ⌈0.05n⌉. This deterministic selection ensures that any party who possesses the test identifiers can verify which tests constitute the public subset, preventing strategic selection of easier tests for public disclosure. The provider records the subset indices [idx₁, idx₂, ..., idx_k] identifying which positions in the full benchmark array correspond to public tests.

The provider executes the evaluation by running the AI agent on all n tests in the benchmark under the committed evaluation methodology. For each test, the agent receives the prompt as input and generates an output through its reasoning process, which may involve tool usage, API calls, or multi-step computation. The evaluation framework records comprehensive execution logs capturing every tool invocation, intermediate result, and agent action during processing. After agent execution completes for each test, the provider applies the committed scoring methodology to compare the agent output against the expected output, producing a numerical score s_i ∈ [0, 100] for each test. The provider computes aggregate accuracy metrics for both the complete benchmark and for the public subset:

```
α_full = (1/n) × ∑(i=1 to n) s_i
α_subset = (1/k) × ∑(j=1 to k) s_idx_j
```

The provider constructs cryptographic commitments to the evaluation methodology by computing SHA-256 hashes of the evaluation library source code, scoring criteria specification, and execution logs. These hashes H_lib,SHA256, H_score,SHA256, and H_logs serve as content-addressable identifiers for the methodology components. The provider then computes Poseidon hashes of these SHA-256 values to produce the methodology commitments:

```
C_lib = Poseidon(H_lib,SHA256)
C_score = Poseidon(H_score,SHA256)
```

These commitments will serve as public parameters in the proof generation.

The provider generates the subset circuit proof by preparing circuit inputs from the public test data. For each test in the public subset, the provider computes hashes of the prompt, expected output, and agent output to create the tuple (id_idx_j, h_prompt,idx_j, h_expected,idx_j, h_output,idx_j, s_idx_j) for j ∈ {1, ..., k}. These tuples along with the execution log hash constitute the private inputs to the subset circuit. The public inputs consist of the claimed subset accuracy α_subset, the number of public tests k, and the pre-computed methodology commitments C_lib and C_score. The provider executes the subset circuit with these inputs to generate a witness satisfying all circuit constraints, then invokes the Groth16 prover to produce proof π₁ along with public outputs M_subset and C_logs.

The provider generates the main circuit proof by preparing substantially larger inputs encompassing the complete benchmark. The private inputs include test case data for all n tests, Merkle authentication paths proving each test's membership in the committed tree, subset extraction data specifying which tests form the public partition, and the raw methodology hashes H_lib,SHA256, H_score,SHA256, and H_logs. The public inputs consist of the committed full benchmark Merkle root M_root, claimed accuracies α_full and α_subset, test counts n and k, and critically the subset Merkle root M_subset that was output by the subset circuit. The provider executes the main circuit to generate a witness satisfying all constraints including the critical binding constraint that the recomputed subset root equals M_subset, then invokes the Groth16 prover to produce proof π₂ along with public outputs C_logs, C_lib, and C_score.

The provider publishes a complete proof package containing both zero-knowledge proofs π₁ and π₂, their corresponding verification keys generated during the trusted setup ceremony, all public inputs and outputs for both circuits, the complete test content for the public subset including prompts and expected outputs, the committed full benchmark Merkle root M_root, and the methodology source code enabling independent verification of the content-addressable commitments. This proof package provides all information necessary for independent verification without revealing private test content.

#### Verifier Protocol

The verifier executes a three-tier validation protocol that provides complementary assurance mechanisms at different confidence levels. The verification proceeds from empirical validation through cryptographic verification to binding validation, with each tier addressing different aspects of evaluation integrity.

The empirical validation tier enables the verifier to reproduce evaluation on the public test subset through direct execution. The verifier obtains the published evaluation library source code and scoring criteria from the proof package, computes their SHA-256 hashes, and confirms these hashes match the committed values by verifying that:

```
Poseidon(SHA256(library_code)) = C_lib
Poseidon(SHA256(scoring_criteria)) = C_score
```

where the commitment values are extracted from the subset circuit's public inputs. The verifier then executes the agent on each public test using the verified evaluation library, applies the verified scoring criteria to the agent outputs, and computes scores for all public tests. The verifier calculates the aggregate accuracy across public tests and confirms it matches the claimed value α_subset within acceptable tolerance accounting for API non-determinism. This empirical validation provides direct observable evidence that the claimed methodology commitments correspond to actual evaluation procedures and that the public subset achieved the claimed performance.

The cryptographic verification tier validates the mathematical correctness of both zero-knowledge proofs. The verifier invokes the Groth16 verification algorithm on proof π₁ using the subset circuit's verification key and the public inputs consisting of α_subset, k, C_lib, and C_score. The verification algorithm checks the pairing equations that characterize valid Groth16 proofs, confirming that the proof demonstrates knowledge of private inputs satisfying all subset circuit constraints. The verifier similarly validates proof π₂ using the main circuit's verification key and its public inputs consisting of M_root, α_full, α_subset, n, k, and M_subset. Both verification operations complete in constant time regardless of the size of private inputs, requiring only milliseconds of computation. Successful verification of both proofs establishes that the claimed accuracy values are mathematically consistent with some private test case data that satisfies all circuit constraints, though it does not yet establish that the two proofs refer to consistent data.

The binding validation tier establishes consistency between the two proofs through comparison of their public parameters. The verifier extracts the subset Merkle root M_subset from the subset circuit's public outputs and confirms it appears as a public input to the main circuit, verifying that both proofs reference the same commitment to the public subset composition. The verifier extracts the methodology commitments C_lib and C_score from the main circuit's public outputs and confirms they match the corresponding public inputs to the subset circuit, verifying that both proofs used identical evaluation methodology. The verifier confirms that the execution logs commitment C_logs output by both circuits has the same value, verifying that both proofs refer to the same evaluation session. If all three binding checks succeed, the verifier has established that the subset circuit proved accuracy on a specific public subset under specific methodology, the main circuit proved accuracy on a complete benchmark that includes that exact same public subset under that exact same methodology, and both proofs refer to the same execution session.

#### Protocol Completeness and Soundness

The protocol satisfies completeness in that honest providers who evaluate agents correctly on committed benchmarks can always generate valid proofs that pass verification. The deterministic partitioning ensures consistent subset selection. The evaluation execution under committed methodology produces scores that aggregate to the claimed accuracies. The Merkle tree construction from actual test case data produces roots that validate correctly. The circuit constraints are satisfiable when provided with honest witness data. The Groth16 proof generation succeeds for satisfiable witnesses, producing proofs that pass verification. The methodology commitments computed from actual source code match across both circuits. Therefore, honest providers can complete the entire protocol and produce proof packages that verifiers accept.

The protocol satisfies computational soundness in that adversaries cannot generate valid proof packages for false claims except with negligible probability. An adversary attempting to claim higher accuracy than achieved cannot satisfy the score aggregation constraints in the circuits, preventing proof generation. An adversary attempting to use different tests than committed cannot provide valid Merkle authentication paths, violating the authentication constraints in the main circuit. An adversary attempting to use different tests for public versus private evaluation cannot simultaneously satisfy the subset root recomputation constraint that requires extracted tests to match the subset circuit's commitment. An adversary attempting to apply different methodology to public versus private tests cannot produce matching methodology commitments across both circuits, causing binding validation to fail. The security of these properties reduces to the collision resistance of Poseidon hash, the soundness of the Groth16 proof system, and the discrete logarithm assumption on the BN254 curve.

The protocol provides zero-knowledge for private test content in that the proof package reveals no information about individual private tests beyond what can be inferred from the public parameters and claimed aggregate accuracy. The Groth16 proofs satisfy the zero-knowledge property, revealing nothing about the private witnesses beyond their existence and consistency with public inputs. The Merkle root commitment is hiding in that it reveals no information about individual leaf values beyond tree structure. The methodology commitments reveal only content-addressable hashes of evaluation code, not the detailed behavioral traces of private test evaluation. The aggregate accuracy constraint bounds the sum of private test scores but does not reveal their distribution or individual values. Therefore, verifiers learn that some private tests exist achieving some aggregate performance under committed methodology, but cannot determine specific private test content, agent outputs, or individual scores without selective disclosure.

## 5. Implementation

### 5.1 Circuit Implementation

The theoretical design presented in Section 2 translates to working code through a comprehensive implementation using the Circom domain-specific language for arithmetic circuit specification and the Groth16 proving system for proof generation. This section details the practical realization of both the subset and main verification circuits, including their parameters, constraint budgets, and optimization strategies employed to achieve realistic performance on production-scale benchmarks.

#### Circuit Specification Framework

Both verification circuits are implemented in Circom version 2.0, a declarative language designed specifically for defining arithmetic circuits over finite fields. Circom provides a structured approach to constraint programming where developers specify relationships between signals rather than imperative computation steps. The compiler transforms these high-level specifications into rank-1 constraint systems (R1CS) that define the polynomial constraints underlying the zero-knowledge proofs.

The implementation uses the Groth16 proving system operating over the BN254 elliptic curve. This pairing-friendly curve supports efficient bilinear pairings while maintaining approximately 128 bits of security. The proof generation pipeline follows the standard Groth16 workflow. First, the circuit specification compiles to an R1CS representation capturing the constraint relationships. Second, a trusted setup ceremony generates circuit-specific proving and verification keys through a multi-party computation protocol that establishes the common reference string. Third, during proof generation, the prover executes witness generation to compute assignments for all circuit signals given the private inputs, then constructs a zero-knowledge proof demonstrating knowledge of a valid witness satisfying the constraints. Fourth, verifiers check proofs in constant time using only the public inputs and verification key, independent of circuit size.

#### Circuit Parameters and Capacity

The subset verification circuit supports evaluation of up to fifty public test cases, with a Merkle tree depth of six levels. This depth provides capacity for sixty-four leaf positions when padded to the next power of two, allowing efficient tree construction while maintaining minimal constraint overhead. The fifty-test maximum accommodates typical public subset sizes of five to ten percent for benchmarks containing five hundred to one thousand total tests.

The main verification circuit scales to support up to one thousand test cases in the complete benchmark, with a Merkle tree depth of ten levels. This depth yields a capacity of 1,024 leaf positions, providing headroom beyond the thousand-test maximum to avoid requiring exact power-of-two test counts. The ten-level depth represents a practical balance between constraint efficiency and capacity needs for contemporary AI benchmarks.

Both circuits use an eight-bit width for numerical comparisons, providing a range of zero to 255 that adequately covers the score domain of zero to one hundred with margin for intermediate calculations. The bit width parameter controls the complexity of comparison operations, with larger widths increasing constraint counts proportionally. Eight bits minimizes constraints while supporting the required numerical range.

#### Variable-Length Input Handling

A fundamental challenge in circuit design is accommodating variable-length inputs within the fixed-size structure imposed by compiled circuits. Unlike traditional programming where data structures can grow dynamically, circuits must define their complete topology at compile time with exact signal counts. This constraint necessitates padding mechanisms that enable circuits to handle any input size up to the declared maximum.

The implementation adopts a validity flag approach where each test position includes an implicit validity indicator determined by comparison against the declared test count. The circuit receives test data for all maximum positions but only processes those with indices below the actual number of tests. During score aggregation, each test's score is multiplied by its validity flag before summing, effectively zeroing out contributions from padding positions while maintaining a uniform loop structure.

For the subset circuit supporting fifty maximum tests, padding extends the input arrays to fifty elements regardless of the actual public subset size. When a benchmark contains only twenty public tests, the remaining thirty positions receive zero values for all fields including test identifiers, content hashes, and scores. The circuit's validity checking ensures these padded positions do not contribute to aggregation or affect the computed Merkle root beyond extending the tree to its full capacity.

The main circuit employs an analogous padding strategy for the complete test suite. If a benchmark contains seven hundred actual tests against the one thousand maximum capacity, three hundred positions receive padding values. The Merkle tree construction operates on all one thousand leaf positions, with padded leaves using zero values that yield deterministic hash outputs in unused portions of the tree.

This padding approach maintains constant constraint counts regardless of actual test counts, enabling a single compiled circuit to handle any benchmark size up to the maximum. The alternative of dynamically sized circuits would require recompilation and trusted setup for each benchmark size, imposing substantial overhead. Fixed-size circuits with intelligent padding trade slight inefficiency from processing unused positions for the practical benefit of circuit reusability.

#### Cryptographic Primitives and Optimization

The choice of cryptographic hash function represents the most significant optimization decision affecting circuit performance. Traditional cryptographic hashes like SHA-256, while secure and widely deployed, require thousands of constraints per hash operation due to their bit-oriented nature involving extensive XOR and rotation operations. In circuits operating over finite fields, each bit-level operation must be decomposed into field arithmetic, resulting in substantial constraint overhead.

The implementation instead employs the Poseidon hash function throughout the circuit design. Poseidon is a cryptographic hash function specifically designed for efficient implementation in arithmetic circuits and zero-knowledge proof systems. It operates natively over prime fields using substitution-permutation networks based on field operations including addition, multiplication, and exponentiation. A single Poseidon hash over two field elements requires approximately thirty constraints compared to the thirty thousand required for SHA-256 over equivalent input sizes.

This thousand-fold reduction in constraint count per hash operation dramatically impacts overall circuit performance.

Beyond hash function selection, several additional optimizations reduce constraint counts. The circuit reuses intermediate hash values where possible rather than recomputing identical operations. For example, when computing leaf hashes that share common subcomponents, the shared portions are computed once and referenced multiple times. The Merkle tree construction orders operations to minimize redundant computation, building the complete tree level-by-level with careful signal ordering.

Comparison operations use optimized templates from the circomlib library that implement efficient less-than and equality checks through binary decomposition. These templates minimize constraints while maintaining correctness guarantees. Range checks constraining scores to the valid range of zero to one hundred employ the LessEqThan template, which performs binary comparisons with constraint counts proportional to the bit width rather than the value range.

The subset extraction logic in the main circuit, which identifies tests at specified indices from the complete dataset, uses a selector pattern that avoids conditional branching. For each subset position, the circuit computes a weighted sum over all possible test positions where the weight is one if indices match and zero otherwise. This approach maintains constant control flow while effectively implementing index-based selection through arithmetic operations.

#### Constraint Budgets and Circuit Complexity

The subset verification circuit, configured to support fifty public tests with a six-level Merkle tree, compiles to exactly 76,886 constraints as reported by the snarkjs compilation output. This count includes roughly fifteen thousand constraints for computing fifty leaf hashes from test case data, with each leaf hash requiring five field elements as input to Poseidon. The Merkle tree construction from fifty leaves adds approximately thirty thousand constraints for the hierarchical hashing to produce the root. Score aggregation with validity checking contributes roughly ten thousand constraints for summing valid test scores while excluding padded positions. Commitment computation for methodology binding adds approximately five thousand constraints for hashing library version and scoring method identifiers. The remaining twenty-five thousand constraints support auxiliary operations including range checks, equality comparisons, and public input binding.

The main verification circuit, supporting one thousand tests and fifty subset positions with a ten-level primary Merkle tree, compiles to exactly 6,805,816 constraints. This substantially larger count reflects the circuit's comprehensive verification responsibilities. Computing one thousand leaf hashes from complete test data requires approximately three hundred thousand constraints. Verifying Merkle authentication paths for all one thousand tests dominates the constraint budget at approximately four million constraints, as each path verification traverses ten tree levels with one Poseidon hash per level.

The subset correspondence verification, which proves that the fifty claimed public tests actually exist at their declared indices in the complete dataset, adds approximately one million five hundred thousand constraints. This verification uses the selector pattern to extract test data at specified indices, requiring one thousand comparisons per subset position to identify matches. Computing the subset Merkle root from extracted test data adds another two hundred thousand constraints for building the fifty-leaf tree and verifying it matches the subset circuit's output. Score aggregation, commitment computation, and range checking contribute the remaining four hundred thousand constraints.

These constraint counts are manageable with contemporary proving systems. The Groth16 implementation in the snarkjs library handles circuits with millions of constraints on standard hardware, though proof generation time scales roughly linearly with constraint count. The 6.8 million constraint main circuit operates comfortably on standard workstations and laptops, including systems with 32 to 64 gigabytes of memory.

#### Trusted Setup Ceremony

The Groth16 proving system requires a trusted setup ceremony to generate the circuit-specific proving and verification keys. This ceremony consists of two phases. Phase one, known as the Powers of Tau ceremony, generates a common reference string independent of any specific circuit. This phase requires a multi-party computation where multiple participants each contribute randomness, ensuring security as long as at least one participant destroys their randomness contribution after the ceremony.

For the circuits described here, the Powers of Tau ceremony uses power twenty-four, supporting circuits with up to sixteen million seven hundred seventy-seven thousand two hundred sixteen constraints. This capacity exceeds the main circuit's six million constraint count while providing headroom for future circuit enhancements. The phase one ceremony produces a universal parameter file that can be reused across different circuits, amortizing the setup cost.

Phase two customizes the universal parameters for each specific circuit by computing circuit-specific evaluation points. This phase takes the circuit's R1CS representation and the phase one parameters as input, producing the final proving key and verification key. For the subset circuit with eighty-five thousand constraints, phase two completes in approximately fifteen seconds. For the main circuit with six million constraints, phase two requires approximately four minutes.

In the current implementation, the setup ceremony uses test parameters generated through a simplified process where a single party contributes randomness. This approach is suitable for research prototypes and demonstrations but does not provide the security guarantees required for production deployment. A production system would employ a multi-party ceremony with numerous independent contributors, each verifying previous contributions and adding their own randomness. As long as one honest participant successfully destroys their randomness, the setup remains secure even if all other participants collude or suffer compromise.

The setup ceremony incurs a one-time cost when circuits are first deployed or when circuit parameters change requiring recompilation. Once the proving and verification keys are generated, they can be reused indefinitely for all proofs using that circuit configuration. This amortization makes the initial setup cost acceptable for benchmarks that see repeated use across multiple AI system evaluations.

### 5.2 Evaluation Framework

The cryptographic evaluation system requires a robust framework for executing AI agents on benchmark tasks and scoring their outputs according to standardized methodologies. This section describes the provider-agnostic evaluation framework that enables integration with diverse AI systems and scoring approaches while maintaining the deterministic execution logs and methodology commitments required for zero-knowledge proof generation.

### Provider Abstraction Architecture

The framework adopts a plugin architecture based on abstract interface definitions that specify contracts for agent execution and output scoring without imposing constraints on underlying implementations. This design enables the verification system to support any AI system or evaluation methodology that satisfies the interface contracts, promoting extensibility and reusability across different research contexts and deployment scenarios.

Two primary abstractions structure the framework. The AgentProvider interface defines how arbitrary AI systems execute on evaluation prompts, while the ScorerProvider interface defines how agent outputs are evaluated against expected results or rubrics. Both interfaces expose minimal surface areas consisting of a single primary method and several auxiliary methods for identification and capability discovery. This simplicity reduces integration burden while providing sufficient structure for the verification pipeline to orchestrate execution and proof generation.

The abstract base classes enforce interface conformance through runtime validation in their constructors, rejecting direct instantiation and requiring subclass implementation of abstract methods. Error handling follows a consistent pattern where provider-specific exceptions are caught and wrapped in standardized error types that propagate up the verification pipeline with contextual information including test identifiers and provider names. This approach maintains clean separation between provider logic and verification orchestration while enabling informative error reporting when execution or scoring fails.

### Agent Provider Interface

The AgentProvider abstraction enables integration with diverse AI systems through a consistent execution interface. Rather than examining the abstract interface, the OpenAI implementation in src/providers/agents/OpenAIProvider.js demonstrates how real agent execution integrates with the evaluation framework:

```javascript
/**
 * Execute agent on a prompt using OpenAI Chat Completions
 */
async execute(prompt, context) {
  try {
    context.setProvider(this.getName(), this.getVersion());
    const client = await this._getClient();

    // Build messages array
    const messages = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: prompt }
    ];

    // Prepare API parameters
    const params = {
      model: this.model,
      messages,
      temperature: this.temperature,
      max_completion_tokens: this.maxTokens,
      top_p: this.topP,
      frequency_penalty: this.frequencyPenalty,
      presence_penalty: this.presencePenalty
    };

    // Add tools if configured
    if (this.tools && this.tools.length > 0) {
      params.tools = this.tools;
      params.tool_choice = 'auto';
    }

    // Log the API call
    context.logToolCall({
      toolName: 'OpenAI Chat Completion',
      toolInput: {
        model: this.model,
        prompt: prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''),
        temperature: this.temperature,
        maxTokens: this.maxTokens
      },
      toolOutput: { status: 'calling' }
    });

    // Make API call
    const completion = await client.chat.completions.create(params);
    const message = completion.choices[0].message;
    let output = message.content || '';

    // Handle tool calls if present
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        context.logToolCall({
          toolName: `OpenAI Tool: ${toolCall.function.name}`,
          toolInput: JSON.parse(toolCall.function.arguments || '{}'),
          toolOutput: { toolCallId: toolCall.id }
        });
      }
      output += `\n\n[Tool calls requested: ${message.tool_calls.map(tc => tc.function.name).join(', ')}]`;
    }

    // Log the response
    context.logToolCall({
      toolName: 'OpenAI Chat Completion',
      toolInput: { completionId: completion.id },
      toolOutput: {
        output: output.substring(0, 500) + (output.length > 500 ? '...' : ''),
        finishReason: completion.choices[0].finish_reason,
        tokensUsed: completion.usage?.total_tokens || 0,
        model: completion.model
      }
    });

    context.complete({
      output,
      tokensUsed: completion.usage?.total_tokens,
      finishReason: completion.choices[0].finish_reason
    });

    return output;

  } catch (error) {
    context.fail(error);
    throw this._wrapError(error, 'execution');
  }
}
```

This implementation demonstrates the complete execution flow including API parameter construction, tool call handling, comprehensive logging through the ExecutionContext, and error management. The logging calls capture all operations performed during agent execution, building the execution trace that later undergoes cryptographic commitment.

The execute method signature provides explicit threading of the ExecutionContext through the agent execution path. This context object serves as an execution trace recorder, capturing all tool calls, API requests, and intermediate operations performed during agent execution. Providers invoke logging methods on the context as they perform operations, building a comprehensive execution log that later undergoes cryptographic commitment for proof generation.

Provider implementations handle diverse execution patterns while conforming to the common interface. The Anthropic provider in src/providers/agents/AnthropicProvider.js demonstrates a different integration pattern using SDK hooks to intercept and log tool calls:

```javascript
/**
 * Execute agent using Claude Agent SDK with automatic tool call logging
 */
async execute(prompt, context) {
  try {
    context.setProvider(this.getName(), this.getVersion());

    const query = await this._getSDK();

    // Create logging hooks for the SDK
    const loggingHooks = this._createLoggingHooks(context);

    // Merge with user-provided hooks
    const mergedHooks = this._mergeHooks(loggingHooks, this.sdkOptions.hooks || {});

    // Prepare SDK options
    const finalOptions = {
      ...this.sdkOptions,
      model: this.model,
      hooks: mergedHooks
    };

    // Execute agent using SDK
    let output = '';
    const agentQuery = query({ prompt, options: finalOptions });

    for await (const message of agentQuery) {
      if (message.type === 'result' && message.subtype === 'success') {
        output = message.result || '';
      } else if (message.type === 'error') {
        throw new ProviderExecutionError(
          `Claude Agent SDK error: ${message.error || 'Unknown error'}`
        );
      }
    }

    context.complete({ output });
    return output;

  } catch (error) {
    context.fail(error);
    throw this._wrapError(error, 'execution');
  }
}

/**
 * Create logging hooks for Claude Agent SDK
 * Automatically logs all tool use through PostToolUse hook
 */
_createLoggingHooks(context) {
  return {
    PostToolUse: [{
      hooks: [async (hookInput, toolUseID) => {
        context.logToolCall({
          toolName: hookInput.tool_name,
          toolInput: hookInput.tool_input,
          toolOutput: hookInput.tool_response,
          toolUseId: toolUseID
        });
        return {};
      }]
    }],
    PreToolUse: [{
      hooks: [async () => {
        // Auto-approve all tools (configurable via sdkOptions)
        return { decision: 'approve' };
      }]
    }]
  };
}
```

This implementation demonstrates SDK hook integration where tool call logging happens automatically through PostToolUse callbacks, capturing all Read, Write, Bash, and other tool invocations without requiring explicit logging calls in the agent execution logic.

Auxiliary methods support provider identification and capability discovery. The getName method returns a string identifier for the provider that appears in execution logs and commitment computations. The getVersion method returns a semantic version string enabling differentiation between provider implementation versions. The getCapabilities method returns a structured object describing provider features including support for streaming, tool calling, multimodal inputs, and context window sizes. These capabilities inform test suite design and execution strategies without coupling the core verification logic to specific provider capabilities.

The provider abstraction handles configuration validation in constructors through a protected validateConfig method that subclasses override to enforce provider-specific configuration requirements. API key validation, model selection constraints, and parameter range checks occur during construction, failing fast with descriptive errors rather than deferring validation until execution. This approach improves debuggability by surfacing configuration errors immediately rather than obscuring them in execution logs.

Error handling within providers wraps provider-specific exceptions in a standardized ProviderExecutionError type that carries the original error message, provider name, and execution context. This wrapping preserves error information while enabling uniform error handling in the verification pipeline. The base AgentProvider class provides a protected wrapError method that subclasses invoke when catching exceptions, ensuring consistent error reporting across all provider implementations.

### Scorer Provider Interface

The ScorerProvider abstraction enables flexible evaluation methodologies through pluggable scoring implementations. The AIScorer implementation in src/providers/scorers/AIScorer.js demonstrates how language models perform semantic evaluation of agent outputs:

```javascript
/**
 * Score agent output using AI evaluation
 */
async score({ agentOutput, idealOutput, scoringType, criteria, metadata }) {
  this._validateScoringType(scoringType);

  let lastError = null;

  for (let attempt = 0; attempt < this.maxRetries; attempt++) {
    try {
      const prompt = this._buildScoringPrompt(agentOutput, idealOutput, scoringType, criteria);
      const response = await this._callLLM(prompt, scoringType);
      const score = this._parseScore(response, scoringType);

      this._validateScore(score, scoringType);
      return score;

    } catch (error) {
      lastError = error;

      // Retry on parsing errors
      if (error.message.includes('parse') && attempt < this.maxRetries - 1) {
        continue;
      }

      throw this._wrapError(error, metadata?.testId, 'scoring');
    }
  }

  throw new ScoringError(
    `Failed to score after ${this.maxRetries} attempts: ${lastError.message}`,
    metadata?.testId,
    { attempts: this.maxRetries }
  );
}

/**
 * Build scoring prompt based on evaluation type
 */
_buildScoringPrompt(agentOutput, idealOutput, scoringType, criteria) {
  if (scoringType === 'binary') {
    return `You are evaluating an AI agent's output.

Agent Output:
${agentOutput}

Ideal Output:
${idealOutput}

${criteria ? `Evaluation Criteria:\n${criteria}\n\n` : ''}
Does the agent output match the ideal output sufficiently?
Consider semantic meaning, not just exact text matching.

Respond with ONLY "PASS" or "FAIL".`;
  } else {
    return `You are evaluating an AI agent's output on a scale of 0-100.

Agent Output:
${agentOutput}

Ideal Output:
${idealOutput}

${criteria ? `Evaluation Criteria:\n${criteria}\n\n` : ''}
Rate how well the agent output matches the ideal output (0-100):
- 0: Completely wrong or irrelevant
- 50: Partially correct but missing key elements
- 100: Perfect match (semantically equivalent)

Respond with ONLY a number between 0 and 100.`;
  }
}

/**
 * Call LLM API for scoring
 */
async _callLLM(prompt, scoringType) {
  const client = await this._getClient();

  if (this.provider === 'openai') {
    const completion = await client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are an objective evaluator. Provide concise, accurate assessments.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: this.temperature
    });

    return completion.choices[0].message.content.trim();

  } else if (this.provider === 'anthropic') {
    const response = await client.messages.create({
      model: this.model,
      temperature: this.temperature,
      system: 'You are an objective evaluator. Provide concise, accurate assessments.',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: this.maxCompletionTokens
    });

    return response.content[0].text.trim();
  }
}
```

This implementation shows the complete scoring workflow including prompt engineering for both binary and numeric evaluation, multi-provider LLM API integration, retry logic for handling parsing failures, and error handling with contextual information.

The score method constitutes the primary interface contract. It receives a parameter object containing the agent's output, the ideal or expected output, a scoring type indicator specifying numeric or binary evaluation, optional evaluation criteria describing what constitutes correct or high-quality outputs, and optional metadata providing test-specific context. The method returns either a number between zero and one hundred for numeric evaluation or a boolean for binary evaluation.

AI-based scorers leverage language models to perform semantic evaluation of agent outputs. The AIScorer implementation in src/providers/scorers/AIScorer.js supports multiple LLM providers including OpenAI and Anthropic, constructing evaluation prompts that present the agent output alongside ideal output and any specified criteria. The scorer prompts the language model to assess semantic equivalence or quality according to the criteria, then parses the model's response to extract a numeric score or binary judgment. Temperature parameters control determinism, with temperature zero reducing but not eliminating variance in repeated evaluations of identical inputs. The implementation uses configurable default models including gpt-5-mini for OpenAI and claude-haiku-4-5 for Anthropic, balancing evaluation quality with API cost considerations.

The AI scorer implementation includes retry logic to handle parsing failures when language models produce responses that do not conform to expected formats. The scorer attempts up to three evaluations with fresh API calls, parsing each response and validating the extracted score. If all attempts fail to produce valid scores, the scorer raises a ScoringError with context about the failure pattern. This robustness mechanism addresses the inherent variability in language model outputs while maintaining bounded retry counts to prevent indefinite hanging.

Deterministic scorers provide algorithmic evaluation without AI inference, enabling instant scoring with zero API costs and perfect reproducibility. The DeterministicScorer implementation in src/providers/scorers/DeterministicScorer.js offers multiple comparison methods including exact string matching, Jaccard similarity coefficient computation, Levenshtein edit distance measurement, and token overlap analysis. Configuration parameters control case sensitivity, whitespace normalization, and threshold values for converting similarity scores to binary pass-fail judgments. These deterministic methods excel at evaluating tasks with objective correct answers where semantic interpretation is unnecessary or undesirable.

The DeterministicScorer demonstrates algorithmic evaluation without requiring AI API calls:

```javascript
/**
 * DeterministicScorer - Rule-based scoring without AI
 * Supports multiple comparison methods for different use cases
 */
export class DeterministicScorer extends ScorerProvider {
  constructor(config) {
    super(config);
    this.method = config.method || 'jaccard'; // 'exact', 'jaccard', 'levenshtein', 'token'
    this.caseSensitive = config.caseSensitive !== false;
    this.ignoreWhitespace = config.ignoreWhitespace !== false;
    this.binaryThreshold = config.binaryThreshold || 0.8;
  }

  getType() {
    return 'deterministic';
  }

  getName() {
    return `deterministic-${this.method}`;
  }

  async score({ agentOutput, idealOutput, scoringType, criteria, metadata }) {
    // Normalize strings
    let agent = agentOutput || '';
    let ideal = idealOutput || '';

    if (!this.caseSensitive) {
      agent = agent.toLowerCase();
      ideal = ideal.toLowerCase();
    }

    if (this.ignoreWhitespace) {
      agent = agent.replace(/\s+/g, ' ').trim();
      ideal = ideal.replace(/\s+/g, ' ').trim();
    }

    // Compute similarity score
    let similarity = 0;

    switch (this.method) {
      case 'exact':
        similarity = agent === ideal ? 1.0 : 0.0;
        break;

      case 'jaccard':
        similarity = this._jaccardSimilarity(agent, ideal);
        break;

      case 'levenshtein':
        similarity = this._levenshteinSimilarity(agent, ideal);
        break;

      case 'token':
        similarity = this._tokenOverlap(agent, ideal);
        break;

      default:
        throw new ScoringError(`Unknown scoring method: ${this.method}`);
    }

    // Convert to appropriate output type
    if (scoringType === 'binary') {
      return similarity >= this.binaryThreshold;
    }

    return Math.round(similarity * 100);
  }

  /**
   * Compute Jaccard similarity (intersection over union of word sets)
   */
  _jaccardSimilarity(str1, str2) {
    const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 0));
    const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 0));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;

    return intersection.size / union.size;
  }
}
```

This implementation provides instant, reproducible scoring with zero API costs, making it ideal for benchmarks with objective evaluation criteria.

Specialized scorers address domain-specific evaluation requirements that generic scorers cannot handle. The HumanEvalScorer in src/providers/scorers/HumanEvalScorer.js demonstrates this pattern by executing Python code solutions in isolated processes and running the benchmark's provided unit test suites. The scorer writes the agent's code solution to a temporary file, imports it into a Python subprocess along with test code, executes the test harness with a configurable timeout (defaulting to ten seconds), and captures whether tests pass or fail. This execution-based evaluation provides ground truth about functional correctness that syntactic comparison cannot achieve.

Scorer implementations report their type through the getType method, returning one of 'ai', 'deterministic', 'human', or 'custom'. This type information enables test suites to specify appropriate scorers for different task categories. The supportsType method allows runtime queries about whether a scorer supports numeric versus binary evaluation, enabling validation that scorer capabilities match test requirements before evaluation begins.

Configuration validation for scorers mirrors the agent provider pattern. Scorer constructors invoke validateConfig on the provided configuration object, checking for required API keys, valid model selections, appropriate threshold values, and other scorer-specific requirements. Invalid configurations raise ProviderConfigError with descriptive messages identifying the validation failure, failing fast rather than deferring errors until scoring attempts.

### Execution Context and Logging

The ExecutionContext class provides a standardized mechanism for capturing agent execution traces across diverse provider implementations. Each test case execution receives a fresh context instance identified by the test case ID. The provider invokes logging methods on this context as execution proceeds, building a chronological record of operations that later undergoes cryptographic commitment.

The primary logging method is logToolCall, which records individual operations performed during execution. Providers invoke this method for any action beyond pure text generation, including file system operations, network requests, subprocess invocations, and interactions with external APIs. The method signature, defined in src/core/interfaces/ExecutionContext.js, accepts a parameters object containing toolName, toolInput, toolOutput, an optional toolUseId, and optional metadata. Each logged tool call includes the tool name identifying the operation type, a tool input object describing parameters or arguments, a tool output object containing results, an optional tool use ID for correlation with provider-specific execution traces, and optional metadata providing additional context.

The ExecutionContext implementation demonstrates how execution traces are captured during agent execution:

```javascript
/**
 * ExecutionContext - Universal Execution Context for Agent Providers
 * Provides consistent interface for logging tool calls and tracking execution state
 */
export class ExecutionContext {
  constructor(testId, options = {}) {
    if (!testId) {
      throw new Error('ExecutionContext requires a testId');
    }
    this.testId = testId;
    this.logs = [];
    this.metadata = {
      testId,
      startTime: Date.now(),
      endTime: null,
      duration: null
    };
    this.providerName = null;
    this.providerVersion = null;
    this.isComplete = false;
    this.error = null;
  }

  /**
   * Log a tool call or agent operation
   * This is the primary method providers use to log their operations
   *
   * @param {object} params - Tool call parameters
   * @param {string} params.toolName - Name of the tool/operation
   * @param {object|string} params.toolInput - Input to the tool
   * @param {object|string} params.toolOutput - Output from the tool
   * @param {string} [params.toolUseId] - Optional unique ID for this tool use
   * @param {object} [params.metadata] - Optional additional metadata
   */
  logToolCall({ toolName, toolInput, toolOutput, toolUseId, metadata = {} }) {
    if (!toolName) {
      throw new Error('toolName is required for logToolCall');
    }

    const logEntry = {
      timestamp: Date.now(),
      testId: this.testId,
      toolName,
      toolInput: this._sanitizeInput(toolInput),
      toolOutput: this._sanitizeOutput(toolOutput),
      toolUseId: toolUseId || `tool-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      metadata: {
        ...metadata,
        provider: this.providerName
      }
    };

    this.logs.push(logEntry);
  }

  /**
   * Set provider information
   */
  setProvider(name, version) {
    this.providerName = name;
    this.providerVersion = version;
    this.metadata.provider = name;
    this.metadata.providerVersion = version;
  }

  /**
   * Mark execution as complete
   */
  complete(result = {}) {
    this.isComplete = true;
    this.metadata.endTime = Date.now();
    this.metadata.duration = this.metadata.endTime - this.metadata.startTime;
    this.metadata.result = result;
  }
}
```

This implementation provides a simple yet comprehensive logging interface that works across all agent provider types while maintaining the execution trace needed for cryptographic commitment.

The execution context stores logged tool calls in a chronological array maintaining insertion order. Each entry receives a timestamp reflecting when the logging call occurred, though these timestamps serve informational purposes only and do not participate in cryptographic commitments due to their non-deterministic nature. The context also tracks execution state including start and end times, total duration, completion status, and any errors encountered during execution. Providers signal completion by invoking the complete method with result metadata or the fail method with error information.

Context metadata accumulates throughout execution. The provider sets its name and version through the setProvider method during initialization, recording this information in the context's metadata object. When execution completes, the metadata includes the provider identity, all logged operations, timing information, and the final execution status. This comprehensive metadata enables post-hoc analysis of execution patterns and facilitates debugging when unexpected behaviors occur.

The context provides serialization methods that convert logged operations into deterministic string representations suitable for cryptographic hashing. The serializeForHash method produces a canonical JSON encoding of the execution trace with non-deterministic fields removed and consistent ordering imposed. Timestamp fields are excluded from this serialization since they vary across runs even for identical agent behavior. Tool use IDs generated by providers may also be excluded if they contain random components, ensuring that functionally identical execution sequences produce identical hash values.

Multiple contexts may be active simultaneously when the evaluation framework executes tests in parallel. Each context maintains independent state associated with a specific test case, preventing cross-contamination between concurrent executions. The verification pipeline collects completed contexts after all tests finish, extracting their logs and computing cryptographic commitments over the complete execution trace for proof generation.

### Execution Log Serialization

Converting execution logs into formats suitable for cryptographic commitments requires careful serialization that eliminates non-deterministic variation while preserving security-relevant information. The ExecutionLogger class in src/logging/ExecutionLogger.js manages this transformation, accepting logs from completed ExecutionContext instances and producing deterministic representations suitable for hashing. The logger provides a recordTestLogs method that ingests logs captured by ExecutionContext instances, standardizing the format and assigning sequential numbers to establish canonical ordering.

The logger maintains two data structures. A flat array stores all log entries across all test cases in chronological order with globally unique sequence numbers. A map indexes this array by test case ID, enabling efficient retrieval of logs associated with specific tests. This dual representation supports both global analysis of execution patterns and test-specific log extraction during proof generation.

Log sanitization removes non-deterministic fields that vary across runs without affecting evaluation correctness. Timestamp values are stripped from commitment-destined representations despite their presence in raw logs. Random identifiers including UUIDs, session IDs, and provider-generated correlation tokens are also removed. The sanitization process in ExecutionLogger.sanitizeData recursively traverses log entry objects, identifying and excluding fields with names suggesting non-deterministic content through the isVolatileKey method. A configurable set of field name patterns defines volatility, matching substrings like 'timestamp', 'uuid', 'session', 'token', 'latency', and 'duration'. The implementation specifically excludes fields such as toolUseId and idempotencyKey that contain provider-specific random values.

The ExecutionLogger implements comprehensive sanitization to ensure deterministic log hashing:

```javascript
/**
 * ExecutionLogger - Captures and sanitizes execution logs for cryptographic commitment
 */
export class ExecutionLogger {
  /**
   * Sanitize data by removing non-deterministic fields
   * @param {any} data - Data to sanitize
   * @returns {any} Sanitized data
   */
  sanitizeData(data) {
    if (typeof data === 'bigint') {
      return data.toString();
    }

    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    // Remove non-deterministic fields
    const sanitized = { ...data };
    for (const key of Object.keys(sanitized)) {
      if (this._isVolatileKey(key)) {
        delete sanitized[key];
        continue;
      }

      if (typeof sanitized[key] === 'bigint') {
        sanitized[key] = sanitized[key].toString();
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Determine if a key should be excluded from commitments
   * @param {string} key
   * @returns {boolean}
   * @private
   */
  _isVolatileKey(key) {
    if (!key) return false;
    const lower = String(key).toLowerCase();
    
    // Exact matches for known volatile fields
    if (['uuid', 'session_id', 'sessionid', 'tooluseid', 'idempotencykey'].includes(lower)) {
      return true;
    }
    
    // Pattern matching for volatile field categories
    if (
      lower.includes('token') ||
      lower.includes('timestamp') ||
      lower.includes('latency') ||
      lower.includes('duration')
    ) {
      return true;
    }
    
    if (lower === 'traceid' || lower === 'trace_id') {
      return true;
    }
    
    return false;
  }

  /**
   * Compute hash of logs for cryptographic commitment
   * @returns {string} Hex string hash
   */
  computeLogsHash() {
    return sha256Hex(deterministicStringify(this.getSanitizedLogs()));
  }
}
```

This sanitization approach ensures that functionally equivalent execution sequences produce identical hash commitments regardless of runtime-specific variations.

Beyond field removal, sanitization ensures consistent representation of equivalent values. BigInt values are converted to strings since JSON does not natively support arbitrary precision integers. Nested objects undergo recursive sanitization, propagating field removal and type normalization throughout complex data structures. Arrays receive element-wise sanitization, maintaining ordering while normalizing individual elements. This thorough normalization ensures that semantically equivalent logs produce bitwise identical serializations.

The serialization process imposes deterministic ordering on object keys despite JavaScript's nondeterministic object property enumeration. The deterministicStringify utility function in src/utils/crypto.js recursively sorts object keys at each nesting level before serialization, producing consistent JSON representations regardless of property insertion order or runtime environment differences. The implementation manually constructs JSON strings by sorting keys, then recursively serializing values with the same deterministic ordering guarantee. Combined with field sanitization and type normalization, this ordering guarantee enables reproducible hashing across different JavaScript engines and execution environments.

The deterministicStringify implementation ensures consistent JSON serialization through recursive key sorting:

```javascript
/**
 * Deterministic JSON serialization
 * Sorts object keys for consistent hashing
 * @param {object} obj - Object to serialize
 * @returns {string} Serialized JSON string
 */
export function deterministicStringify(obj) {
  if (obj === null || obj === undefined) {
    return JSON.stringify(obj);
  }

  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(deterministicStringify).join(',') + ']';
  }

  // Sort keys to ensure consistent ordering
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(key => {
    return JSON.stringify(key) + ':' + deterministicStringify(obj[key]);
  });

  return '{' + pairs.join(',') + '}';
}

/**
 * Create SHA-256 hash and return as hex string
 * @param {string|Buffer|object} data - Data to hash
 * @returns {string} Hex string hash
 */
export function sha256Hex(data) {
  let input = data;

  // Convert objects to deterministic JSON string
  if (typeof data === 'object' && !Buffer.isBuffer(data)) {
    input = deterministicStringify(data);
  }

  return crypto.createHash('sha256').update(input).digest('hex');
}
```

This approach ensures that two executions producing semantically identical logs yield bitwise identical hash commitments, enabling reliable cryptographic binding.

Hash computation applies SHA-256 to the deterministically serialized log representation using the sha256Hex utility function from src/utils/crypto.js. The resulting 256-bit hash serves as a commitment to the execution trace, binding the cryptographic proofs to specific agent behavior patterns. The ExecutionLogger provides both computeLogsHash for global execution trace commitment and computeTestLogsHash for individual test case commitments. Revealing the complete execution logs later enables verification that the committed hash matches, providing auditability without requiring logs to be public by default. This selective disclosure property proves valuable when execution traces contain proprietary information or sensitive intermediate values.

Test-specific log hashing enables fine-grained commitments at the individual test case level. The computeTestLogsHash method extracts logs for a single test, serializes them deterministically, and hashes the result. During proof generation, these per-test hashes may be incorporated into Merkle tree leaves alongside test case data and scores, binding execution traces to specific evaluations. Alternatively, a global hash over all execution logs provides a single commitment covering the complete benchmark evaluation.

The logger provides export capabilities for human inspection and external analysis. The exportJSON method produces formatted JSON containing both raw logs with timestamps and metadata, and a summary object with statistics including tool call counts per test, hash values, and aggregate metrics. This export format supports debugging, performance analysis, and audit procedures while remaining separate from the commitment-destined serializations that undergo cryptographic hashing.

### 5.3 Verification Implementation

The verification implementation provides multiple layers of assurance through cryptographic proof validation, empirical reproduction on public tests, and selective disclosure mechanisms for challenge response. The system is architected to enable efficient public verifiability without requiring trust in the evaluation provider or specialized hardware infrastructure.

### Cryptographic Proof Verification

The core verification mechanism leverages the Groth16 proof system over the BN254 elliptic curve (also known as BN128 in some implementations, referring to its 128-bit security level, though BN254 more accurately describes the 254-bit prime field characteristic). Verification is performed through the snarkjs library, which implements the standard Groth16 verification algorithm based on bilinear pairing operations. The Verifier class provides a clean interface accepting three primary inputs: the proof object containing the π_A, π_B, and π_C curve points that constitute the Groth16 proof, the public inputs specifying claimed values for Merkle root, aggregate score, and test count, and the verification key encoding the circuit-specific parameters generated during the trusted setup ceremony.

The verification process begins by formatting public inputs into the proper signal array that matches the circuit's public input ordering. A critical consideration arises from the fact that Circom circuits operate in the BN254 scalar field with modulus r equal to 21,888,242,871,839,275,222,246,405,745,257,275,088,548,364,400,416,034,343,698,204,186,575,808,495,617. Large values such as SHA-256 hashes from Merkle roots must be reduced modulo r before inclusion in the public signals array to ensure field element validity. The implementation performs this reduction explicitly, converting hexadecimal Merkle root strings to BigInt representations, applying the modular reduction, and formatting the result as a decimal string suitable for snarkjs consumption.

Following signal preparation, the verifier invokes snarkjs.groth16.verify with the verification key, formatted public signals, and proof object. This function evaluates the Groth16 verification equation through pairing checks. Specifically, the verification succeeds if and only if the pairing relationship e(π_A, π_B) equals e(α, β) · e(L, γ) · e(C, δ) holds, where α, β, γ, and δ are curve points from the verification key, and L is computed from the public inputs and verification key's IC array. These pairing operations provide mathematical assurance that the prover possesses a valid witness satisfying all circuit constraints without revealing the witness itself.

The verification implementation handles both production proofs generated from compiled circuits and placeholder proofs used during development when circuits have not been compiled. Placeholder proofs enable end-to-end workflow testing without the computational overhead of proof generation, though they provide no cryptographic security guarantees. The verifier detects placeholder proofs by examining whether the verification key contains the nPublic field indicating a properly configured key, and issues warnings when placeholder verification occurs to prevent accidental deployment of insecure configurations.

### Verification Performance Characteristics

A critical property of the Groth16 proof system is constant-time verification independent of circuit size. Regardless of whether the circuit proves correctness for one hundred tests or one thousand tests, verification requires exactly the same number of pairing operations and completes in under one hundred milliseconds on standard consumer hardware. This constant verification time proves essential for public verifiability, as any stakeholder can verify claims efficiently even when proof generation required substantial computational resources.

The verification key itself is compact, less than ten kilobytes for circuits supporting one thousand tests. Combined with proofs of under one kilobyte each, the complete verification package remains lightweight and easily distributable. Network bandwidth requirements are minimal, enabling verification even in resource-constrained environments or scenarios where many verifiers wish to independently validate the same evaluation results.

### Empirical Validation on Public Tests

Beyond cryptographic proof verification, the system supports empirical validation where verifiers reproduce evaluation on the public test subset. This validation layer provides direct observational evidence that the claimed methodology and scores are accurate, complementing the mathematical assurance from cryptographic proofs. The proof package includes complete content for all public tests, comprising the test identifier, prompt text, ideal output, agent output, and computed score for each test in the transparent subset.

Verifiers perform empirical validation by executing the committed evaluation methodology on public test cases using the published test content. The committed methodology is identified through content-addressable hashing, ensuring that verifiers execute precisely the same scoring logic that the provider used during proof generation. Verifiers can instantiate the evaluation library at the committed version, load the public test cases, execute the agent provider on the test prompts to obtain outputs, and invoke the scorer provider to compute scores on agent outputs compared against ideal outputs.

The validation process produces a set of independently computed scores for the public subset. Verifiers compare these reproduced scores against the scores claimed in the proof package, checking for consistency within expected variance tolerances. For deterministic scoring methods such as exact string matching or algorithmic comparisons, perfect agreement is expected. For AI-based scoring using language models, some variance may occur due to model non-determinism even at temperature zero. Verifiers establish confidence intervals through multiple evaluation runs and verify that claimed scores fall within statistically reasonable bounds.

Empirical validation serves multiple purposes in the verification framework. First, it provides intuitive assurance that the provider's implementation genuinely performs the claimed evaluation, catching implementation errors or methodology divergence that might not be detected by cryptographic proofs alone. Second, it enables verifiers to assess evaluation quality by examining whether scoring judgments on public tests appear reasonable and consistent with stated criteria. Third, it establishes baseline expectations for private test performance, as substantial divergence between public and private accuracy would raise suspicions of test manipulation.

### Selective Disclosure Protocol

The Merkle tree commitment structure enables selective disclosure where providers can reveal individual private tests in response to verification challenges without compromising security for unrevealed tests. When a verifier requests disclosure of a specific test at index i, the provider responds with a disclosure package containing the complete test content including prompt, ideal output, and agent output, the score computed for that test, and the Merkle authentication path from the test's leaf hash to the committed root.

Verification of a selective disclosure proceeds through multiple validation steps. First, the verifier computes the leaf hash for the revealed test by applying the same hash function used during tree construction. The leaf hash is computed as Poseidon(testId, hash(prompt), hash(idealOutput), hash(agentOutput), score), where each content field is hashed separately before inclusion in the leaf hash to prevent second-preimage attacks. The verifier confirms that this computed leaf hash matches the leaf value provided in the disclosure package.

Second, the verifier validates the Merkle authentication path by iteratively hashing the leaf with sibling nodes at each level, following the path indices that indicate whether to hash the current value as the left or right child at each level. Starting from the leaf hash, the verifier computes hash(current, sibling) or hash(sibling, current) depending on the path index bit, obtaining a new current value for the next level. After traversing all levels from leaf to root, the final computed hash should match the committed Merkle root from the main circuit's public inputs.

Third, the verifier confirms that the revealed score matches the claimed score for that test and that the scoring methodology was applied correctly. If the scorer provider is deterministic, the verifier can recompute the score independently and verify exact agreement. For AI-based scoring, the verifier examines whether the score falls within reasonable bounds given the agent output and ideal output content.

The security property of selective disclosure ensures that revealing k tests provides no information about the n minus k unrevealed tests beyond what can be inferred from tree structure and aggregate statistics. The Merkle tree commitment remains binding for unrevealed tests even after partial disclosure because revealing a leaf and its authentication path exposes only that specific path through the tree, not sibling paths leading to other leaves. An adversary cannot determine properties of unrevealed tests or forge authentication paths for tests that were not actually included in the committed tree.

### Complete Verification Workflow

The comprehensive verification workflow integrates all verification mechanisms into a systematic protocol that stakeholders follow to gain confidence in evaluation claims. The protocol begins with acquisition of the proof package, which providers publish as a structured JSON document containing the dual cryptographic proofs (main circuit and subset circuit), public inputs for both circuits, verification keys enabling proof validation, complete content for all public tests, commitments to methodology components including library version and scoring criteria, and metadata describing the evaluation configuration.

Upon acquiring the proof package, verifiers proceed through three verification tiers at increasing levels of scrutiny. The first tier performs basic validation, checking that the proof package structure is well-formed with all required fields present, confirming that claimed test counts and score values fall within valid ranges, and verifying cross-proof consistency of commitments. Specifically, verifiers must confirm that the Poseidon hash of execution logs output by the subset circuit matches the Poseidon hash of execution logs output by the main circuit, ensuring both proofs operated on the same execution trace. Additionally, verifiers must validate that the library version commitment and scoring method commitment output by the main circuit match the corresponding public inputs provided to the subset circuit, guaranteeing that both circuits verified evaluation under identical methodology. These commitment consistency checks ensure that the provider cannot use different execution logs or evaluation methodologies for the public versus private test partitions.

The second tier executes cryptographic proof verification for both circuits. Verifiers load the verification keys and proof objects, format public inputs according to the circuit specification, invoke the Groth16 verifier for both the subset circuit proof and the main circuit proof, and confirm that both verifications succeed. This tier provides mathematical assurance that the proofs are valid and that the claimed aggregate scores are correctly computed from some valid test suite matching the committed Merkle roots.

The third tier performs empirical validation on public tests. Verifiers instantiate the evaluation framework with the committed library version, configure agent and scorer providers matching those used in the original evaluation, execute evaluation on all public tests reproducing the complete workflow, compare independently computed scores against claimed scores with appropriate tolerance for non-deterministic components, and verify that aggregate score for the public subset matches the claimed subset score within confidence intervals.

If verification at any tier fails, verifiers can escalate to selective disclosure challenges. Verifiers request revelation of specific private tests, particularly those that would be informative for detecting potential manipulation such as tests at performance boundaries, a random sample stratified across difficulty levels, or tests where methodology application might be ambiguous. The provider responds with disclosure packages for requested tests, and verifiers validate the authenticity and correctness of each revealed test through Merkle path verification and score recomputation.

### Integration with Publication Standards

The verification implementation is designed to integrate naturally with existing publication and benchmarking infrastructure. Proof packages follow a standardized JSON schema enabling automated processing and verification by third-party tools. The schema includes semantic versioning to support evolution of the proof format while maintaining backward compatibility for verification of historical results. Standard verification tooling can be distributed as standalone executables or web services, allowing stakeholders to verify claims without deep cryptographic expertise or specialized development environments.

For benchmark leaderboards and evaluation repositories, the verification implementation enables automated verification of submitted results before publication. Submission workflows can reject invalid proofs immediately, require both proofs to verify successfully before accepting results, validate that claimed accuracy matches proof public inputs, and maintain an audit trail of verification attempts for transparency. This automation reduces manual verification burden while strengthening the integrity of published benchmark results.

The modular architecture supports extension to emerging verification requirements as AI evaluation practices evolve. Future enhancements might incorporate verifiable timestamp attestations binding evaluation execution to specific time periods, integration with verifiable compute platforms providing hardware-level execution attestation or cross-benchmark verification enabling consistency checks across multiple evaluation results from the same agent.

## 6. Experimental Evaluation

This section presents empirical validation of the cryptographic evaluation framework through comprehensive experiments on the HumanEval code generation benchmark. The experiments demonstrate correctness through temporal consistency analysis across multiple evaluation runs, establish computational feasibility through detailed performance profiling, and validate the dual-proof architecture through successful verification of multiple AI systems spanning different capability tiers and architectural paradigms.

### 6.1 Experimental Setup

The experimental infrastructure consisted of a consumer-grade workstation equipped with an Apple M3 Max processor featuring fourteen cores, thirty-six gigabytes of physical memory, and running macOS on the Darwin kernel version 25.0.0. The Node.js runtime version 24.1.0 provided the execution environment for the evaluation framework. This hardware configuration represents readily available commercial computing resources rather than specialized cryptographic infrastructure, demonstrating accessibility of the approach for practical deployment.

The evaluation benchmark utilized HumanEval, a widely adopted code generation benchmark comprising one hundred sixty-four programming problems designed to assess functional correctness of synthesized code. Each problem specifies a function signature, natural language description of required behavior, and a comprehensive test suite for validation. The benchmark employs deterministic scoring through unit test execution, with Python 3 serving as the execution environment for generated solutions. Test cases are evaluated in isolation with binary pass-fail outcomes, and aggregate accuracy is computed as the percentage of problems where generated code passes all associated tests.

Three AI systems were evaluated representing different capability levels and architectural approaches. Codestral-latest, an open-weights specialized code generation model from Mistral AI, represents purpose-built systems optimized for programming tasks. Claude 4.5 Haiku, a fast and efficient model from Anthropic's Claude 4 family, represents balanced systems designed for rapid inference with strong general capabilities. GPT-5-mini from OpenAI represents the latest generation of proprietary language models with broad task coverage. This selection spans the capability spectrum from specialized open models to frontier proprietary systems, validating framework generalizability across diverse architectures.

The evaluation configuration employed a public subset ratio of 5.49 percent, corresponding to nine tests from the complete benchmark suite selected deterministically through cryptographic hashing of test identifiers. This partition provides empirical validation coverage while protecting the majority of test content.

### 6.2 Correctness Validation

Correctness validation proceeds through temporal consistency analysis where the same model evaluated on identical test suites across multiple independent runs should produce statistically consistent results within bounds established by model non-determinism. Table 1 presents accuracy measurements across three evaluation runs for each model, demonstrating result stability and framework correctness.

### Table 1: Model Accuracy Across Multiple Evaluation Runs

| Model | Run 1 Pass Rate (%) | Run 2 Pass Rate (%) | Run 3 Pass Rate (%) | Mean (%) | Std Dev (%) | Coefficient of Variation (%) |
|-------|---------------------|---------------------|---------------------|----------|-------------|------------------------------|
| Codestral-latest | 59.15 | 57.32 | 57.32 | 57.93 | 1.06 | 1.83 |
| Claude 4.5 Haiku | 81.10 | 81.10 | 81.10 | 81.10 | 0.00 | 0.00 |
| GPT-5-mini | 83.54 | 85.37 | 82.32 | 83.74 | 1.53 | 1.83 |

The temporal consistency analysis reveals that accuracy variance across runs remains within narrow bounds. Codestral-latest exhibited standard deviation of 1.06 percentage points across three runs with mean accuracy of 57.93 percent. Claude 4.5 Haiku demonstrated perfect consistency with identical 81.10 percent accuracy across all runs, reflecting the deterministic behavior of the model and scoring methodology on this benchmark. GPT-5-mini showed standard deviation of 1.53 percentage points with mean accuracy of 83.74 percent. These variance levels fall well within expected bounds for evaluation frameworks operating on language models with inherent sampling stochasticity, even when temperature parameters are minimized.

The coefficient of variation, computed as the ratio of standard deviation to mean expressed as percentage, provides a normalized measure of relative variability independent of absolute accuracy magnitudes. Both Codestral-latest and GPT-5-mini exhibited coefficients of 1.83 percent, indicating that variance represents less than two percent of measured accuracy. This low relative variance demonstrates that the evaluation framework produces stable, reproducible results suitable for reliable performance assessment and cross-model comparison.

The relationship between full dataset and public subset accuracy provides additional correctness validation. Table 2 presents this comparison, revealing that public subset performance generally tracks full dataset trends while exhibiting expected variance from smaller sample sizes.

### Table 2: Full Dataset versus Public Subset Accuracy

| Model | Run | Full Dataset (%) | Public Subset (%) | Delta (pp) |
|-------|-----|------------------|-------------------|------------|
| Codestral-latest | 1 | 59.15 | 66.67 | +7.52 |
| Codestral-latest | 2 | 57.32 | 66.67 | +9.35 |
| Codestral-latest | 3 | 57.32 | 66.67 | +9.35 |
| Claude 4.5 Haiku | 1 | 81.10 | 77.78 | -3.32 |
| Claude 4.5 Haiku | 2 | 81.10 | 77.78 | -3.32 |
| Claude 4.5 Haiku | 3 | 81.10 | 77.78 | -3.32 |
| GPT-5-mini | 1 | 83.54 | 88.89 | +5.35 |
| GPT-5-mini | 2 | 85.37 | 77.78 | -7.59 |
| GPT-5-mini | 3 | 82.32 | 77.78 | -4.54 |

The delta between full dataset and public subset accuracy varies both in magnitude and direction across models and runs. For Codestral-latest, the public subset consistently outperformed the full dataset by approximately nine percentage points, suggesting that the randomly selected public tests were somewhat easier than the benchmark average. Claude 4.5 Haiku exhibited the opposite pattern with public subset accuracy trailing full dataset by 3.32 percentage points consistently across runs, indicating the public subset contained slightly more challenging problems for this model. GPT-5-mini showed mixed directionality with public subset accuracy ranging from 7.59 percentage points below to 5.35 percentage points above full dataset performance.

These variations are statistically expected given the small public subset size of nine tests. With such limited samples, individual test difficulty can significantly impact subset aggregate metrics. The critical observation for correctness validation is that the main circuit proof successfully verifies even when public and private partition accuracies diverge, demonstrating that the cryptographic binding mechanism functions correctly regardless of performance distribution across partitions. This validates the core security property that providers cannot manipulate test selection to artificially inflate scores.

### 6.3 Computational Performance Analysis

The computational feasibility of cryptographic evaluation depends critically on proof generation time, memory requirements, and verification latency. Table 3 presents detailed performance metrics across all evaluation runs, establishing empirical bounds for practical deployment.

### Table 3: Computational Performance Metrics

| Model | Run | Total Time (s) | Agent Exec (s) | ZK Proof Gen (s) | Proof % of Total | Peak RSS (GB) | RSS Delta (GB) |
|-------|-----|----------------|----------------|------------------|------------------|---------------|----------------|
| Codestral-latest | 1 | 165.2 | 50.7 | 114.5 | 69.3% | 13.6 | 13.3 |
| Codestral-latest | 2 | 152.1 | 41.8 | 110.3 | 72.5% | 14.3 | 14.2 |
| Codestral-latest | 3 | 158.9 | 45.4 | 113.5 | 71.4% | 14.7 | 12.9 |
| Claude 4.5 Haiku | 1 | 290.3 | 175.7 | 114.6 | 39.5% | 14.3 | 10.3 |
| Claude 4.5 Haiku | 2 | 294.3 | 180.3 | 114.0 | 38.7% | 14.0 | 11.5 |
| Claude 4.5 Haiku | 3 | 260.9 | 146.9 | 114.0 | 43.7% | 13.1 | 10.1 |
| GPT-5-mini | 1 | 474.0 | 362.3 | 111.7 | 23.6% | 12.4 | 10.7 |
| GPT-5-mini | 2 | 485.7 | 369.3 | 116.4 | 24.0% | 10.8 | 9.96 |
| GPT-5-mini | 3 | 547.9 | 429.2 | 118.7 | 21.7% | 12.3 | 12.1 |

Proof generation time demonstrated remarkable consistency across all models and runs, ranging from 110.3 to 118.7 seconds with mean duration of 113.9 seconds and standard deviation of 2.4 seconds. This consistency reflects the fact that proof generation time depends primarily on circuit size and test count rather than model characteristics or evaluation outcomes. The fixed circuit architecture supporting up to one thousand tests with depth ten Merkle trees exhibits predictable computational complexity regardless of which specific AI system is being evaluated. This property enables accurate cost estimation for deployment planning, as proof generation overhead scales with benchmark size rather than with model-specific factors.

The relationship between proof generation time and total evaluation time varies substantially across models due to differences in agent execution latency. For Codestral-latest, proof generation consumed approximately 70 percent of total evaluation time, with agent execution completing rapidly due to the model's specialized optimization for code generation tasks. Claude 4.5 Haiku exhibited roughly 40 percent proof overhead as longer agent execution times for reasoning and code synthesis reduced the relative proportion of cryptographic operations. GPT-5-mini showed the lowest relative proof overhead at approximately 23 percent, reflecting substantial agent execution time that dominated the end-to-end pipeline. These proportions demonstrate that for fast inference systems, proof generation represents the dominant computational cost, while for slower or more deliberative models, agent execution remains the primary bottleneck.

Memory requirements proved manageable on consumer hardware across all configurations. Peak resident set size ranged from 10.8 to 14.7 gigabytes, comfortably within the thirty-six gigabyte physical memory capacity of the test system. The memory delta between baseline and peak measurements indicates actual allocation for proof generation infrastructure, with values ranging from 9.96 to 14.2 gigabytes. The variation in memory consumption across runs likely reflects differences in garbage collection timing and Node.js heap management rather than fundamental algorithmic factors. The consistent memory footprint below sixteen gigabytes establishes that cryptographic evaluation remains accessible on mid-range workstations without requiring server-class infrastructure.

The external and array buffer memory allocation, consistently measured at approximately 8.1 gigabytes across all runs, represents the witness data structures and circuit constraints maintained during proof generation. This allocation remains constant regardless of model or evaluation outcomes because it derives from the fixed circuit architecture. The ability to generate proofs for one hundred sixty-four tests with peak memory under fifteen gigabytes suggests that scaling to larger benchmarks approaching the one thousand test circuit capacity would remain feasible within common sixty-four gigabyte workstation configurations.

### 6.4 Proof System Validation

The dual-proof architecture requires successful generation and verification of both subset and main circuit proofs with appropriate cryptographic binding between them. Table 4 summarizes proof system metrics demonstrating successful operation across all evaluation runs.

### Table 4: Proof System Summary Statistics

| Model | Runs | Total Proofs | Proof Failures | Placeholder Proofs | Mean Proof Time (s) | Public Tests | Public % |
|-------|------|--------------|----------------|--------------------|--------------------|--------------|----------|
| Codestral-latest | 3 | 3 | 0 | 0 | 112.8 | 9 | 5.49% |
| Claude 4.5 Haiku | 3 | 3 | 0 | 0 | 114.2 | 9 | 5.49% |
| GPT-5-mini | 3 | 3 | 0 | 0 | 115.6 | 9 | 5.49% |

All nine evaluation runs across three models successfully generated valid cryptographic proofs with zero failures. This perfect success rate validates the robustness of the circuit implementations and proof generation pipeline under varying test conditions and model behaviors. The absence of placeholder proofs confirms that all experiments utilized the production Groth16 proving system with full cryptographic security guarantees rather than development testing modes that bypass proof generation for rapid iteration.

The consistent public subset size of nine tests representing 5.49 percent of the benchmark remained identical across all runs due to deterministic test selection based on cryptographic hashing. This consistency enables fair comparison of proof generation performance across models, as all evaluations processed identical circuit input sizes. The partition ratio strikes a balance between providing sufficient empirical validation through public tests while protecting the majority of benchmark content from exposure that could facilitate overfitting or gaming.

The proof protocol identifier of groth16-dual appeared uniformly across all experiments, confirming that the dual-circuit architecture with cryptographic binding between subset and main proofs operated correctly in all cases. The verification keys generated during the trusted setup ceremony successfully validated all proofs, establishing that the pairing-based verification algorithm correctly confirmed computational integrity for both circuits across diverse evaluation scenarios.

### 6.5 System Requirements Analysis

Practical deployment of cryptographic evaluation frameworks requires understanding minimum hardware specifications and operational dependencies. Table 5 synthesizes resource requirements based on observed maximum demands across all evaluation runs.

### Table 5: Observed System Requirements

| Resource Category | Specification | Rationale |
|-------------------|---------------|-----------|
| Minimum RAM | 18 GB available | Maximum observed RSS delta of 14.2 GB plus 25% safety margin for operating system and concurrent processes |
| Recommended RAM | 32 GB total | Supports proof generation with comfortable headroom for system operations and multiple concurrent tasks |
| CPU Architecture | 64-bit ARM or x86-64 | Required for Node.js runtime and cryptographic libraries with elliptic curve operations |
| Storage | 30 GB available | Compiled circuit files, Powers of Tau ceremony parameters, verification keys, and proof packages consume approximately 28 GB, with additional space for evaluation outputs |
| Network Access | Required for API-based models | Agent execution requires connectivity to model providers (Anthropic, OpenAI, Mistral) |
| Software Dependencies | Python 3 interpreter | HumanEval benchmark requires Python for test execution and code validation |
| Operating System | Linux, macOS, or Windows | Framework supports all major platforms with Node.js compatibility |

The minimum RAM specification of eighteen gigabytes derives from the maximum observed memory delta of 14.2 gigabytes during proof generation, augmented by a twenty-five percent safety margin to accommodate operating system overhead, concurrent background processes, and potential variance in memory allocation patterns. This requirement positions cryptographic evaluation as accessible on mid-range workstations and high-end laptops rather than requiring server-class hardware. Organizations with existing computational infrastructure for AI development likely already possess suitable hardware for deploying this framework.

The recommended thirty-two gigabyte total memory configuration provides comfortable headroom for proof generation while supporting concurrent development activities, multiple browser tabs, integrated development environments, and other typical software engineering tools. This specification aligns with common developer workstation configurations, minimizing incremental hardware investment required for adoption. Systems with sixty-four gigabytes would support larger benchmarks approaching the one thousand test circuit capacity with similar operational margins.

Network access requirements vary by deployment scenario. Evaluations using API-based models necessarily require connectivity to provider endpoints for agent execution, with latency and bandwidth depending on model complexity and API response times. Evaluations using locally-deployed open-weight models eliminate network dependencies for agent execution, though proof generation and verification remain purely local operations. Organizations with strict network isolation requirements can achieve fully offline evaluation by deploying open models locally and performing all cryptographic operations without external connectivity.

The software dependency on Python 3 reflects the HumanEval benchmark's implementation rather than framework requirements. Alternative benchmarks with different execution environments would impose corresponding dependencies. The framework itself operates within the Node.js runtime without requiring specialized cryptographic software beyond the snarkjs library and its dependencies. This minimal software stack simplifies deployment and reduces potential incompatibilities or version conflicts.

Storage requirements merit particular attention as the compiled circuit files and cryptographic parameters consume substantial disk space. The circuit compilation artifacts including the WebAssembly modules, R1CS constraint systems, and proving keys total approximately twelve gigabytes for both the main and subset circuits. The Powers of Tau ceremony parameters, which provide the cryptographic foundation for the trusted setup, add approximately sixteen gigabytes. Together with verification keys and evaluation outputs, a complete deployment requires approximately thirty gigabytes of available storage. This requirement exceeds typical expectations for evaluation frameworks but remains modest compared to storage demands for large language model weights or extensive training datasets. The one-time nature of circuit compilation means that storage costs are fixed rather than growing with evaluation volume.

### 6.6 Proof Package Availability and Reproducibility

To facilitate independent verification and enable reproducibility of the experimental results, all proof packages generated during the evaluation experiments have been made publicly available in the project repository. The complete proof packages for all nine evaluation runs across three models are archived at `examples/humaneval/output` in the GitHub repository. Each proof package contains the dual cryptographic proofs (subset circuit and main circuit), verification keys enabling independent proof validation, public inputs including Merkle roots and aggregate scores, complete test content for the public subset enabling empirical validation, and metadata documenting evaluation configuration and system characteristics.

The availability of these proof packages enables several forms of independent validation. First, any researcher can verify the cryptographic proofs using standard Groth16 verifiers and the included verification keys, confirming mathematical soundness without requiring trust in the evaluation provider. Second, researchers can reproduce evaluation on the public test subset by executing the same models on the revealed test cases, validating empirical accuracy through direct observation. Third, researchers can examine the proof structure and public inputs to understand how the dual-circuit architecture binds subset and main proofs through shared commitments. Fourth, researchers can use these proof packages as templates for conducting their own cryptographic evaluations on different models or benchmarks.

The proof packages serve as concrete artifacts demonstrating practical viability of the cryptographic evaluation framework. The packages remain compact with total size under one hundred kilobytes per evaluation run despite encoding complete cryptographic proofs and verification keys. This lightweight footprint enables efficient distribution through version control systems and long-term archival in research repositories. The standardized JSON format ensures interoperability with verification tools and facilitates automated processing by benchmark leaderboards or evaluation platforms.

The public availability of proof packages exemplifies the transparency properties enabled by the cryptographic approach. Unlike traditional private benchmark evaluation where verification requires trusting institutional evaluators, cryptographic proofs provide mathematical artifacts that anyone can verify independently. This shift from institutional trust to cryptographic verifiability represents a fundamental advancement in AI evaluation methodology, enabling decentralized verification while maintaining benchmark integrity through selective disclosure rather than complete opacity.


## References

[1] https://arxiv.org/abs/2405.00332

[2] https://arxiv.org/pdf/1905.00537

[3] https://www.semanticscholar.org/paper/Beyond-the-Imitation-Game%3A-Quantifying-and-the-of-Srivastava-Rastogi/bd1331b233e84bab7eba503abc60b31ac08e7881

[4] https://arxiv.org/abs/2407.06291

[5] https://arxiv.org/abs/2509.15045

[6] https://arxiv.org/pdf/2410.07095

[7] https://onlinelibrary.wiley.com/doi/epdf/10.1002/j.2371-9621.2021.tb00012.x

[8] https://www.semanticscholar.org/paper/Beyond-the-Imitation-Game%3A-Quantifying-and-the-of-Srivastava-Rastogi/bd1331b233e84bab7eba503abc60b31ac08e7881

[9] https://ieeexplore.ieee.org/document/9519424

[10] https://arxiv.org/html/2411.04710

[11] https://dl.acm.org/doi/pdf/10.1145/3658644.3670316

[12] https://arxiv.org/pdf/2402.02675

[13] https://ieeexplore.ieee.org/document/10381877

[14] https://arxiv.org/abs/2212.05428

[15] https://dl.acm.org/doi/10.1145/2856449

[16] https://arxiv.org/abs/2509.10819

[17] https://arxiv.org/pdf/2401.02935.pdf

[18] https://ieeexplore.ieee.org/document/9131703/

[19] https://ieeexplore.ieee.org/document/8680982/

[20] https://dl.acm.org/doi/10.1145/3735556

[21] https://link.springer.com/10.1007/978-3-031-16092-9_7

[22] https://arxiv.org/pdf/2206.03780.pdf

[23] https://arxiv.org/pdf/2204.06790.pdf

[24] https://arxiv.org/pdf/1704.05600.pdf

[25] https://arxiv.org/pdf/2402.02675.pdf

[26] https://arxiv.org/pdf/2202.06877.pdf