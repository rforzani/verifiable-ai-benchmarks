import 'dotenv/config';
import { AgentVerifier } from '../src/index.js';

/**
 * ELITE MATHEMATICAL REASONING BENCHMARK
 *
 * This benchmark tests advanced mathematical reasoning across multiple domains:
 * - Number Theory
 * - Real & Complex Analysis
 * - Abstract Algebra
 * - Topology
 * - Combinatorics
 * - Differential Equations
 * - Probability Theory
 * - Mathematical Logic
 *
 * Scoring: 0-100 based on correctness and reasoning quality
 * - 100: Perfect answer with rigorous proof
 * - 80-99: Correct answer with minor gaps in reasoning
 * - 60-79: Correct approach but computational errors
 * - 40-59: Partial understanding, significant errors
 * - 20-39: Wrong approach but some relevant concepts
 * - 0-19: Completely incorrect or irrelevant
 */

const MATHEMATICAL_BENCHMARK = [
  // ==================== NUMBER THEORY (10 problems) ====================
  {
    id: 'NT-001',
    domain: 'Number Theory',
    difficulty: 'Expert',
    prompt: `Prove or disprove: For all primes p > 3, p² - 1 is divisible by 24.

Provide a rigorous mathematical proof.`,
    idealOutput: `Proof: Let p be a prime with p > 3. Then p is odd and not divisible by 3.

Since p is odd, we can write p = 2k + 1 for some integer k.
Then p² - 1 = (2k + 1)² - 1 = 4k² + 4k = 4k(k + 1).

Since k and k+1 are consecutive integers, one is even, so k(k+1) is divisible by 2.
Therefore 4k(k+1) is divisible by 8.

For divisibility by 3: Since p is prime > 3, p ≢ 0 (mod 3).
So p ≡ 1 (mod 3) or p ≡ 2 (mod 3).
- If p ≡ 1 (mod 3), then p² ≡ 1 (mod 3), so p² - 1 ≡ 0 (mod 3).
- If p ≡ 2 (mod 3), then p² ≡ 4 ≡ 1 (mod 3), so p² - 1 ≡ 0 (mod 3).

Therefore p² - 1 is divisible by both 8 and 3, and gcd(8,3) = 1.
Thus p² - 1 is divisible by 24. QED`,
    scoringCriteria: {
      correctness: 40, // Correct conclusion
      rigor: 30, // Complete proof with all steps
      clarity: 20, // Clear logical flow
      generality: 10 // Handles all cases
    }
  },
  {
    id: 'NT-002',
    domain: 'Number Theory',
    difficulty: 'Expert',
    prompt: `Find all integer solutions to the Diophantine equation: x³ + y³ + z³ = 42.

Explain your method and provide at least one solution if it exists.`,
    idealOutput: `After extensive computational search, one known solution is:
x = -80538738812075974, y = 80435758145817515, z = 12602123297335631

This was found in 2019 using massive computational resources. The problem is extremely difficult because:
1. There's no general method for solving cubic Diophantine equations
2. Solutions can have very large coefficients
3. The search space grows cubically

Method: Systematic search over bounded regions, using modular arithmetic constraints to prune impossible cases, and checking x³ + y³ + z³ (mod n) for small primes n to eliminate candidates.`,
    scoringCriteria: {
      correctness: 50, // Correct solution or acknowledgment of difficulty
      methodology: 30, // Understanding of approach
      insight: 20 // Recognition of computational complexity
    }
  },

  {
    id: 'NT-003',
    domain: 'Number Theory',
    difficulty: 'Expert',
    prompt: `Prove that there are infinitely many primes of the form 4k + 3.`,
    idealOutput: `Proof by contradiction:

Assume there are finitely many primes of the form 4k + 3: p₁, p₂, ..., pₙ.

Consider N = 4(p₁p₂...pₙ) - 1 = 4(p₁p₂...pₙ - 1) + 3.

N is of the form 4k + 3 and N > pₙ.

Key observation: N is odd, so all its prime factors are odd.
Any odd prime is either ≡ 1 (mod 4) or ≡ 3 (mod 4).

Lemma: If a ≡ 1 (mod 4) and b ≡ 1 (mod 4), then ab ≡ 1 (mod 4).
Therefore, a product of primes all ≡ 1 (mod 4) is ≡ 1 (mod 4).

Since N ≡ 3 (mod 4), N must have at least one prime factor ≡ 3 (mod 4).

But none of p₁, p₂, ..., pₙ divide N (since N ≡ -1 mod each pᵢ).

This contradicts our assumption that p₁, p₂, ..., pₙ are all primes ≡ 3 (mod 4).

Therefore, there are infinitely many primes of the form 4k + 3. QED`,
    scoringCriteria: {
      correctness: 35,
      construction: 30, // Proper construction of N
      lemma: 20, // Use of key lemma about products
      rigor: 15
    }
  },

  {
    id: 'NT-004',
    domain: 'Number Theory',
    difficulty: 'Expert',
    prompt: `Compute φ(φ(10^12)), where φ is Euler's totient function.`,
    idealOutput: `Step 1: Compute φ(10^12)
10^12 = 2^12 × 5^12
φ(10^12) = φ(2^12) × φ(5^12) = 2^11(2-1) × 5^11(5-1) = 2^11 × 5^11 × 4 = 2^13 × 5^11

Step 2: Compute φ(2^13 × 5^11)
φ(2^13 × 5^11) = φ(2^13) × φ(5^11) = 2^12(2-1) × 5^10(5-1) = 2^12 × 5^10 × 4 = 2^14 × 5^10

Therefore: φ(φ(10^12)) = 2^14 × 5^10 = 16384 × 9765625 = 160,000,000,000

Answer: 160,000,000,000`,
    scoringCriteria: {
      factorization: 25,
      totient_formula: 35,
      computation: 30,
      final_answer: 10
    }
  },

  {
    id: 'NT-005',
    domain: 'Number Theory',
    difficulty: 'Expert',
    prompt: `Determine whether 2^82589933 - 1 is prime. Explain the method used to verify such large numbers.`,
    idealOutput: `2^82589933 - 1 is indeed prime. This is a Mersenne prime (M₅₁), discovered in December 2018.

Verification Method (Lucas-Lehmer Test for Mersenne Numbers):

For p prime, to test if Mₚ = 2^p - 1 is prime:
1. Set s₀ = 4
2. For i = 1 to p - 2: sᵢ = (sᵢ₋₁² - 2) mod Mₚ
3. Mₚ is prime if and only if sₚ₋₂ ≡ 0 (mod Mₚ)

Why this works:
- Based on properties of Lucas sequences
- Much faster than trial division (O(p²) vs exponential)
- Requires only p-2 modular squarings
- Specialized for Mersenne numbers

This specific prime has 24,862,048 decimal digits and was found by GIMPS (Great Internet Mersenne Prime Search) using distributed computing.`,
    scoringCriteria: {
      answer: 20,
      lucas_lehmer: 40, // Understanding of the test
      efficiency: 20, // Why it's feasible for large numbers
      context: 20 // Historical/practical context
    }
  },

  {
    id: 'NT-006',
    domain: 'Number Theory',
    difficulty: 'Expert',
    prompt: `Prove the Chinese Remainder Theorem and use it to solve:
x ≡ 2 (mod 5)
x ≡ 3 (mod 7)
x ≡ 4 (mod 11)`,
    idealOutput: `Chinese Remainder Theorem Proof:
Let m₁, m₂, ..., mₖ be pairwise coprime. For any a₁, ..., aₖ, there exists unique x (mod M) where M = ∏mᵢ such that x ≡ aᵢ (mod mᵢ) for all i.

Construction: Let Mᵢ = M/mᵢ. Since gcd(Mᵢ, mᵢ) = 1, there exists yᵢ with Mᵢyᵢ ≡ 1 (mod mᵢ).
Then x = ∑(aᵢMᵢyᵢ) satisfies all congruences.

Application to problem:
M = 5 × 7 × 11 = 385
M₁ = 385/5 = 77, M₂ = 385/7 = 55, M₃ = 385/11 = 35

Find inverse:
77y₁ ≡ 1 (mod 5) → 2y₁ ≡ 1 (mod 5) → y₁ = 3
55y₂ ≡ 1 (mod 7) → 6y₂ ≡ 1 (mod 7) → y₂ = 6
35y₃ ≡ 1 (mod 11) → 2y₃ ≡ 1 (mod 11) → y₃ = 6

x = 2(77)(3) + 3(55)(6) + 4(35)(6) = 462 + 990 + 840 = 2292
x ≡ 2292 ≡ 367 (mod 385)

Verification: 367 = 73×5 + 2 ✓, 367 = 52×7 + 3 ✓, 367 = 33×11 + 4 ✓

Answer: x = 367 (mod 385)`,
    scoringCriteria: {
      theorem_proof: 30,
      construction: 25,
      computation: 30,
      verification: 15
    }
  },

  {
    id: 'NT-007',
    domain: 'Number Theory',
    difficulty: 'Expert',
    prompt: `Prove that π(x), the prime counting function, satisfies π(x) > x/(2ln(x)) for sufficiently large x.`,
    idealOutput: `This requires establishing a lower bound for the prime counting function.

Key insight: Use Chebyshev's method via the function θ(x) = ∑_{p≤x} ln(p).

Step 1: Show θ(x) < 2x ln(2) for all x.
Consider (2n choose n) = (2n)!/(n!)²
This is divisible by all primes p with n < p ≤ 2n.
Therefore ∏_{n<p≤2n} p ≤ (2n choose n) < 4^n
Taking logarithms: ∑_{n<p≤2n} ln(p) < n ln(4)

Step 2: Telescoping sum argument gives θ(x) < 2x ln(2).

Step 3: Relate θ(x) to π(x):
θ(x) = ∑_{p≤x} ln(p) ≥ ∑_{√x<p≤x} ln(p) ≥ π(x)ln(√x) - π(√x)ln(√x)
     ≥ (π(x) - √x) × (ln(x)/2)

Step 4: From θ(x) < 2x ln(2) and the above:
(π(x) - √x) × (ln(x)/2) < 2x ln(2)
π(x) < 4x ln(2)/ln(x) + √x

For large x, the √x term is negligible, giving the desired lower bound.

A more refined analysis shows π(x) ~ x/ln(x) (Prime Number Theorem).`,
    scoringCriteria: {
      approach: 30, // Correct method selection
      theta_function: 25, // Use of auxiliary function
      bounds: 30, // Derivation of bounds
      asymptotics: 15 // Understanding of growth rate
    }
  },

  {
    id: 'NT-008',
    domain: 'Number Theory',
    difficulty: 'Expert',
    prompt: `Show that the equation x² + y² = 3z² has no non-trivial integer solutions.`,
    idealOutput: `Proof by infinite descent:

Assume (x, y, z) is a non-trivial solution with z minimal among all solutions.

Step 1: Working modulo 3:
Squares modulo 3 are 0 or 1.
If x² + y² = 3z² (mod 3), then x² + y² ≡ 0 (mod 3).
This requires x² ≡ y² ≡ 0 (mod 3), thus x ≡ y ≡ 0 (mod 3).

Step 2: Write x = 3x₁, y = 3y₁.
Then 9x₁² + 9y₁² = 3z², so 3x₁² + 3y₁² = z².

Step 3: Working modulo 3 again on 3x₁² + 3y₁² = z²:
z² ≡ 0 (mod 3), so z ≡ 0 (mod 3).

Step 4: Write z = 3z₁.
Then 3x₁² + 3y₁² = 9z₁², so x₁² + y₁² = 3z₁².

But now (x₁, y₁, z₁) is a solution with z₁ = z/3 < z, contradicting minimality of z.

By infinite descent, no non-trivial solution exists. QED`,
    scoringCriteria: {
      method: 25, // Recognition of infinite descent
      modular_arithmetic: 30, // Correct use of mod 3
      descent_step: 35, // Construction of smaller solution
      conclusion: 10
    }
  },

  {
    id: 'NT-009',
    domain: 'Number Theory',
    difficulty: 'Expert',
    prompt: `Compute the order of 2 in the multiplicative group (Z/pZ)* for p = 2^521 - 1 (Mersenne prime M₁₃). Explain the significance.`,
    idealOutput: `For Mersenne prime p = 2^521 - 1:

The order of 2 in (Z/pZ)* divides φ(p) = p - 1 = 2^521 - 2.

Since 2^p ≡ 1 (mod p) by Fermat's Little Theorem, and p = 2^521 - 1:
2^(2^521 - 1) ≡ 1 (mod p)

But we can show the order is exactly p - 1:

Observe: 2^521 ≡ 1 (mod p) by definition of p.
The order must divide 521, but 521 is prime.
If order = 521, then 2^521 ≡ 1 (mod p), but 2^521 = p + 1 ≡ 1 (mod p) ✓

However, we need to check if order < p-1 is possible.
Since p is prime, the multiplicative group is cyclic of order p-1.
2 generates a subgroup, and its order divides p-1 = 2^521 - 2.

For Mersenne primes, 2 is a primitive root (generator) when p ≡ 3 (mod 4).
521 is odd, so 2^521 - 1 ≡ 3 (mod 4).

Therefore, order of 2 = p - 1 = 2^521 - 2.

Significance: 2 is a primitive root mod this Mersenne prime, meaning it generates the entire multiplicative group.`,
    scoringCriteria: {
      computation: 25,
      fermat: 20,
      primitive_root: 35, // Understanding of primitive roots
      significance: 20
    }
  },

  {
    id: 'NT-010',
    domain: 'Number Theory',
    difficulty: 'Expert',
    prompt: `Prove or disprove: If 2^n - 1 is prime, then n must be prime.`,
    idealOutput: `Proof: We prove the contrapositive: If n is composite, then 2^n - 1 is composite.

Assume n is composite, so n = ab where 1 < a, b < n.

We use the factorization: x^n - 1 = (x^a - 1)(x^a(b-1) + x^a(b-2) + ... + x^a + 1)

Setting x = 2:
2^n - 1 = 2^(ab) - 1 = (2^a - 1)(2^a(b-1) + 2^a(b-2) + ... + 2^a + 1)

Since 1 < a < n:
- 2^a - 1 > 1
- The second factor = (2^ab - 1)/(2^a - 1) > 1

Both factors are integers greater than 1, so 2^n - 1 is composite.

By contrapositive, if 2^n - 1 is prime, then n is prime.

Note: The converse is false (n prime doesn't guarantee 2^n - 1 prime).
Example: 2^11 - 1 = 2047 = 23 × 89.

Primes of form 2^p - 1 are called Mersenne primes.`,
    scoringCriteria: {
      logic: 25, // Contrapositive approach
      factorization: 35, // Correct use of algebraic identity
      both_factors: 20, // Showing both factors > 1
      counterexample: 20 // Converse is false
    }
  },

  // ==================== REAL & COMPLEX ANALYSIS (10 problems) ====================

  {
    id: 'RA-001',
    domain: 'Real Analysis',
    difficulty: 'Expert',
    prompt: `Prove that the series ∑(n=1 to ∞) sin(n)/n² converges. Determine if it converges absolutely.`,
    idealOutput: `Proof of convergence:

Method: Dirichlet's Test
We need:
1. ∑sin(n) has bounded partial sums
2. 1/n² is monotone decreasing to 0

For (1): Using complex exponentials,
∑_{k=1}^n sin(k) = Im(∑_{k=1}^n e^(ik)) = Im((e^i(1-e^(in)))/(1-e^i))

This is bounded by 2/|1-e^i| for all n.

For (2): Clearly 1/n² → 0 monotonically.

By Dirichlet's Test, ∑sin(n)/n² converges.

Absolute convergence:
Consider ∑|sin(n)|/n².
We have |sin(n)| varies, but for many n, |sin(n)| is bounded away from 0.

Using Weyl's equidistribution theorem, {n mod 2π} is equidistributed.
This means ∑|sin(n)|/n² behaves like ∑c/n² for some c > 0.

Since ∑1/n² converges (p-series with p=2), ∑|sin(n)|/n² converges.

Therefore, the series converges absolutely.

Answer: Converges absolutely.`,
    scoringCriteria: {
      dirichlet_test: 35,
      bounded_sums: 25,
      absolute_convergence: 30,
      rigor: 10
    }
  },

  {
    id: 'RA-002',
    domain: 'Real Analysis',
    difficulty: 'Expert',
    prompt: `Let f: [0,1] → ℝ be continuous with f(0) = f(1). Prove that there exists c ∈ [0, 1/2] such that f(c) = f(c + 1/2).`,
    idealOutput: `Proof:

Define g(x) = f(x + 1/2) - f(x) for x ∈ [0, 1/2].

We need to show g(c) = 0 for some c ∈ [0, 1/2].

Evaluate at endpoints:
g(0) = f(1/2) - f(0)
g(1/2) = f(1) - f(1/2) = f(0) - f(1/2)  [using f(0) = f(1)]

Notice: g(0) + g(1/2) = [f(1/2) - f(0)] + [f(0) - f(1/2)] = 0

Case 1: If g(0) = 0, we're done with c = 0.
Case 2: If g(1/2) = 0, we're done with c = 1/2.
Case 3: If neither is zero, then g(0) and g(1/2) have opposite signs (since their sum is 0).

By the Intermediate Value Theorem (g is continuous as f is continuous),
there exists c ∈ (0, 1/2) with g(c) = 0.

Therefore f(c) = f(c + 1/2). QED

This generalizes: for any rational p/q, there exists c with f(c) = f(c + p/q).`,
    scoringCriteria: {
      auxiliary_function: 30,
      endpoint_analysis: 25,
      ivt_application: 35,
      generalization: 10
    }
  },

  {
    id: 'RA-003',
    domain: 'Complex Analysis',
    difficulty: 'Expert',
    prompt: `Evaluate ∫₀^∞ (sin(x)/x) dx using contour integration.`,
    idealOutput: `Proof using residue theorem:

Consider f(z) = e^(iz)/z and integrate over a contour consisting of:
- Real axis from -R to -ε
- Small semicircle of radius ε around origin (upper half)
- Real axis from ε to R
- Large semicircle of radius R (upper half)

Step 1: f(z) is holomorphic in the region (no poles inside), so ∫_C f(z)dz = 0.

Step 2: As R → ∞, integral over large semicircle → 0 (Jordan's lemma).

Step 3: As ε → 0, parametrize small semicircle: z = εe^(iθ), θ ∈ [0,π]
∫_small = ∫₀^π (e^(iεe^(iθ)))/(εe^(iθ)) × iεe^(iθ) dθ = i∫₀^π e^(iεe^(iθ)) dθ → iπ

Step 4: Real axis contribution:
lim[∫₋ᵣ^(-ε) + ∫_ε^R] e^(ix)/x dx = 2i ∫₀^∞ sin(x)/x dx

Step 5: Combining:
0 = 2i ∫₀^∞ sin(x)/x dx + iπ

Therefore: ∫₀^∞ sin(x)/x dx = π/2

Answer: π/2`,
    scoringCriteria: {
      contour_choice: 30,
      jordans_lemma: 25,
      residue_calculation: 30,
      final_answer: 15
    }
  },

  {
    id: 'RA-004',
    domain: 'Real Analysis',
    difficulty: 'Expert',
    prompt: `Prove that if f: ℝ → ℝ is continuous and ∫₋∞^∞ f²(x)dx < ∞, then lim_{x→±∞} f(x) = 0.`,
    idealOutput: `Proof by contradiction:

Assume lim_{x→∞} f(x) ≠ 0 (the case for -∞ is similar).

Then there exists ε > 0 and sequence xₙ → ∞ with |f(xₙ)| ≥ ε.

By continuity, for each n, there exists δₙ > 0 such that:
|f(x)| ≥ ε/2 for all x ∈ [xₙ - δₙ, xₙ + δₙ]

We can choose δₙ and xₙ such that the intervals [xₙ - δₙ, xₙ + δₙ] are disjoint
and δₙ ≥ δ > 0 for some fixed δ (by continuity and |f(xₙ)| ≥ ε).

Then:
∫₋∞^∞ f²(x)dx ≥ ∑_{n=1}^∞ ∫_{xₙ-δₙ}^{xₙ+δₙ} f²(x)dx
                ≥ ∑_{n=1}^∞ 2δₙ × (ε/2)²
                ≥ ∑_{n=1}^∞ 2δ × ε²/4 = ∞

This contradicts ∫₋∞^∞ f²(x)dx < ∞.

Therefore lim_{x→±∞} f(x) = 0. QED

Note: This is related to the Riemann-Lebesgue lemma in Fourier analysis.`,
    scoringCriteria: {
      contradiction_setup: 25,
      continuity_use: 30,
      interval_construction: 30,
      integral_bound: 15
    }
  },

  {
    id: 'RA-005',
    domain: 'Complex Analysis',
    difficulty: 'Expert',
    prompt: `Prove the Fundamental Theorem of Algebra using complex analysis: every non-constant polynomial has a root in ℂ.`,
    idealOutput: `Proof using Liouville's Theorem:

Let p(z) be a non-constant polynomial of degree n ≥ 1.
Assume p(z) ≠ 0 for all z ∈ ℂ.

Then f(z) = 1/p(z) is entire (holomorphic everywhere).

Claim: f is bounded.

Proof of claim: As |z| → ∞,
|p(z)| = |aₙz^n + ... + a₁z + a₀| ≥ |aₙ||z|^n - |aₙ₋₁||z|^(n-1) - ... - |a₀|

For large enough R, if |z| > R:
|p(z)| ≥ (|aₙ|/2)|z|^n → ∞

Therefore |f(z)| = 1/|p(z)| → 0 as |z| → ∞.

So f is bounded outside some disk |z| < R.
Inside the disk, f is continuous (hence bounded on compact set).

Therefore f is bounded on all of ℂ.

By Liouville's Theorem, any bounded entire function is constant.
So f is constant, which means p is constant.

This contradicts our assumption that p is non-constant.

Therefore p(z) = 0 for some z ∈ ℂ. QED`,
    scoringCriteria: {
      liouville_setup: 30,
      boundedness_proof: 35,
      asymptotic_analysis: 25,
      contradiction: 10
    }
  },

  {
    id: 'RA-006',
    domain: 'Real Analysis',
    difficulty: 'Expert',
    prompt: `Prove that the set of all polynomials with rational coefficients is dense in C[0,1] with the uniform norm.`,
    idealOutput: `Proof uses Stone-Weierstrass Theorem:

Stone-Weierstrass: Let A be a subalgebra of C[0,1] that:
1. Separates points (∀x≠y, ∃f∈A: f(x)≠f(y))
2. Vanishes nowhere (∀x, ∃f∈A: f(x)≠0)
3. Contains constants
Then A is dense in C[0,1].

Let A = polynomials with rational coefficients.

Verification:
1. A is an algebra: Sum and product of polynomials with rational coefficients have rational coefficients.

2. Separates points: p(x) = x ∈ A and x ≠ y ⟹ p(x) ≠ p(y).

3. Vanishes nowhere: p(x) = 1 ∈ A and 1 ≠ 0 everywhere.

4. Contains constants: All rational constants are in A.

By Stone-Weierstrass, A is dense in C[0,1].

Alternative: Use Weierstrass Approximation + rational approximation.
For any f ∈ C[0,1] and ε > 0:
- Weierstrass ⟹ ∃ polynomial p with ||f - p||∞ < ε/2
- Rational approximation ⟹ ∃ q with rational coefficients: ||p - q||∞ < ε/2
- Triangle inequality: ||f - q||∞ < ε

Therefore ℚ[x] is dense in C[0,1]. QED`,
    scoringCriteria: {
      theorem_choice: 30,
      verification: 40, // Checking all conditions
      alternative: 15, // Providing alternative proof
      rigor: 15
    }
  },

  {
    id: 'RA-007',
    domain: 'Complex Analysis',
    difficulty: 'Expert',
    prompt: `Find all entire functions f: ℂ → ℂ such that |f(z)| ≤ 1 + |z|² for all z ∈ ℂ.`,
    idealOutput: `Solution:

By hypothesis, |f(z)| ≤ 1 + |z|².

For large |z|, we have |f(z)| ≤ C|z|² for some constant C.

Consider g(z) = f(z)/z³. For large |z|:
|g(z)| = |f(z)|/|z|³ ≤ C|z|²/|z|³ = C/|z| → 0

Since g is entire (removable singularity at 0) and |g(z)| → 0 as |z| → ∞,
by a generalized Liouville's theorem, g is a polynomial.

But polynomials don't vanish at infinity unless they're identically zero.
Therefore g(z) = 0, which means f(z) = 0.

Actually, let's reconsider. The bound allows polynomials up to degree 2.

More careful analysis: Write f(z) = ∑aₙz^n.

If deg(f) = n > 2, then |f(z)| ~ |aₙ||z|^n for large |z|.
This violates |f(z)| ≤ 1 + |z|² for large |z|.

Therefore deg(f) ≤ 2.

Answer: f(z) = az² + bz + c for arbitrary a, b, c ∈ ℂ with |a| ≤ 1.

The constraint |f(z)| ≤ 1 + |z|² for all z forces |a| ≤ 1.`,
    scoringCriteria: {
      growth_analysis: 35,
      degree_bound: 35,
      coefficient_constraint: 20,
      completeness: 10
    }
  },

  {
    id: 'RA-008',
    domain: 'Real Analysis',
    difficulty: 'Expert',
    prompt: `Prove that ∫₀¹ ∫₀¹ (x² - y²)/((x² + y²)²) dy dx ≠ ∫₀¹ ∫₀¹ (x² - y²)/((x² + y²)²) dx dy.

Explain what this demonstrates about Fubini's theorem.`,
    idealOutput: `Computation:

First integral (dy then dx):
∫₀¹ [∫₀¹ (x² - y²)/(x² + y²)² dy] dx

Inner integral: Let I(x) = ∫₀¹ (x² - y²)/(x² + y²)² dy

Compute ∂/∂y[(x² + y²)⁻¹] = -2y/(x² + y²)²

So: ∫ (x² - y²)/(x² + y²)² dy = ∫ x²/(x² + y²)² dy - ∫ y²/(x² + y²)² dy
   = ∫ x²/(x² + y²)² dy + (1/2)∫ ∂/∂y[(x² + y²)⁻¹] dy
   = ∫ x²/(x² + y²)² dy + [y/(x² + y²)]

After careful integration: I(x) = π/(4x) for the first term.
Evaluating from 0 to 1 gives ∫₀¹ I(x)dx = π/4.

Second integral (dx then dy):
By symmetry and careful analysis, this equals -π/4.

Therefore: π/4 ≠ -π/4, so the integrals are different!

Fubini's Theorem explanation:
Fubini requires ∫∫ |f(x,y)| dxdy < ∞.

Here: ∫₀¹ ∫₀¹ |(x² - y²)/(x² + y²)²| dxdy = ∞

Near (0,0), the integrand ~ 1/r² (not integrable in 2D).
Fubini's hypothesis fails, so conclusion doesn't hold.

This is a classic counterexample showing absolute integrability is essential.`,
    scoringCriteria: {
      computation_1: 25,
      computation_2: 25,
      fubini_condition: 35,
      explanation: 15
    }
  },

  {
    id: 'RA-009',
    domain: 'Real Analysis',
    difficulty: 'Expert',
    prompt: `Prove the Arzela-Ascoli Theorem: A sequence of continuous functions on [a,b] is compact if and only if it is uniformly bounded and equicontinuous.`,
    idealOutput: `Arzela-Ascoli Theorem:

Let F ⊆ C[a,b]. F is compact (in uniform norm) iff F is closed, uniformly bounded, and equicontinuous.

(⟹) Compact implies bounded and equicontinuous:

Uniform boundedness: Compact sets are bounded, so ∃M: ||f||∞ ≤ M for all f ∈ F.

Equicontinuity: Fix ε > 0. Cover F by finitely many balls B(fᵢ, ε/3).
Each fᵢ is uniformly continuous, so ∃δᵢ: |x-y| < δᵢ ⟹ |fᵢ(x)-fᵢ(y)| < ε/3.
Let δ = min{δᵢ}. For any f ∈ F, |x-y| < δ:
|f(x)-f(y)| ≤ |f(x)-fᵢ(x)| + |fᵢ(x)-fᵢ(y)| + |fᵢ(y)-f(y)| < ε

(⟸) Bounded + equicontinuous implies compact:

Need to show every sequence has a convergent subsequence.

Let {fₙ} ⊆ F. Construct convergent subsequence:

Step 1: By equicontinuity, choose δₖ for ε = 1/k.
Partition [a,b] into intervals of length < δₖ.

Step 2: At countably many points (rationals), extract diagonal subsequence converging at each point.

Step 3: Use equicontinuity to extend pointwise convergence to uniform convergence on [a,b].

By Cauchy criterion, {fₙₖ} converges uniformly to some f ∈ C[a,b].

If F is closed, f ∈ F.

Therefore F is compact. QED`,
    scoringCriteria: {
      forward_direction: 30,
      backward_direction: 45, // More difficult
      diagonal_argument: 15,
      rigor: 10
    }
  },

  {
    id: 'RA-010',
    domain: 'Complex Analysis',
    difficulty: 'Expert',
    prompt: `Prove Rouche's Theorem and use it to show that all roots of z⁷ - 5z³ + 12 lie in the annulus 1 < |z| < 2.`,
    idealOutput: `Rouche's Theorem:
Let f, g be holomorphic on and inside simple closed curve γ.
If |f(z) - g(z)| < |g(z)| on γ, then f and g have the same number of zeros inside γ.

Proof sketch: h(t) = g(z) + t(f(z) - g(z)) for t ∈ [0,1].
For each t, |h(t) - g(z)| = t|f(z) - g(z)| < |g(z)|, so h(t) ≠ 0 on γ.
By argument principle, number of zeros is constant in t.
At t=0: h(0) = g, at t=1: h(1) = f. QED

Application: p(z) = z⁷ - 5z³ + 12

Inside |z| = 1:
Let f(z) = z⁷ - 5z³ + 12, g(z) = 12.
On |z| = 1: |f(z) - g(z)| = |z⁷ - 5z³| ≤ |z|⁷ + 5|z|³ = 1 + 5 = 6 < 12 = |g(z)|
By Rouche, f has same zeros as g, which is 0 zeros inside |z| = 1.

Inside |z| = 2:
Let f(z) = z⁷ - 5z³ + 12, g(z) = z⁷.
On |z| = 2: |f(z) - g(z)| = |-5z³ + 12| ≤ 5(8) + 12 = 52 < 128 = |z⁷| = |g(z)|
By Rouche, f has 7 zeros inside |z| = 2.

Between circles:
7 - 0 = 7 roots in 1 < |z| < 2. QED`,
    scoringCriteria: {
      theorem_proof: 30,
      inside_small: 25,
      inside_large: 25,
      conclusion: 20
    }
  },

  // ==================== ABSTRACT ALGEBRA (10 problems) ====================

  {
    id: 'AA-001',
    domain: 'Abstract Algebra',
    difficulty: 'Expert',
    prompt: `Prove that every group of order 255 = 3 × 5 × 17 is cyclic.`,
    idealOutput: `Proof using Sylow Theorems:

Let G be a group of order 255 = 3 × 5 × 17.

Sylow p-subgroups:
- n₃ | 85 and n₃ ≡ 1 (mod 3) ⟹ n₃ ∈ {1, 85}
- n₅ | 51 and n₅ ≡ 1 (mod 5) ⟹ n₅ ∈ {1, 51}
- n₁₇ | 15 and n₁₇ ≡ 1 (mod 17) ⟹ n₁₇ = 1

So there's a unique (hence normal) Sylow 17-subgroup P₁₇.

If n₃ = 85: 85 × (3-1) = 170 elements of order 3.
If n₅ = 51: 51 × (5-1) = 204 elements of order 5.
Total: 170 + 204 + 17 = 391 > 255, contradiction.

Therefore n₃ = 1 or n₅ = 1 (or both).

Case 1: n₃ = 1. Then P₃ is normal. G = P₃ × P₅ × P₁₇ (since orders are coprime).
Case 2: n₅ = 1. Then P₅ is normal. G = P₃ × P₅ × P₁₇ (same reasoning).

In either case, G is a product of cyclic groups of coprime orders.
G ≅ ℤ₃ × ℤ₅ × ℤ₁₇ ≅ ℤ₂₅₅ (by Chinese Remainder Theorem for groups).

Therefore G is cyclic. QED`,
    scoringCriteria: {
      sylow_analysis: 35,
      counting_argument: 30,
      normality: 20,
      crt_application: 15
    }
  },

  {
    id: 'AA-002',
    domain: 'Abstract Algebra',
    difficulty: 'Expert',
    prompt: `Prove that the ring ℤ[√-5] = {a + b√-5 : a, b ∈ ℤ} is not a unique factorization domain by finding an element with two distinct factorizations.`,
    idealOutput: `Proof:

Consider 6 ∈ ℤ[√-5].

Factorization 1: 6 = 2 × 3
Factorization 2: 6 = (1 + √-5)(1 - √-5)

Verify second factorization:
(1 + √-5)(1 - √-5) = 1 - (√-5)² = 1 - (-5) = 6 ✓

Claim: 2, 3, (1+√-5), (1-√-5) are all irreducible.

Proof uses norm: N(a + b√-5) = a² + 5b².
N is multiplicative: N(αβ) = N(α)N(β).

For α irreducible, if α = βγ, then N(α) = N(β)N(γ).
So N(β) = 1 or N(γ) = 1 (one is unit).

Check irreducibility:
- N(2) = 4. If 2 = βγ, then N(β)N(γ) = 4.
  No element has norm 2 (a² + 5b² ≠ 2 for integers a,b).
  So one factor has norm 1 (unit). Thus 2 is irreducible.

- N(3) = 9. Similar argument: no norm 3 elements.

- N(1+√-5) = 1 + 5 = 6. No norm 2 or 3 elements.

- N(1-√-5) = 1 + 5 = 6. Same.

Claim: These factorizations are distinct (not related by units).
Units in ℤ[√-5] have norm 1, so units are ±1.
2, 3, (1±√-5) are not associates.

Therefore ℤ[√-5] is not a UFD. QED`,
    scoringCriteria: {
      factorizations: 25,
      norm_function: 25,
      irreducibility: 35,
      distinctness: 15
    }
  },

  {
    id: 'AA-003',
    domain: 'Abstract Algebra',
    difficulty: 'Expert',
    prompt: `Let G = GL_n(ℝ) be the general linear group. Prove that the center Z(G) = {cI : c ∈ ℝ*, I is identity matrix}.`,
    idealOutput: `Proof:

(⊆) First show Z(G) ⊆ {cI : c ∈ ℝ*}.

Let A ∈ Z(G). Then AB = BA for all B ∈ GL_n(ℝ).

Consider elementary matrix Eᵢⱼ(λ) = I + λeᵢⱼ (where eᵢⱼ has 1 at position (i,j), 0 elsewhere).
These are in GL_n(ℝ) for λ ≠ 0.

AEᵢⱼ(λ) = Eᵢⱼ(λ)A for all i≠j, λ≠0.

Compute AEᵢⱼ(λ):
(AEᵢⱼ(λ))ₖₗ = Aₖₗ + λAₖⱼδᵢₗ

Compute Eᵢⱼ(λ)A:
(Eᵢⱼ(λ)A)ₖₗ = Aₖₗ + λδₖᵢAⱼₗ

Equating: Aₖₗ + λAₖⱼδᵢₗ = Aₖₗ + λδₖᵢAⱼₗ

For k=i, l≠i,j: λAᵢⱼ = 0 ⟹ Aᵢⱼ = 0 for i≠j.

For k≠i, l=i: 0 = λAⱼᵢ ⟹ Aⱼᵢ = 0 for j≠i.

So A is diagonal.

Now consider diagonal matrix D with distinct diagonal entries dᵢ.
AD = DA implies dᵢAᵢᵢ = dᵢAᵢᵢ (trivial) and dⱼAᵢⱼ = dᵢAᵢⱼ.
Since Aᵢⱼ = 0 for i≠j, no constraint.
But for diagonal: (AD)ᵢᵢ = dᵢAᵢᵢ and (DA)ᵢᵢ = dᵢAᵢᵢ.

Actually, consider matrix with dᵢ ≠ dⱼ for i≠j.
Then A₁₁ = A₂₂ = ... = Aₙₙ = c for some c.

Therefore A = cI.

(⊇) Clearly cI commutes with all matrices.

Therefore Z(GL_n(ℝ)) = {cI : c ∈ ℝ*}. QED`,
    scoringCriteria: {
      subset_direction: 45, // Harder direction
      elementary_matrices: 25,
      diagonal_argument: 20,
      reverse_direction: 10
    }
  },

  {
    id: 'AA-004',
    domain: 'Abstract Algebra',
    difficulty: 'Expert',
    prompt: `Prove that Q(∛2) ≅ Q(ω∛2) as vector spaces over Q, but not as fields, where ω = e^(2πi/3).`,
    idealOutput: `Part 1: Vector space isomorphism

Both extensions have degree 3 over ℚ.

For ℚ(∛2): Minimal polynomial is x³ - 2 (irreducible by Eisenstein).
Basis: {1, ∛2, ∛4}, dimension = 3.

For ℚ(ω∛2): First note ω ∉ ℚ(∛2) (ℚ(∛2) ⊂ ℝ but ω ∉ ℝ).
However, ω∛2 has minimal polynomial x³ - 2.
Basis: {1, ω∛2, ω²∛4}, dimension = 3.

As ℚ-vector spaces, both have dimension 3, so they're isomorphic.

Part 2: Not field isomorphic

Suppose φ: ℚ(∛2) → ℚ(ω∛2) is a field isomorphism.

φ must fix ℚ (homomorphism of fields containing ℚ).

The roots of x³ - 2 are ∛2, ω∛2, ω²∛2.
φ(∛2) must be a root of x³ - 2.

But φ(ℚ(∛2)) ⊂ ℚ(ω∛2).

Key observation:
ℚ(∛2) ⊂ ℝ (real field)
ℚ(ω∛2) ⊄ ℝ (contains complex numbers)

Any field isomorphism preserves the property of being orderable.
ℚ(∛2) is orderable (subfield of ℝ).
ℚ(ω∛2) is not orderable (contains i).

Therefore, no field isomorphism exists.

Alternative: Automorphism group argument.
Aut(ℚ(∛2)/ℚ) is trivial.
Aut(ℚ(ω∛2)/ℚ) has order 3 (Galois extension).

Conclusion: Isomorphic as vector spaces but not as fields. QED`,
    scoringCriteria: {
      dimension_analysis: 25,
      minimal_polynomial: 20,
      orderability: 35, // Key insight
      alternative_proof: 20
    }
  },

  {
    id: 'AA-005',
    domain: 'Abstract Algebra',
    difficulty: 'Expert',
    prompt: `Prove that a finite integral domain is a field.`,
    idealOutput: `Proof:

Let R be a finite integral domain with |R| = n.

Need to show: Every nonzero element has a multiplicative inverse.

Let a ∈ R with a ≠ 0.

Consider the map φₐ: R → R defined by φₐ(x) = ax.

Claim: φₐ is injective.
Proof: If φₐ(x) = φₐ(y), then ax = ay, so a(x-y) = 0.
Since R is integral domain and a ≠ 0, we have x - y = 0, thus x = y.
Therefore φₐ is injective.

Since R is finite and φₐ: R → R is injective, φₐ is bijective.

In particular, φₐ is surjective, so 1 ∈ Im(φₐ).

Therefore ∃b ∈ R such that φₐ(b) = ab = 1.

Thus b is the multiplicative inverse of a.

Since a was arbitrary nonzero element, every nonzero element has an inverse.

Combined with R being integral domain (commutative with 1 and no zero divisors),
R is a field.

QED

Note: This fails for infinite integral domains (e.g., ℤ).`,
    scoringCriteria: {
      map_definition: 20,
      injectivity: 30, // Key step
      surjectivity: 30, // Finiteness used here
      conclusion: 20
    }
  },

  {
    id: 'AA-006',
    domain: 'Abstract Algebra',
    difficulty: 'Expert',
    prompt: `Prove that the polynomial x⁴ + 1 is reducible over ℤ/pℤ for every prime p.`,
    idealOutput: `Proof by cases:

Factorization: x⁴ + 1 = (x² - √2x + 1)(x² + √2x + 1) over ℝ.

Over finite fields:

Case 1: p = 2
x⁴ + 1 = (x + 1)⁴ in ℤ/2ℤ[x]
Verification: (x+1)⁴ = x⁴ + 4x³ + 6x² + 4x + 1 ≡ x⁴ + 1 (mod 2) ✓

Case 2: p ≡ 1 (mod 8)
By quadratic reciprocity and supplements, -1 and 2 are squares mod p.
So √2 exists in ℤ/pℤ.
Therefore x⁴ + 1 factors as (x² - √2x + 1)(x² + √2x + 1).

Case 3: p ≡ 3, 5, 7 (mod 8)
If -1 or 2 is not a square, factors don't exist in ℤ/pℤ.
BUT x⁴ + 1 always factors in ℤ/pℤ[x]!

Key lemma: x⁴ + 1 = (x² - ax + 1)(x² + ax + 1) where a² = 2 (mod p).
If 2 is not square mod p, then 2 is square in ℤ/p²ℤ or field extension.

Actually, better approach:
x⁸ - 1 = (x⁴ - 1)(x⁴ + 1)
Roots of x⁸ - 1 are 8th roots of unity.
Order of (ℤ/pℤ)* is p-1.

If 8 | (p-1), then 8th roots exist, so x⁴ + 1 factors.
If 8 ∤ (p-1), then in extension field ℤ/p²ℤ or further, factors exist.

By Fermat's Little Theorem and structure of finite fields,
x⁴ + 1 is always reducible over ℤ/pℤ for every prime p. QED`,
    scoringCriteria: {
      case_p2: 20,
      case_p1mod8: 25,
      other_cases: 35, // Most difficult
      field_theory: 20
    }
  },

  {
    id: 'AA-007',
    domain: 'Abstract Algebra',
    difficulty: 'Expert',
    prompt: `Let G be a group acting on set X. Prove the Orbit-Stabilizer Theorem: |Orbit(x)| × |Stab(x)| = |G|.`,
    idealOutput: `Orbit-Stabilizer Theorem:

Let G act on X, x ∈ X.
Orbit: Orb(x) = {g·x : g ∈ G}
Stabilizer: Stab(x) = {g ∈ G : g·x = x}

Proof:

Step 1: Stab(x) is a subgroup of G.
(Routine verification: identity stabilizes x, closure, inverses)

Step 2: Define map φ: G/Stab(x) → Orb(x) by φ(gStab(x)) = g·x.

Step 3: φ is well-defined.
If gStab(x) = hStab(x), then h⁻¹g ∈ Stab(x).
So (h⁻¹g)·x = x, thus g·x = h·x.
Therefore φ(gStab(x)) = φ(hStab(x)).

Step 4: φ is injective.
If φ(gStab(x)) = φ(hStab(x)), then g·x = h·x.
So (h⁻¹g)·x = x, thus h⁻¹g ∈ Stab(x).
Therefore gStab(x) = hStab(x).

Step 5: φ is surjective.
For any y ∈ Orb(x), y = g·x for some g ∈ G.
Then y = φ(gStab(x)).

Step 6: φ is bijection, so |G/Stab(x)| = |Orb(x)|.

By Lagrange's Theorem: |G| = |G/Stab(x)| × |Stab(x)| = |Orb(x)| × |Stab(x)|.

QED`,
    scoringCriteria: {
      definitions: 15,
      map_definition: 20,
      well_defined: 20,
      bijection: 30,
      conclusion: 15
    }
  },

  {
    id: 'AA-008',
    domain: 'Abstract Algebra',
    difficulty: 'Expert',
    prompt: `Prove that every group of order p² (p prime) is abelian.`,
    idealOutput: `Proof:

Let G be a group of order p².

Case 1: G is cyclic.
Then G ≅ ℤ_{p²}, which is abelian.

Case 2: G is not cyclic.

Every element has order dividing p² (by Lagrange).
Orders are: 1, p, or p².

If some element has order p², G is cyclic (Case 1).
So all non-identity elements have order p.

Key Lemma: Center Z(G) ≠ {e}.
Proof: Consider class equation:
|G| = |Z(G)| + ∑[G:C(xᵢ)]

where sum is over conjugacy class representatives xᵢ ∉ Z(G).

Each [G:C(xᵢ)] divides |G| = p² and [G:C(xᵢ)] > 1.
So [G:C(xᵢ)] ∈ {p, p²}.

But [G:C(xᵢ)] ≠ p² (else C(xᵢ) = {e}, meaning xᵢ commutes only with identity, contradicting xᵢ ∈ C(xᵢ)).

So each [G:C(xᵢ)] = p.

Therefore: p² = |Z(G)| + kp for some k ≥ 0.
This gives |Z(G)| ≡ 0 (mod p), so p | |Z(G)|.
Since |Z(G)| > 1, we have |Z(G)| ∈ {p, p²}.

Subcase 2a: |Z(G)| = p².
Then Z(G) = G, so G is abelian.

Subcase 2b: |Z(G)| = p.
Then |G/Z(G)| = p, so G/Z(G) is cyclic.
But if G/Z(G) is cyclic, then G is abelian (standard theorem).

In all cases, G is abelian. QED`,
    scoringCriteria: {
      case_structure: 20,
      center_lemma: 35, // Key insight
      class_equation: 25,
      quotient_argument: 20
    }
  },

  {
    id: 'AA-009',
    domain: 'Abstract Algebra',
    difficulty: 'Expert',
    prompt: `Prove that ℚ(√2, √3) = ℚ(√2 + √3) and find [ℚ(√2, √3) : ℚ].`,
    idealOutput: `Part 1: Field equality ℚ(√2, √3) = ℚ(√2 + √3)

(⊇) direction: ℚ(√2 + √3) ⊆ ℚ(√2, √3)
Let α = √2 + √3 ∈ ℚ(√2, √3).
So ℚ(α) ⊆ ℚ(√2, √3).

(⊆) direction: ℚ(√2, √3) ⊆ ℚ(√2 + √3)
Let α = √2 + √3.
Then α² = 5 + 2√6, so α² - 5 = 2√6.

Also: (α² - 5)² = 4·6 = 24
So α⁴ - 10α² + 25 = 24, giving α⁴ - 10α² + 1 = 0.

But α² = 5 + 2√6, so:
√6 = (α² - 5)/2 ∈ ℚ(α)

Also: α = √2 + √3, and α² = 5 + 2√6.
From √6 = √2·√3 and √6 ∈ ℚ(α):

α - √2 = √3, so (α - √2)² = 3.
α² - 2α√2 + 2 = 3.
√2 = (α² - 1)/(2α) ∈ ℚ(α).

Then √3 = α - √2 ∈ ℚ(α).

Therefore ℚ(√2, √3) ⊆ ℚ(α).

Part 2: Degree calculation

[ℚ(√2) : ℚ] = 2 (minimal polynomial x² - 2)
[ℚ(√2, √3) : ℚ(√2)] = 2 (√3 ∉ ℚ(√2) as ℚ(√2) ⊂ ℝ but √3 is not a rational multiple of √2)

By tower law:
[ℚ(√2, √3) : ℚ] = [ℚ(√2, √3) : ℚ(√2)] × [ℚ(√2) : ℚ] = 2 × 2 = 4

Answer: ℚ(√2, √3) = ℚ(√2 + √3) and [ℚ(√2, √3) : ℚ] = 4.`,
    scoringCriteria: {
      subset_1: 20,
      subset_2: 40, // More difficult - extracting √2 and √3
      degree: 25,
      tower_law: 15
    }
  },

  {
    id: 'AA-010',
    domain: 'Abstract Algebra',
    difficulty: 'Expert',
    prompt: `Prove that the commutator subgroup [G, G] is the smallest normal subgroup N such that G/N is abelian.`,
    idealOutput: `Proof:

Notation: [G, G] = ⟨[g, h] : g, h ∈ G⟩ where [g, h] = ghg⁻¹h⁻¹.

Part 1: [G, G] is normal in G.

For any x ∈ G and [g, h] ∈ [G, G]:
x[g, h]x⁻¹ = x(ghg⁻¹h⁻¹)x⁻¹ = (xgx⁻¹)(xhx⁻¹)(xgx⁻¹)⁻¹(xhx⁻¹)⁻¹
          = [xgx⁻¹, xhx⁻¹] ∈ [G, G]

So [G, G] is closed under conjugation, thus normal.

Part 2: G/[G, G] is abelian.

For any g[G, G], h[G, G] ∈ G/[G, G]:
(g[G, G])(h[G, G])(g[G, G])⁻¹(h[G, G])⁻¹ = ghg⁻¹h⁻¹[G, G] = [g, h][G, G] = [G, G]

So all commutators are trivial in quotient, thus G/[G, G] is abelian.

Part 3: [G, G] is minimal.

Let N ⊴ G with G/N abelian.
Need to show [G, G] ⊆ N.

For any g, h ∈ G:
In G/N: (gN)(hN) = (hN)(gN) (abelian)
So ghN = hgN, thus g⁻¹h⁻¹ghN = N.
Therefore ghg⁻¹h⁻¹ = [g, h] ∈ N.

Since N contains all commutators and is closed under products, [G, G] ⊆ N.

Conclusion: [G, G] is the smallest normal subgroup with abelian quotient. QED`,
    scoringCriteria: {
      normality: 25,
      quotient_abelian: 30,
      minimality: 35, // Key property
      rigor: 10
    }
  },

  // ==================== COMBINATORICS & GRAPH THEORY (10 problems) ====================

  {
    id: 'CG-001',
    domain: 'Combinatorics',
    difficulty: 'Expert',
    prompt: `Prove the Erdős-Ko-Rado Theorem: Let F be a family of k-subsets of {1, 2, ..., n} such that any two sets in F have non-empty intersection. If n ≥ 2k, then |F| ≤ C(n-1, k-1).`,
    idealOutput: `Erdős-Ko-Rado Theorem:

Setup: F ⊆ ([n] choose k), all pairs in F intersect, n ≥ 2k.

Proof by cyclic shifting:

Arrange {1, 2, ..., n} on a circle.
For any k-subset A, consider its n cyclic shifts.

Key Observation: Among n cyclic shifts of A, at most k are in F.

Proof of observation:
If we include k consecutive positions starting at position i,
and shift by k positions, we get k consecutive positions starting at i+k.
Since n ≥ 2k, these two sets are disjoint.
Therefore, among n shifts, we can partition into at least ⌊n/k⌋ ≥ 2 groups,
where sets in different groups are disjoint.
So at most k shifts can be in F (as all pairs in F must intersect).

Counting:
Total sum over all k-subsets A of (number of shifts of A in F)
≤ k × (n choose k)

But this sum also equals n × |F| (each set in F is counted n times as a shift).

Therefore: n × |F| ≤ k × (n choose k)
So: |F| ≤ k/n × (n choose k) = k/n × n!/(k!(n-k)!) = (n-1)!/((k-1)!(n-k)!) = (n-1 choose k-1)

Equality: Achieved when F = {A ⊆ [n] : |A| = k, 1 ∈ A}.

QED`,
    scoringCriteria: {
      setup: 15,
      cyclic_shifting: 35, // Key technique
      counting_argument: 35,
      bound_derivation: 15
    }
  },

  {
    id: 'CG-002',
    domain: 'Graph Theory',
    difficulty: 'Expert',
    prompt: `Prove that every planar graph is 5-colorable using Kempe chain arguments.`,
    idealOutput: `Five Color Theorem for Planar Graphs:

Proof by strong induction on number of vertices n.

Base case: n ≤ 5 trivial (use ≤ 5 colors).

Inductive step: Assume all planar graphs with < n vertices are 5-colorable.
Let G be planar graph with n vertices.

Lemma: Every planar graph has a vertex v with deg(v) ≤ 5.
Proof: By Euler's formula, |E| ≤ 3|V| - 6 for connected planar graph.
Average degree = 2|E|/|V| ≤ 6 - 12/|V| < 6.
So minimum degree < 6. QED lemma.

Let v be vertex with deg(v) ≤ 5.
Consider G' = G - v (remove v).
G' is planar with n-1 vertices, so by induction G' is 5-colorable.

Let c: V(G') → {1, 2, 3, 4, 5} be a 5-coloring of G'.

Case 1: deg(v) ≤ 4
Neighbors of v use at most 4 colors, so a 5th color is available for v.

Case 2: deg(v) = 5 and neighbors use ≤ 4 colors total.
Again, a color is available.

Case 3: deg(v) = 5 and neighbors use all 5 colors.
Label neighbors v₁, v₂, v₃, v₄, v₅ clockwise with colors 1, 2, 3, 4, 5.

Kempe chain technique:
Consider subgraph H_{1,3} induced by vertices colored 1 or 3.
If v₁ and v₃ are in different components of H_{1,3}:
- Swap colors 1↔3 in component containing v₁
- Now v₁ is colored 3, and v₃ is still colored 3
- Wait, this doesn't help...

Actually: If v₁ and v₃ disconnected in H_{1,3}, swap in v₁'s component.
Now v₁ has color 3, so colors around v are {2, 3, 3, 4, 5}, freeing color 1 for v.

If v₁ and v₃ connected in H_{1,3}, then v₂ and v₄ disconnected in H_{2,4}
(by planarity - path from v₁ to v₃ separates v₂ from v₄).
Swap 2↔4 in v₂'s component, freeing color 2 for v.

Therefore G is 5-colorable. QED`,
    scoringCriteria: {
      induction_setup: 20,
      degree_lemma: 20,
      cases: 25,
      kempe_chains: 35 // Key technique
    }
  },

  {
    id: 'CG-003',
    domain: 'Combinatorics',
    difficulty: 'Expert',
    prompt: `Prove the Catalan number formula: C_n = (1/(n+1)) × C(2n, n). Show this counts binary trees with n internal nodes.`,
    idealOutput: `Catalan Numbers Proof:

Part 1: Recurrence relation for binary trees.
Let C_n = number of binary trees with n internal nodes.

C_0 = 1 (empty tree)

For n ≥ 1: Root has left subtree with k nodes, right with n-1-k nodes.
C_n = ∑_{k=0}^{n-1} C_k × C_{n-1-k}

Part 2: Generate sequence via paths.
Consider lattice paths from (0, 0) to (n, n) using steps Up (U) and Right (R).
Total: C(2n, n) paths.

Bijection: Binary tree ↔ Path
Traverse tree in-order: internal node → U, leaf → R.
This gives valid path (equal U's and R's).

Part 3: Ballot problem / Cycle lemma.
"Bad" paths: those that cross diagonal (reach (k+1, k) for some k).

For each bad path P from (0,0) to (n,n):
Find first point (k+1, k) where path crosses.
Reflect portion after this point across line y = x + 1.
This creates bijection between bad paths (0,0)→(n,n) and all paths (0,0)→(n-1,n+1).

Number of bad paths = C(2n, n-1).

Part 4: Count good paths.
Good paths = C(2n, n) - C(2n, n-1)
           = C(2n, n) × [1 - n/(n+1)]
           = C(2n, n) × 1/(n+1)
           = (1/(n+1)) × C(2n, n)

This is C_n. QED

Verification: C_1 = 1, C_2 = 2, C_3 = 5, C_4 = 14, ... ✓`,
    scoringCriteria: {
      recurrence: 20,
      bijection: 25,
      ballot_lemma: 35, // Key insight
      formula_derivation: 20
    }
  },

  /*{
    id: 'CG-004',
    domain: 'Graph Theory',
    difficulty: 'Expert',
    prompt: `Prove Hall's Marriage Theorem: A bipartite graph G = (X ∪ Y, E) has a perfect matching from X to Y if and only if |N(S)| ≥ |S| for all S ⊆ X.`,
    idealOutput: `Hall's Marriage Theorem:

Bipartite graph G = (X ∪ Y, E), |X| = |Y| = n.
Perfect matching: matching covering all vertices.

(⟹) Necessity:
If perfect matching M exists, for any S ⊆ X:
Each vertex in S matched to distinct vertex in Y.
So |N(S)| ≥ |S|. ✓

(⟸) Sufficiency:
Assume |N(S)| ≥ |S| for all S ⊆ X.

Proof by strong induction on n = |X|.

Base: n = 1 trivial.

Inductive step:

Case 1: |N(S)| ≥ |S| + 1 for all ∅ ≠ S ⊊ X.
("Strict Hall condition")

Pick any edge (x, y) with x ∈ X, y ∈ Y.
Consider G' = G - {x, y}.

For any S ⊆ X\\{x}:
N_{G'}(S) = N_G(S) \\ {y}
|N_{G'}(S)| ≥ |N_G(S)| - 1 ≥ |S| + 1 - 1 = |S|

So Hall condition holds in G'.
By induction, G' has perfect matching.
Add edge (x, y) to get perfect matching in G.

Case 2: ∃S ⊊ X with ∅ ≠ S and |N(S)| = |S|.

Consider G[S ∪ N(S)] (induced subgraph).
For any T ⊆ S: N_{G[S ∪ N(S)]}(T) ⊇ N_G(T), so Hall condition holds.
By induction, G[S ∪ N(S)] has perfect matching M₁.

Consider G[X \\setminus S ∪ Y \\setminus N(S)].
For any T ⊆ X \\setminus S:
|N_G(S ∪ T)| ≥ |S ∪ T| = |S| + |T|
N_G(S ∪ T) ⊇ N(S) ∪ N_{G[X \\setminus S ∪ Y \\setminus N(S)]}(T)
|N(S)| + |N_{G[X \\setminus S ∪ Y \\setminus N(S)]}(T)| ≤ |N_G(S ∪ T)|
|N_{G[X \\setminus S ∪ Y \\setminus N(S)]}(T)| ≥ |T|

By induction, G[X \\setminus S ∪ Y \\setminus N(S)] has perfect matching M₂.

M = M₁ ∪ M₂ is perfect matching in G.

QED`,
    scoringCriteria: {
      necessity: 10,
      induction_setup: 20,
      case_analysis: 30,
      critical_set_case: 40 // Most difficult
    }
  },

  {
    id: 'CG-005',
    domain: 'Combinatorics',
    difficulty: 'Expert',
    prompt: `Prove the Inclusion-Exclusion Principle: |A₁ ∪ A₂ ∪ ... ∪ Aₙ| = ∑|Aᵢ| - ∑|Aᵢ ∩ Aⱼ| + ∑|Aᵢ ∩ Aⱼ ∩ Aₖ| - ... + (-1)^(n+1)|A₁ ∩ ... ∩ Aₙ|.`,
    idealOutput: `Inclusion-Exclusion Principle:

Proof by counting:

Let x ∈ A₁ ∪ ... ∪ Aₙ.
Suppose x ∈ exactly k of the sets, where k ≥ 1.

Count how many times x is counted in RHS:

- In ∑|Aᵢ|: counted k times
- In ∑|Aᵢ ∩ Aⱼ|: counted C(k,2) times
- In ∑|Aᵢ ∩ Aⱼ ∩ Aₖ|: counted C(k,3) times
- ...
- In |A₁ ∩ ... ∩ Aₙ|: counted C(k,n) times (0 if k < n)

Total count of x in RHS:
∑_{j=1}^{k} (-1)^{j+1} C(k, j)

Lemma: ∑_{j=1}^{k} (-1)^{j+1} C(k, j) = 1 for k ≥ 1.

Proof of lemma:
By binomial theorem: (1 - 1)^k = ∑_{j=0}^{k} (-1)^j C(k, j) = 0

So: C(k, 0) + ∑_{j=1}^{k} (-1)^j C(k, j) = 0
Thus: 1 + ∑_{j=1}^{k} (-1)^j C(k, j) = 0
Therefore: ∑_{j=1}^{k} (-1)^{j+1} C(k, j) = 1 ✓

Since each x is counted exactly once on RHS, and LHS counts each x once:
LHS = RHS.

Alternative proof by induction on n is also valid.

Applications:
- Derangements: !n = n! × ∑_{k=0}^{n} (-1)^k/k!
- Euler's φ function
- Bonferroni inequalities

QED`,
    scoringCriteria: {
      counting_setup: 25,
      binomial_lemma: 35, // Key insight
      verification: 25,
      applications: 15
    }
  },

  {
    id: 'CG-006',
    domain: 'Graph Theory',
    difficulty: 'Expert',
    prompt: `Prove Turán's Theorem: The maximum number of edges in a triangle-free graph on n vertices is ⌊n²/4⌋.`,
    idealOutput: `Turán's Theorem (r=3 case):

Maximum edges in triangle-free graph on n vertices is ⌊n²/4⌋.

Proof:

Upper bound:
Let G be triangle-free with maximum edges.

Claim: G is bipartite.
Proof by contradiction: If G has odd cycle C of length ≥ 5, we can add edges without creating triangles (details omitted for brevity).

So G ⊆ K_{a,b} for some partition n = a + b.

Number of edges ≤ ab = a(n-a).

This is maximized when a = n/2 (by calculus or AM-GM).
Maximum = n/2 × n/2 = n²/4 (or ⌊n²/4⌋ if n odd).

Lower bound (construction):
Complete bipartite graph K_{⌊n/2⌋,⌈n/2⌉} has ⌊n/2⌋⌈n/2⌉ = ⌊n²/4⌋ edges and is triangle-free.

Alternative proof without assuming bipartiteness:

For each edge uv, let d(u) and d(v) be degrees.
Number of common neighbors ≤ min{d(u), d(v)} - 1 (else triangle).

Actually, simpler approach:

Let G have m edges. For vertex v, let d(v) be its degree.
Number of edges in neighborhood N(v) ≤ 0 (else triangle through v).

So G[N(v)] has 0 edges, meaning N(v) is independent set.

By handshaking: ∑d(v) = 2m.

For each edge uv: d(u) + d(v) ≤ n + 1 (else common neighbor).

Summing over all edges:
∑_{edges uv} (d(u) + d(v)) ≤ m(n + 1)

But LHS = ∑_v d(v)² (each vertex v counted d(v) times).

By Cauchy-Schwarz: (∑d(v))² ≤ n × ∑d(v)²
So: 4m² ≤ n × ∑d(v)² ≤ n × m(n+1)
Thus: 4m ≤ n(n+1), giving m ≤ n²/4 + n/4.

For large n: m ≤ n²/4.

QED`,
    scoringCriteria: {
      upper_bound: 40, // Main difficulty
      bipartite_claim: 25,
      construction: 20,
      alternative: 15 // Bonus for different approach
    }
  },

  {
    id: 'CG-007',
    domain: 'Combinatorics',
    difficulty: 'Expert',
    prompt: `Prove Ramsey's Theorem R(3,3) = 6: In any 2-coloring of edges of K₆, there exists a monochromatic triangle.`,
    idealOutput: `Ramsey Number R(3,3) = 6:

Theorem: In any red/blue coloring of K₆, ∃ monochromatic triangle.

Proof:

Pick any vertex v.
v has degree 5, so v is incident to 5 edges.

By pigeonhole principle, at least ⌈5/2⌉ = 3 edges have same color.
WLOG, assume 3 edges from v are red: v-a, v-b, v-c.

Consider triangle abc:

Case 1: One edge of abc is red (say ab).
Then vab is red triangle. ✓

Case 2: All edges of abc are blue.
Then abc is blue triangle. ✓

In both cases, monochromatic triangle exists.

Lower bound (R(3,3) > 5):
Need to show K₅ can be 2-colored without monochromatic triangle.

Construction: C₅ coloring
Vertices: {0, 1, 2, 3, 4}
Red edges: {01, 12, 23, 34, 40} (5-cycle)
Blue edges: all others (complement)

Verification:
Red graph is 5-cycle (no triangles in cycle).
Blue graph is star-like structure (complete bipartite minus cycle).
Blue edges: {02, 13, 24, 30, 41}
No blue triangle: would need 3 vertices with all 3 blue edges, but blue edges form pentagram pattern.

Therefore R(3,3) = 6. QED

General: R(3,3) = 6, R(3,4) = 9, R(4,4) = 18, R(3,5) = 14.
Formula: R(r,s) ≤ R(r-1,s) + R(r,s-1).`,
    scoringCriteria: {
      pigeonhole: 25,
      case_analysis: 30,
      lower_bound: 30, // Construction is crucial
      verification: 15
    }
  },

  {
    id: 'CG-008',
    domain: 'Graph Theory',
    difficulty: 'Expert',
    prompt: `Prove Kuratowski's Theorem (necessity only): If a graph contains a subdivision of K₅ or K₃,₃, then it is non-planar.`,
    idealOutput: `Kuratowski's Theorem (Necessity):

If G contains subdivision of K₅ or K₃,₃, then G is non-planar.

Proof for K₅:

Suppose G contains subdivision of K₅.
Suffices to show K₅ is non-planar (subdivision doesn't add planarity).

Proof K₅ is non-planar:

Assume K₅ is planar.
By Euler's formula: V - E + F = 2.
For K₅: V = 5, E = C(5,2) = 10.
So: 5 - 10 + F = 2, giving F = 7.

Each face has ≥ 3 edges (no loops/multi-edges).
Each edge borders ≤ 2 faces.
Counting: 3F ≤ 2E, so 3(7) ≤ 2(10), giving 21 ≤ 20. Contradiction!

Therefore K₅ is non-planar.

Proof for K₃,₃:

Assume K₃,₃ is planar.
V = 6, E = 3 × 3 = 9.
By Euler: 6 - 9 + F = 2, so F = 5.

Key: K₃,₃ is bipartite, so no odd cycles.
Therefore every face has ≥ 4 edges.
Counting: 4F ≤ 2E, so 4(5) ≤ 2(9), giving 20 ≤ 18. Contradiction!

Therefore K₃,₃ is non-planar.

Subdivision argument:
If H is subdivision of G, any planar embedding of H gives planar embedding of G (remove subdivision vertices).
Contrapositive: If G non-planar, any subdivision of G is non-planar.

Therefore, graph containing subdivision of K₅ or K₃,₃ is non-planar.

QED

Sufficiency (harder): If G non-planar, then G contains subdivision of K₅ or K₃,₃. (Omitted)`,
    scoringCriteria: {
      euler_formula: 25,
      k5_proof: 30,
      k33_proof: 30,
      subdivision: 15
    }
  },*/

  /*{
    id: 'CG-009',
    domain: 'Combinatorics',
    difficulty: 'Expert',
    prompt: `Prove Burnside's Lemma: For a finite group G acting on finite set X, the number of orbits is (1/|G|) × ∑_{g∈G} |Fix(g)|, where Fix(g) = {x ∈ X : g·x = x}.`,
    idealOutput: `Burnside's Lemma (Cauchy-Frobenius Lemma):

Number of orbits = (1/|G|) × ∑_{g∈G} |Fix(g)|

Proof:

Define: S = {(g, x) : g ∈ G, x ∈ X, g·x = x}

Count |S| in two ways:

Method 1: Fix g, count x.
|S| = ∑_{g∈G} |Fix(g)|

Method 2: Fix x, count g.
|S| = ∑_{x∈X} |Stab(x)|

where Stab(x) = {g ∈ G : g·x = x}.

By Orbit-Stabilizer Theorem:
|Orb(x)| × |Stab(x)| = |G|
So |Stab(x)| = |G|/|Orb(x)|

Therefore:
∑_{g∈G} |Fix(g)| = ∑_{x∈X} |Stab(x)| = ∑_{x∈X} |G|/|Orb(x)|

Group by orbits:
= ∑_{orbits Ω} ∑_{x∈Ω} |G|/|Ω|
= ∑_{orbits Ω} |Ω| × |G|/|Ω|
= ∑_{orbits Ω} |G|
= (number of orbits) × |G|

Therefore:
Number of orbits = (1/|G|) × ∑_{g∈G} |Fix(g)|

QED

Application example:
Number of distinct necklaces with n beads in k colors =
(1/2n) × [∑_{d|n} φ(d) × k^(n/d) + n × k^((n+1)/2)]

for odd n, with similar formula for even n.`,
    scoringCriteria: {
      double_counting: 35, // Key technique
      orbit_stabilizer: 25,
      orbit_grouping: 25,
      application: 15
    }
  },

  {
    id: 'CG-010',
    domain: 'Graph Theory',
    difficulty: 'Expert',
    prompt: `Prove König's Theorem: In a bipartite graph, the size of a maximum matching equals the size of a minimum vertex cover.`,
    idealOutput: `König's Theorem:

For bipartite graph G = (X ∪ Y, E):
max matching size = min vertex cover size

Proof:

Let M be maximum matching, C be minimum vertex cover.

(≤) direction: |M| ≤ |C|

Each edge in M must be covered by at least one vertex in C.
Since M is matching, edges in M are disjoint.
So distinct vertices needed to cover each edge in M.
Therefore |M| ≤ |C|.

(≥) direction: |M| ≥ |C| (construction)

Let M be maximum matching.

Define: Z = vertices not covered by M
        X_Z = vertices reachable from Z via alternating paths
        (alternating: edges alternate between E\\M and M)

Let:
- S = X ∩ X_Z
- T = Y \\ X_Z

Claim 1: C = S ∪ T is vertex cover.

Proof: Consider edge e = (x, y) with x ∈ X, y ∈ Y.

Case 1: e ∈ M.
If x ∈ S, done.
If x ∉ S, then x ∉ X_Z.
So y ∉ X_Z (else x reachable via e).
Thus y ∈ T, so e covered.

Case 2: e ∉ M.
If x ∈ S, done.
If x ∉ S, so x ∉ X_Z.
If y ∈ X_Z, then x ∈ X_Z via e (contradiction).
So y ∉ X_Z, thus y ∈ T.

Therefore C is vertex cover.

Claim 2: |C| = |M|.

Proof: Every vertex in S is matched (else augmenting path exists).
Every vertex in T is matched (else reachable from Z, contradiction).
Matching edges: some have both endpoints in C (connecting S to T),
               others have exactly one endpoint in C.

Actually, simpler:
Vertices in S matched to vertices in Y \\ T.
Vertices in Y \\ T matched to vertices in X \\ S (else in S).

By construction: |S| + |T| = |M|.

Combined: |M| = |C| ≤ min cover size ≤ |C| = |M|.

Therefore maximum matching = minimum vertex cover. QED`,
    scoringCriteria: {
      inequality_1: 20,
      construction: 35, // Key difficulty
      vertex_cover_proof: 30,
      size_equality: 15
    }
  },

  // ==================== DIFFERENTIAL EQUATIONS & TOPOLOGY (5 problems each) ====================

  {
    id: 'DE-001',
    domain: 'Differential Equations',
    difficulty: 'Expert',
    prompt: `Solve the Bessel equation: x²y'' + xy' + (x² - n²)y = 0 for integer n ≥ 0. Find the first three terms of the series solution.`,
    idealOutput: `Bessel's Equation: x²y'' + xy' + (x² - n²)y = 0

Solution via Frobenius method:

Assume: y = ∑_{k=0}^{∞} aₖ x^{k+r}

Then: y' = ∑_{k=0}^{∞} (k+r)aₖ x^{k+r-1}
      y'' = ∑_{k=0}^{∞} (k+r)(k+r-1)aₖ x^{k+r-2}

Substituting:
∑ (k+r)(k+r-1)aₖ x^{k+r} + ∑ (k+r)aₖ x^{k+r} + ∑ aₖ x^{k+r+2} - n²∑ aₖ x^{k+r} = 0

Collecting x^{r} terms (indicial equation):
[r(r-1) + r - n²]a₀ = 0
r² - n² = 0, so r = ±n.

For r = n:

Coefficient of x^{n+k}:
[(n+k)² - n²]aₖ + aₖ₋₂ = 0
[(n+k-n)(n+k+n)]aₖ = -aₖ₋₂
aₖ = -aₖ₋₂ / [k(2n+k)]

Recurrence: aₖ = -aₖ₋₂ / [k(2n+k)] for even k, odd aₖ = 0.

Setting a₀ = 1/[2ⁿ n!]:

a₂ = -a₀ / [2(2n+2)] = -1 / [2^{n+1}(n+1)! × 2]

a₄ = -a₂ / [4(2n+4)] = 1 / [2^{n+2} × 2 × (n+2)!]

General: a₂ₘ = (-1)^m / [2^{n+2m} m! (n+m)!]

Bessel function of first kind:
J_n(x) = ∑_{m=0}^{∞} [(-1)^m / (m!(n+m)!)] × (x/2)^{n+2m}

First three terms:
J_n(x) ≈ (x/2)^n / n! - (x/2)^{n+2} / [1!(n+1)!] + (x/2)^{n+4} / [2!(n+2)!]

For n=0:
J₀(x) ≈ 1 - x²/4 + x⁴/64

Answer: J_n(x) with first three terms as above.`,
    scoringCriteria: {
      frobenius: 30,
      indicial_equation: 20,
      recurrence: 30,
      series_form: 20
    }
  },

  {
    id: 'DE-002',
    domain: 'Differential Equations',
    difficulty: 'Expert',
    prompt: `Prove existence and uniqueness for the IVP: y' = f(t,y), y(t₀) = y₀, where f is Lipschitz in y. Use Picard iteration.`,
    idealOutput: `Picard-Lindelöf Theorem:

Assumptions:
1. f: [t₀-a, t₀+a] × [y₀-b, y₀+b] → ℝ continuous
2. f Lipschitz in y: |f(t,y₁) - f(t,y₂)| ≤ L|y₁ - y₂|

Picard iterations:
y₀(t) = y₀
yₙ₊₁(t) = y₀ + ∫_{t₀}^t f(s, yₙ(s)) ds

Proof of convergence:

Step 1: Define Mφ(t) = y₀ + ∫_{t₀}^t f(s, φ(s)) ds

Show {yₙ} converges uniformly on [t₀, t₀+h] for small h.

Step 2: Bound differences.
|y₁(t) - y₀| ≤ ∫_{t₀}^t |f(s, y₀)| ds ≤ M|t - t₀|

where M = max|f(t,y)|.

|y₂(t) - y₁(t)| ≤ ∫_{t₀}^t |f(s, y₁(s)) - f(s, y₀)| ds
                ≤ ∫_{t₀}^t L|y₁(s) - y₀| ds
                ≤ LM ∫_{t₀}^t |s - t₀| ds
                = LM|t - t₀|²/2

By induction:
|yₙ₊₁(t) - yₙ(t)| ≤ ML^n|t - t₀|^{n+1} / (n+1)!

Step 3: Series convergence.
∑|yₙ₊₁(t) - yₙ(t)| ≤ M ∑ [L|t - t₀|]^n / n! = M[e^{L|t-t₀|} - 1]

This converges, so {yₙ} Cauchy, thus converges uniformly to y(t).

Step 4: y(t) is solution.
Taking limit in yₙ₊₁(t) = y₀ + ∫_{t₀}^t f(s, yₙ(s)) ds:
y(t) = y₀ + ∫_{t₀}^t f(s, y(s)) ds

Differentiating: y'(t) = f(t, y(t)) with y(t₀) = y₀. ✓

Uniqueness:
Let y₁, y₂ be solutions.
|y₁(t) - y₂(t)| = |∫_{t₀}^t [f(s,y₁(s)) - f(s,y₂(s))] ds|
                ≤ L ∫_{t₀}^t |y₁(s) - y₂(s)| ds

By Grönwall: |y₁(t) - y₂(t)| ≤ 0 × e^{L|t-t₀|} = 0.

Therefore y₁ = y₂. QED`,
    scoringCriteria: {
      picard_setup: 20,
      convergence_proof: 40, // Key difficulty
      solution_verification: 20,
      uniqueness: 20
    }
  },

  {
    id: 'TOP-001',
    domain: 'Topology',
    difficulty: 'Expert',
    prompt: `Prove that [0,1) is not compact using the open cover definition. Then prove [0,1] is compact.`,
    idealOutput: `Part 1: [0,1) is not compact

Definition: Space X compact if every open cover has finite subcover.

Proof [0,1) not compact:

Consider open cover: 𝒰 = {[0, 1 - 1/n) : n ≥ 2}

Each set is open in [0,1) (intersection of [0,1) with open set in ℝ).

Coverage: For any x ∈ [0,1), have x < 1.
So x < 1 - 1/n for some n (by Archimedean property).
Thus x ∈ [0, 1 - 1/n).

No finite subcover: For any finite collection {[0, 1-1/nᵢ)]},
let N = max{nᵢ}.
Then 1 - 1/(N+1) ∉ any set in finite collection.

Therefore [0,1) not compact.

Part 2: [0,1] is compact

Proof: Let 𝒰 be an open cover of [0,1].

Let S = {x ∈ [0,1] : [0,x] can be covered by finitely many sets from 𝒰}.

Claim: S = [0,1].

Step 1: 0 ∈ S (0 ∈ some U ∈ 𝒰, so {U} covers [0,0]).

Step 2: S is closed.
Let xₙ → x with xₙ ∈ S.
For each xₙ, ∃ finite subcover Fₙ of [0,xₙ].
x ∈ some U ∈ 𝒰, U open, so (x-ε, x+ε) ⊂ U.
For large n, xₙ > x - ε.
So Fₙ ∪ {U} covers [0,x].
Thus x ∈ S.

Step 3: S is open.
Let x ∈ S, so [0,x] has finite subcover F.
x ∈ some U ∈ 𝒰, U open, so (x-ε, x+ε) ⊂ U.
Then F covers [0, x+ε/2].
So (x, x+ε/2) ⊂ S.

Step 4: [0,1] connected, S ≠ ∅, S open and closed.
So S = [0,1].

In particular, 1 ∈ S, so [0,1] has finite subcover.

Therefore [0,1] compact. QED`,
    scoringCriteria: {
      noncompact_proof: 35,
      cover_construction: 20,
      compact_proof: 35,
      connectedness: 10
    }
  },

  {
    id: 'TOP-002',
    domain: 'Topology',
    difficulty: 'Expert',
    prompt: `Prove that a continuous bijection from a compact space to a Hausdorff space is a homeomorphism.`,
    idealOutput: `Theorem: f: X → Y continuous bijection, X compact, Y Hausdorff ⟹ f homeomorphism.

Need to show: f⁻¹ continuous (i.e., f is closed map).

Proof:

Let C ⊆ X be closed.

Step 1: C is compact.
Since X compact and C closed, C is compact (closed subset of compact is compact).

Step 2: f(C) is compact.
f continuous, C compact ⟹ f(C) compact (continuous image of compact is compact).

Step 3: f(C) is closed in Y.
Y is Hausdorff, f(C) compact ⟹ f(C) closed (compact subset of Hausdorff is closed).

Therefore: f maps closed sets to closed sets, i.e., f is closed map.

Conclusion: f closed and bijective ⟹ f⁻¹ continuous ⟹ f homeomorphism.

QED

Key facts used:
1. Closed subset of compact space is compact
2. Continuous image of compact space is compact
3. Compact subset of Hausdorff space is closed
4. Closed bijection has continuous inverse

Example application:
[0, 2π) and S¹ are homeomorphic via t ↦ e^{it}.
But direct map not homeomorphism (domain not compact).
Instead use [0, 2π] → S¹, which is bijection from compact to Hausdorff.`,
    scoringCriteria: {
      closed_subset: 20,
      continuous_image: 25,
      hausdorff_property: 35, // Key insight
      conclusion: 20
    }
  },

  {
    id: 'TOP-003',
    domain: 'Topology',
    difficulty: 'Expert',
    prompt: `Prove that ℚ (rationals with subspace topology from ℝ) is not locally compact.`,
    idealOutput: `Theorem: ℚ is not locally compact.

Definition: X locally compact if every point has a compact neighborhood.

Proof by contradiction:

Assume ℚ is locally compact.

Then 0 has compact neighborhood K (compact subset with 0 ∈ Int(K)).

So ∃ open set U ⊆ ℚ with 0 ∈ U ⊆ K.

Since U open in ℚ, U = V ∩ ℚ for some open V ⊆ ℝ.
Since 0 ∈ U, ∃ ε > 0 with (-ε, ε) ∩ ℚ ⊆ U ⊆ K.

Consider: Cₙ = K ∩ [-ε + 1/n, ε - 1/n] for n large enough.

Each Cₙ is closed in K (closed set in ℝ intersected with K).
{Cₙ} is decreasing: Cₙ₊₁ ⊆ Cₙ.

Claim: ∩Cₙ = ∅.

Proof of claim:
If x ∈ ∩Cₙ, then x ∈ K ∩ ℚ and -ε < x < ε for all intervals.
So x ∈ K and |x| < ε.
But for any rational x with |x| < ε, we have |x| > ε - 1/n for some n.
So x ∉ Cₙ for this n.
Contradiction.

Therefore ∩Cₙ = ∅.

But K compact and {Cₙ} nested closed sets with empty intersection.
This contradicts finite intersection property of compact spaces:
(For compact K, if {Cᵢ} closed with finite intersection property, then ∩Cᵢ ≠ ∅).

Therefore ℚ is not locally compact. QED

Intuition: ℚ has "holes" (irrationals), preventing any neighborhood of 0 from being contained in compact set.`,
    scoringCriteria: {
      setup: 20,
      neighborhood_construction: 25,
      finite_intersection: 35, // Key property
      contradiction: 20
    }
  },

  // ==================== PROBABILITY & ADVANCED CALCULUS (5 problems each) ====================

  {
    id: 'PROB-001',
    domain: 'Probability',
    difficulty: 'Expert',
    prompt: `Prove the Strong Law of Large Numbers: If X₁, X₂, ... are i.i.d. with E[|X₁|] < ∞, then Sₙ/n → E[X₁] almost surely.`,
    idealOutput: `Strong Law of Large Numbers (SLLN):

Xᵢ i.i.d., E[|X₁|] < ∞, Sₙ = X₁ + ... + Xₙ
Then P(Sₙ/n → μ) = 1, where μ = E[X₁].

Proof (Etemadi's method for bounded case):

Assume |Xᵢ| ≤ M (general case via truncation).

Step 1: Fourth moment inequality.
E[(Sₙ - nμ)⁴] = E[∑ᵢ,ⱼ,ₖ,ₗ (Xᵢ-μ)(Xⱼ-μ)(Xₖ-μ)(Xₗ-μ)]

Most terms vanish (independence).
Nonzero when indices have specific patterns.
After calculation: E[(Sₙ - nμ)⁴] ≤ Cn² for some C.

Step 2: Apply Markov's inequality.
For ε > 0:
P(|Sₙ - nμ| > nε) ≤ E[(Sₙ - nμ)⁴] / (nε)⁴ ≤ C / (n²ε⁴)

Step 3: Borel-Cantelli lemma.
∑ₙ P(|Sₙ - nμ| > nε) ≤ ∑ₙ C/(n²ε⁴) < ∞

By Borel-Cantelli:
P(|Sₙ - nμ| > nε infinitely often) = 0

So P(|Sₙ - nμ| > nε for only finitely many n) = 1.

Step 4: Conclusion.
For any ε > 0, P(Sₙ/n → μ) = 1 (convergence along subsequence).

By sub-additivity and monotonicity:
P(Sₙ/n → μ) = 1.

QED

Note: General proof uses Kolmogorov's maximal inequality and truncation.

Contrast with Weak Law: Sₙ/n → μ in probability (weaker than a.s.).`,
    scoringCriteria: {
      moment_calculation: 30,
      markov_inequality: 25,
      borel_cantelli: 35, // Key step
      conclusion: 10
    }
  },

  {
    id: 'PROB-002',
    domain: 'Probability',
    difficulty: 'Expert',
    prompt: `Prove the Central Limit Theorem using characteristic functions: If X₁, X₂, ... are i.i.d. with mean μ and variance σ², then (Sₙ - nμ)/(σ√n) ⇒ N(0,1).`,
    idealOutput: `Central Limit Theorem (CLT):

Let Xᵢ i.i.d. with E[X] = μ, Var(X) = σ².
Then Zₙ = (Sₙ - nμ)/(σ√n) ⇒ N(0,1).

Proof via characteristic functions:

Step 1: Standardize.
Let Yᵢ = (Xᵢ - μ)/σ, so E[Yᵢ] = 0, Var(Yᵢ) = 1.
Then Zₙ = (Y₁ + ... + Yₙ)/√n.

Step 2: Characteristic function of Y.
φᵧ(t) = E[e^{itY}] = E[1 + itY - t²Y²/2 + o(t²)]
      = 1 + it·0 - t²·1/2 + o(t²)
      = 1 - t²/2 + o(t²)

Step 3: CF of Zₙ.
Zₙ = (Y₁ + ... + Yₙ)/√n

φ_{Zₙ}(t) = E[e^{it(Y₁+...+Yₙ)/√n}]
          = E[e^{itY₁/√n}]^n  (independence)
          = [φᵧ(t/√n)]^n
          = [1 - t²/(2n) + o(1/n)]^n

Step 4: Take limit.
lim_{n→∞} φ_{Zₙ}(t) = lim_{n→∞} [1 - t²/(2n) + o(1/n)]^n
                    = e^{-t²/2}

This is CF of N(0,1).

Step 5: Lévy continuity theorem.
If φₙ(t) → φ(t) pointwise and φ continuous at 0,
then Xₙ ⇒ X where φ_X = φ.

Since e^{-t²/2} is CF of N(0,1):
Zₙ ⇒ N(0,1).

QED

Key lemma: For random variable with E[X] = 0, Var(X) = 1:
φ_X(t) = 1 - t²/2 + o(t²)

This follows from Taylor expansion and dominated convergence.`,
    scoringCriteria: {
      standardization: 15,
      taylor_expansion: 25,
      characteristic_product: 30,
      limit_calculation: 30
    }
  }*/
];

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY required');
    process.exit(1);
  }

  // Convert benchmark to test suite format
  const testSuite = MATHEMATICAL_BENCHMARK.map(problem => ({
    id: problem.id,
    prompt: `${problem.prompt}

IMPORTANT: Provide a complete mathematical solution with rigorous proofs and detailed reasoning.
Show all work and explain your mathematical reasoning clearly.`,
    idealOutput: problem.idealOutput,
    scoringType: 'numeric',
    scoringCriteria: `Mathematical problem: ${problem.domain} - ${problem.difficulty} level. ${Object.entries(problem.scoringCriteria).map(([k, v]) => `${k}: ${v}pts`).join(', ')}`
  }));

  console.log('🎓 Elite Mathematical Reasoning Benchmark');
  console.log('='.repeat(70));
  console.log(`📊 Total Problems: ${testSuite.length}`);
  console.log(`🏆 Domains: Number Theory, Analysis, Algebra, Combinatorics, Topology, Probability`);
  console.log(`🎯 Difficulty: Expert (Professional Mathematician Level)`);
  console.log('='.repeat(70) + '\n');

  const verifier = new AgentVerifier({
    testSuite,
    anthropicApiKey: apiKey,
    model: 'claude-haiku-4-5',
    scorerConfig: {
      model: 'claude-haiku-4-5'
    },
    sdkOptions: {
      maxTurns: 1,
      systemPrompt: `You are an expert mathematician. Provide rigorous proofs with clear mathematical reasoning.
Show all steps, explain your logic, and ensure mathematical precision in your solutions.`
    }
  });

  const result = await verifier.runAndProve();

  console.log('\n📊 Dual-Proof Results:');
  console.log('\nFull Dataset (All Mathematical Problems):');
  console.log('  Score:', result.score.toFixed(2) + '/100');
  console.log('  Tests:', result.numTests);
  console.log('  Merkle Root:', result.merkleRoot.substring(0, 20) + '...');

  console.log('\nPublic Subset (Transparent):');
  console.log('  Score:', result.subset.score.toFixed(2) + '/100');
  console.log('  Tests:', result.subset.numTests, `(${((result.subset.numTests / result.numTests) * 100).toFixed(0)}%)`);
  console.log('  Merkle Root:', result.subset.merkleRoot.substring(0, 20) + '...');

  console.log('\n📈 Performance Analysis:');
  console.log(`  Full Dataset Score: ${result.score.toFixed(2)}/100`);
  console.log(`  Public Subset Score: ${result.subset.score.toFixed(2)}/100`);
  console.log(`  Score Difference: ${Math.abs(result.score - result.subset.score).toFixed(2)} points`);
  console.log('  Duration:', (result.executionSummary.totalDuration / 1000).toFixed(1) + 's');

  // Domain breakdown
  console.log('\n📚 Domain Breakdown (from public tests):');
  const domainStats = {};
  result.subset.publicData.forEach(test => {
    const problem = MATHEMATICAL_BENCHMARK.find(p => p.id === test.testId);
    if (problem) {
      if (!domainStats[problem.domain]) {
        domainStats[problem.domain] = { scores: [], count: 0 };
      }
      domainStats[problem.domain].scores.push(test.score);
      domainStats[problem.domain].count++;
    }
  });

  Object.entries(domainStats).forEach(([domain, stats]) => {
    const avg = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
    console.log(`  ${domain}: ${avg.toFixed(1)}/100 (${stats.count} problems)`);
  });

  console.log('\n🔍 Sample Public Test Results:');
  for (const test of result.subset.publicData.slice(0, 3)) {
    const problem = MATHEMATICAL_BENCHMARK.find(p => p.id === test.testId);
    console.log(`\n  ${test.testId} - ${problem?.domain}:`);
    console.log(`    Prompt: ${test.prompt.substring(0, 80)}...`);
    console.log(`    Agent Output: ${test.agentOutput.substring(0, 120)}...`);
    console.log(`    Score: ${test.score}/100`);
  }

  console.log('\n📦 Generated Files:');
  console.log('  • dual-proof-package-*.json (complete data)');
  console.log('  • shareable-dual-proof-*.json (public proof)');
  console.log('\n  The shareable proof includes:');
  console.log('    ✓ Public test details (problems, solutions, scores)');
  console.log('    ✓ Full dataset score (proven via ZK-SNARK)');
  console.log('    ✓ Cryptographic binding between public and private tests');
  console.log('\n🎉 Mathematical benchmark complete! Agent ready for platform registration.');
}

main().catch(console.error);