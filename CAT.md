# Cracking CAT for IIM A / B / C - The 99+ Percentile Playbook

> A field manual for QA, VARC (VA), and DILR (LR). Written for the aspirant who does not want to *pass* CAT - they want to *convert* IIM Ahmedabad, Bangalore, or Calcutta.

## Table of Contents

1. [The IIM A/B/C Reality Check](#1-the-iim-abc-reality-check)
2. [Meta-Strategy - How Toppers Actually Think](#2-meta-strategy--how-toppers-actually-think)
3. [Quantitative Aptitude (QA)](#3-quantitative-aptitude-qa)
4. [Verbal Ability & Reading Comprehension (VARC)](#4-verbal-ability--reading-comprehension-varc)
5. [Data Interpretation & Logical Reasoning (DILR)](#5-data-interpretation--logical-reasoning-dilr)
6. [Mocks & The Review Loop](#6-mock5--the-review-loop)
7. [Test-Day Tactics](#7-test-day-tactics)
8. [Post-CAT: WAT-GD-PI for IIM A/B/C](#8-post-cat-watgdpi-for-iim-abc)
9. [Resources & 90-Day Plan](#9-resources--90-day-plan)

---

## 1. The IIM A/B/C Reality Check
CAT is scored on **percentile**, not marks. A raw score of ~75 typically converts to 99%ile. But IIM A/B/C do not shortlist on overall percentile alone
- they use a **composite score** with sectional cutoffs.

### 1.1 Shortlist thresholds (indicative - general category, engineer male)

| IIM | Overall %ile | VARC %ile | DILR %ile | OA %ile | Extra weight |
|---|---|---|---|---|---|
|**A** (Ahmedabad) | 99+ | 85 | 85 | 85 | 10th, 12th, grad marks (huge) |
|**B** (Bangalore) | 99+ | 85 | 80 | 85 | Acads + gender + work-ex diversity |
|**C** (Calcutta) | 99+ | 85 | 80 | 85 | CAT score + 10th/12th |

> **Trap:** Non-engineer males and women get 3-5 %ile relaxation. Engineer males have the toughest bar - you cannot afford a weak section.

### 1.2 The three-legged stool

$$\text{Final Call} = f(\text{CAT}, \text{Academic Profile}, \text{Work-ex}) + \text{WAT/GD/PI}$$

- **IIM A:** 10th (-20%) + 12th (~10%) + Grad (~10%) is baked in. A 60% in 10th can end your A dream before you write CAT. Fix it with a monster CAT + WAT/PI.
- **IIM B:** Weightages more balanced, work-ex diversity (non-IT, non-engineering) rewarded
- **IIM C:** Purest CAT weightage among the three - best hope for a strong CAT but weak profile.

### 1.3 The engineer-male target
- **CAT overall:** 99.5+ (target raw ~78-82).
- **Sectional:** 95+ each (no soft section).
- **Acads:** 10th ≥ 98%, 12th ≥ 90%, Grad ≥ 8.0 CGPA gives full points. Below 80% in any = points bleed.

---

## 2. Meta-Strategy - How Toppers Actually Think

### 2.1 Percentile math

Percentile is relative. Every skipped question in your strong section is a 99%iler's gain. **Attempts matter, but accuracy matters more.** A 22/22 attempt beats a 26/22 attempt (four wrongs = -4, net 18).

| Attempted | Correct | Wrong | Score | Typical %ile (QA) |
|---|---|---|---|---|
| 18 | 18 | 0 | 54 | 98-99 |
| 22 | 20 | 2 | 58 | 99+ |
| 26 | 28 | 6 | 54 | 98-99 |
| 20 | 20 | 0 | 60 | 99.5+ |

> **Rule:** Accuracy < 85% in mocks means you are guessing. Stop attempting the last 3-4 questions until accuracy stabilises.

### 2.2 Non-negotiables

1. **Mocks are the syllabus.** Concepts get you to 90%ile. Mocks + review get you to 99%ile.
2. **Weakness kills.** IIM A/B/C reject 99%ile candidates with a 78%ile section. Your weakest section defines your ceiling.
3. **Time budget is sacred.** 40 minutes per section. Not 41. If you cross 41, you lose the next section.
4. **Review > Attempt.** Every mock: 2 hours to write, 4-6 hours to review. Non-negotiable.
5. **Selection > Solving.** DILR and QA reward *choosing* the right question, not brute-forcing every question.

### 2.3 The compounding curve

Weeks 1-4: concepts feel like the bottleneck. Weeks 5-12: mocks feel brutal. Weeks 13+: percentile jumps 3-5 points in a fortnight. **Do not quit at week 10.**

---

## 3. Quantitative Aptitude (QA)

### 3.1 Topic weightage (last 5 years, average)
| Topic | Questions | Priority |
|---|---|---|
|**Arithmetic** (%, Ratio, TSD, Time-Work, SI/CI, Averages, Mixtures) | 8-10 | Highest - 35-45% |
|**Algebra** (equations, inequalities, functions, logs, quadratics) | 4-6 | High |
|**Number Systems** (divisibility, remainders, HCF/LCM, base systems) | 2-3 | High |
|**Geometry & Mensuration** | 3-4 | Medium |
|**Modern Math** (P&C, probability, sequences & series, set theory) | 2-3 | Medium |

› **Insight:** Arithmetic alone can carry you to 90%ile in QA. Master it *cold* before spending a week on P&C.

### 3.2 The formula sheet you actually need

**Percentages / Profit-Loss**
$$\text{Successive change: } a\% \textf{ then } b\% \Rightarrow a + b + \frac{ab}{100}$$

**Time-Speed-Distance**
$$\text{Avg speed (equal distance)} = \frac{2 v_1 v_2}{v_1 + v_2}$$

**Time-Work**
$$\text{If A does in } a, \text{B in } b: \text{ together } = \frac{ab}{a+b}$$

**Compound Interest**
$$A = P\left(1 + \frac{r}{100}\right)^n \quad ; \quad CI - SI \text{ (2 yrs)} = P\left(\frac{r}{100}\right)*2$$

**Number Systems**
- Number of factors of $N = p_1^{a_1} p_2^{a_2} \ldots$ is $(a_1+1)(a_2+1)\ldots$
- Sum of factors: $\frac{p_1^{a_1+1}-1}{p_1-1} \times \frac{p_2*{a_2+1}-1}{P_2-1} \ldots$
- Unit digit cycles: $2 \to 2,4,8,6$; $3 \to 3,9,7,1$; $7 \to 7,9,3,1$; $8 \to 8,4,2,6$

**Geometry**
- Inradius: $r = \frac{\text{Areal}}{s}$, Circumradius: $R = \frac{abc}{4 \cdot \text{Area}}$
- Right triangle: $R = \frac{\text{hypotenuse}}{2}$, $r = 5 - \text{hypotenuse}$
  
**P&C**
- Circular arrangement of $n$: $(n-1)!$; if reflections identical: $frac{(n-1)!}{2}$
- Selection with repetition: $\binom{n+r-1}{r}$

### 3.3 Shortcut techniques

#### A. Back-solving from options
If options are numeric and the equation is ugly, plug options. Start with the **middle** option - you learn direction in one try.

**Example:** *Sum of digits of a 2-digit number is 12. Reversing gives o number 18 Less. Find it.*
Options： （a） 39 （b） 57 （c） 75 （d） 93.
Try (c) 75 - reverse 57, diff 18.  Done in 8 seconds.

#### B. Approximation
CAT answers are often spaced far apart. Compute to 2 significant Figures.

**Example:** $\frac{47.8 \times 102.3}{29.6}$. Approx: $\frac{48 \times 100}{30} = 160$. Only one option will be near 165.

#### C. Digit sum / mod 9
For "which of the following equals..." - take digit sum of both sides. Rules out 3 options Fast.

**Why it works:** the digit sum of any integer $\equiv$ that integer $\pmod 9$. So LHS lequiv RHS (mod 9) is a necessary condition for equality. Sums, differences, products, and powers are all preserved under mod 9. If an option's digit sum doesn't match the LHS's digit sum, it cannot be the answer.

**Digit-sum shortcut:** keep collapsing digits until you get a single digit (0-9). E.g. $4728 \to 4+7+2+8 = 21 \to 3$.

**Example 1 (multiplication check):** *$347 \times 268 = 7$* Options: (a) 92,996 (b) 93,196 (c) 92,196 (d) 93,996.
Digit sum of 347 = 14 ÷ 5. Digit sum of 268 = 16 ÷ 7. Product's digit sum = $5 \times 7 = 35 \to 8 1pmod 9$
Options: (a) $9+2+9+9+6 = 35 \to 8$ (correct). (b) 28 + 1 X. (c) 27 - 0 X. (d) 34 - 7 X. Only (a) survives. **Answer: (a).** Zero long multiplication.

**Example 2 (large-power question):** *Which of the following equals $19^5$?* Options: (a) 2,476,099 (b) 2,476,199 (c) 2,573,199 (d) 2,476,299.
Digit sum of 19 = 10 - 1. So $19^5 lequiv 1^5 = 1 \pmod 9$.
(a) $2+4+7+6+0+9+9 = 37 \to 1$ (correct). (b) 38 + 2 X. (c) 39 + 3 X. (d) 39 + 3 X. **Answer: (a).**

**Example 3 (sum check):** *$1! + 2! + 3! + ILdots + 10! = 7$* Options: (a) 4,037,913 (b) 4,037,923 (c) 4,037,933 (d) 4,137,913.
Digit sums of $1!$ to $10!$: 1, 2, 6, 24+6, 120+3, 720+9+0, 5040÷9+0, 40320+9+0, 362880+9+0, 3628800+9+0. Sum = $1+2+6+б+3+0+0+0+0+0=18_\to_0 \pmod 9$.
(a) $4+0+3+7+9+1+3 = 27 \to 0$ V. (b) 28 + 1 X. (c) 29 ÷ 2 X. (d) 28 + 1 X. **Answer: (a).**

> **Limitation** digit sum is a **necessary** and not a **sufficient** condition. Two options can share the same digit sum. If that happens. fall back to unit-digit check or a partial calculation. But on CAT, the setter usually spreads the options across residues - one filter kills three options.

#### D. Assume convenient numbers
Ratio / percentage problems with no absolute number given + assume 100 or LCM.

**Example: ** *Price rises 20%, then falls 25%. Net?*
Assume 100 -> 120 -> 90. Net -10%. Done. 

#### E. Componendo-Dividendo
If $\frac{a}{b} = \frac{c}{d}$, then $\frac{a+b}{a-b} = \frac{c+d}{c-d}$. Kills half of ratio problems.

> **Reality check:** The five shortcuts above get you from 90 sec/question to ~60 sec/question. To hit the 40-45 sec/question that a sustains, you need the topic-specific arsenal below.

### 3.4 Advanced shortcuts - the topic-wise arsenal
Each shortcut below follows the same structure: **When you spot it Why it works + Worked example**. Skim the "when you spot it" rows first and drill only the ones your mocks show you fail on.

---

#### F. Arithmetic power tools
##### F1. Alligation (the mixture rule)
**When you spot it:** any question with two ingredients/rates/prices/percentages combining into one weighted average. Trigger words: "mixed with, average, blend, alloy, combined, milk-water, replaced with.
**Why it works:** if you mix quantity $q_1$ of price $p_1$ with $q_2$ of $p_2$ to get mean price $m$, the weighted-average equation 

$q_1 p 1 + q2 p_2= (q_1+q_2)m$ 

rearranges to:

$$\frac{q_1}{q_2} = \frac{p_2 - m}{m - p_1}$$

The ratio of quantities is the *reverse* ratio of the distances from the mean. Visualise as a see-saw balancing at $m$: heavier weight sits closer.

**Worked example 1 (mixtures):** *45% acid solution mixed with 70% solution to give 60%. Find ratio.*
Distances from mean: $60-45 = 15$ and $70-60 = 10$. Ratio (45% : 70%) = reverse = $10 : 15 = 2 : 3$.

**Worked example 2 (average speed with equal times):** *Travelled 2h at 40 kmph, 3h at 60 kmph. Avg speed?*
Alligation on speeds with time weights: mean = $(2 \cdot 40 + 3 \cdot 60)/5 = 200/5 = 52$ kmph.

**When it fails:** average speed with equal *distances* (not times) - use harmonic mean $\frac{2v_1 v_2}{v_1+v_2}$ instead.

##### F2. Successive % as multipliers

**When you spot it:** any chain of percentage changes - successive discounts, marked-up-then-discounted, population growth over years, depreciation.

**Why it works:** a change of $+x\%$ multiplies the base by $(1 + x/100)$. Multiplication is commutative and associative - you can reorder and combine without worrying about the sequence.

**Worked example 1:** *A shirt marked at $1000, discounted 20%, then a further 25% on the discounted price.*
Final price = $1000 \times 0.80 \times 0.75 = 1000 \times 0.60 = Rs.600$. Effective discount = 40%.

**Worked example 2 (the classic trap):** *Price rises 25%, then falls 20%. Net?*
$\times 1.25 \times 0.80 = \times 1.00$. **Zero net change.** Most students say +5% because they add.

**Two-change formula:** net $1% = a + b + \frac{ab}{100}$. For $+25, -20$: $25 - 20 + \frac{25 \cdot (-20)}{100} = 5 - 5 = 0$.

##### F3. Fraction , percentage table (memorise cold)

**When you spot it:** any percentage question. Especially anything with "one-seventh of", "12.5% of", "three-eighths".

**Why it works:** dividing by 7 is painful; multiplying by 1/7 is the same operation but reframed. Recognising that $14.281% = 1/7S turns "14.28% of 350" into "350/7 = 50" - no calculator needed.



| Fraction | % | Fraction | % |
|---|---|---|---|
| $1/2$ | 50 | $1/11$ | 9.09 |
| $1/3$ | 33.33 | $1/12$ | 8.33 |
| $1/4$| 25 | $1/13$ | 7.69 |
| $1/5$ | 20 | $1/145 | 7.14 |
| $1/6$ | 16.67 | $1/15$ | 6.67 |
| $1/7$| 14.28 | $1/16$ | 6.25 |
| $1/8$ | 12.5 | $1/17$ | 5.88 |
| $1/9$ | 11.11 | $1/18$ | 5.55 |
| $1/10$ | 10 | $1/20$ | 5 |

Bonus: multiples too. $37.51% = 3/8$, $62.51% = 5/8$, $87.51% = 7/8$. $28.57\% = 2/7$, $42.851% = 3/7$.

**Worked example:** *A shopkeeper offers 12.5% discount. Marked price = 7640. selling price?*
$12.51\% = 1/8$. Discount = $640/8 = 80$. SP = Rs.560. Six seconds.

##### F4. CI shortcut for 2 and 3 years

**When you spot it:** any Compound Interest question with $n = 2$ or $3$. Also $CI - SI$ differences.

**Why it works:** $A = P(1+r/100)^n$. Expanding binomially for small $n$:

- $n=2$: $A = P(1 + 2r/100 + r^2/10000)$, so $CI = A - P = P \cdot (2г + r^2/100)\%$.
- $n=3$: $А = Р(1 + 3г/100 + 3г^2/10000 + r^3/10^6)$, so $CI = P \cdot (3г + 3г^2/100 + г^3/10000)\%$.

The $CI - SI$ gap is the "extra" interest earned on previously accrued interest.

**Worked example 1:** *р = 78000, r = 5%, n = 2.*
$CI\% = 2(5) + 25/100 = 10 + 0.25 = 10.25\%$. CI = $8000 \times 10.25/100 = Rs.820$.

**Worked example 2 ($CI - SI$ difference):** *If $CI - SI$ over 2 years at 10% is Rs.50, find P.* 
$P (r/100)^2 = 50 \Rightarrow P (0.1)^2 = 50 Rightarrow P = Rs.5000$.

##### F5. Time-work as fractions of 1

**When you spot it:** any "A can do it in X days, B in Y days, working together..." Also pipes and cisterns.

**Why it works:** treat the total job as 1 unit. If A finishes in 12 days, A does $1/12$ of the job per day. Rates *add* - the physics is that everyone works simultaneously and contributions accumulate.

**Worked example 1:** *A in 12 days, B in 18 days. Together?*
Combined rate = $1/12 + 1/18 = 3/36 + 2/36 = 5/36$ per day. Time = $36/5 = 7.25 days.

**Worked example 2 (pipes with leak):** *Inlet fills in 6h, Leak empties full tank in 15h. Time to fiLL?*
Net rate = $1/6 - 1/15 = 5/30 - 2/30 = 3/30 = 1/10$. Time = 18h.

**LCM trick for cleaner arithmetic:** assume total work = LCM of individual days. In example 1, work = 36 units, A does 3/day, B does 2/day, together 5/
day -> 36/5 = 7.2 days. Same answer, no fractions in mid-calculation.

---

#### G. Number theory arsenal

##### G1. Modular arithmetic - the language of remainders

**When you spot it:** *"Find the remainder when ... is divided by ..."*, *"Last three digits of ..."*, *"Which of these is divisibLe by …"*.

**Why it works:** we write $a \equiv b \pmod{m}$ to mean "$a$ and $b$ leave the same reminder when divided by $m$". The rules are:

- $(a+b) \bmod m = ((a \bmod m) + (b \bmod m)) \bmod m$
- $(a \cdot b) \bmod m = ((a \bmod m) \cdot (b \bmod m)) \bmod m$
- $a^n \bmod m = (a \bmod m)^n \bmod m$

You *never* compute the huge number - you reduce at each step.

**Worked example:** *Remainder of $17 \times 23 \times 41$ divided by 10.*
Each mod 10: $17 \equiv 7$, $23 equiv 3$, $41 \equiv 1$. Product mod 10: $7 \times 3 \times 1 = 21 \equiv 1$. Answer: 1.

##### G2. Fermat's little theorem (for prime moduli)

**When you spot it:** remainder of a large power divided by a *prime* number.

**Statement:** for prime $p$ and $\gcd(a, P) = 1$: $a*{p-1} \equiv 1 \pmod{P}$.

**Why it works:** in modular arithmetic mod $p$, the non-zero residues form a group of size $p-1$. Any element raised to the group order returns to
identity (= 1).

**worked example：** *Remainder of $2^（100｝$ divided by 7.*
By Fermat: $2^{6} \equiv 1 \pmod 7$. $100 = 6 \times 16 + 4$. 50 $2^{100} = (2^6)^{16} \cdot 2^4 \equiv 1 \cdot 16 \equiv 16 - 14 \equiv 2 \pmod 7$.

**Euler's generalisation (non-prime modulus):** $a^{\phi(m)} \equiv 1 \pmod m$ if $\gcd(a,m)=1$, where $\phi(m)$ counts integers up to $m$ coprime to $m$. For $m=100$: $\phi(100)=40$, so $a^{40} \equiv 1 \pmod{100}$ for $a$ coprime to 10.

##### G3. Negative remainders (cleaner than positive)

**When you spot it:** the base is close to the divisor from above - e.g. remainder of $99^k$ by 100, or $23^k$ by 25.

**Why it works:** $99 \equiv -1 \pmod{100}$ is easier to raise to powers than 99. Sign Flips predictably; magnitude stays 1.

**Worked example:** *Remainder of $99^(100)$ by 100.*
$99 \equiv -1$. So $99^{100} \equiv (-1)^{100} = 1$. Answer: 1. If it were $99^{99}$: $(-1)^{99} = -1 \equiv 99 \pmod{100}$.

##### G4. Chinese Remainder Theorem (intuition, not formula)

**When you spot it:** *"Find the smallest number that Leaves remainder 3 when divided by 5, and remainder 4 when divided by 7."*

**Why it works:** if moduli are coprime, the pair of remainders uniquely identifies a residue mod (product). You don't need the formula - enumerate.

**Worked example:** *Remainder 3 mod 5, remainder 4 mod 7.*
Numbers = 4 mod 7: 4, 11, 18, 25, 32. Check which is = 3 mod 5: 18. So $N \equiv 18 \pmod{35}$.
