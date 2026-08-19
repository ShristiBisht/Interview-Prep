<img width="1156" height="666" alt="image" src="https://github.com/user-attachments/assets/547f3ad4-3498-411e-ad03-2ac606bb8098" /># Cracking CAT for IIM A / B / C - The 99+ Percentile Playbook

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
***** (Calcutta) | 99+ | 85 | 80 | 85 | CAT score + 10th/12th |
> **Trap:** Non-engineer males and women get 3-5 %ile relaxation. Engineer males have the toughest bar - you cannot afford a weak section.

| IIM | Overall %ile | VARC %ile | DILR %ile | OA %ile | Extra weight |
|---|---|---|---|---|---|
|**A** (Ahmedabad) | 99+ | 85 | 85 | 85 | 10th, 12th, grad marks (huge) |
|**B** (Bangalore) | 99+ | 85 | 80 | 85 | Acads + gender + work-ex diversity |
|**C** (Calcutta) | 99+ | 85 | 80 | 85 | CAT score + 10th/12th |

> **Trap:** Non-engineer males and women get 3-5 %ile relaxation. Engineer males have the toughest bar - you cannot afford a weak section.

### 1.2 The three-legged stool
$$\text{Final Call} = f(\text{CAT}, \text(Academic Profile}, \text{Work-ex}) + \text{WAT/GD/PI}$$

- **IIM A:** 10th (-20%) + 12th (~10%) + Grad (•10%) is baked in. A 60% in 10th can end your A dream before you write CAT. Fix it with a monster CAT + WAT/PI.
- **IIM B:** Weightages more balanced, work-ex diversity (non-IT, non-engineering) rewarded
- **IIM C:** Purest CAT weightage among the three - best hope for a strong CAT but weak profile.

### 1.3 The engineer-male target
- **CAT overall:** 99.5+ (target raw ~78-82) -
- **Sectional:** 95+ each (no soft section).
- **Acads:** 10th ≥ 98%, 12th ≥ 90%, Grad ≥ 8.0 CGPA gives full points. Below 80% in any = points bleed.

## 2. Meta-Strategy - How Toppers Actually Think

### 2.1 Percentile math
Percentile is relative. Every skipped question in your strong section is a 99%iler's gain. **Attempts matter, but accuracy matters more.** A 22/22 attempt beats a 26/22 attempt (four wrongs = -4, net 18) -

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
| **Modern Math** (P&C, probability, sequences & series, set theory) | 2-3 | Medium |

› **Insight:** Arithmetic alone can carry you to 90%ile in QA. Master it *cold* before spending a week on P&C.

### 3.2 The formula sheet you actually need

**Percentages / Profit-L055**
$$\text{Successive change: 1 a\% \textf then 1 b\% \Rightarrow a + b + \frac{ab}{100}$$

**Time-Speed-Distance**
$$\text{Avg speed (equal distance)} = \frac{2 v_1 v_2}(v_1 + v_2}$$

**Time-Work**
$$\text{If A does in } a, \text{B in } b: \text{ together } = \frac{ab}{a+b}$$

**Compound Interest**
$$A = P\left(1 + \frac{r}{100}\right)^n \quad ; \quad CI - SI \text{ (2 yrs)} = P\left(\frac{r}{100}\right)*2$$

**Number Systems**
- Number of factors of $N = p_1^{a_1} p_2^(a_2} \ldots$ is $(a_1+1)(a_2+1)\ldots$
- Sum of factors: $\frac{p_1^{a_1+1}-1}{p_1-1} \times \frac{p_2*{a_2+1}-1}{P_2-1} \ldots$
- Unit digit cycles: $2 \to 2,4,8,6$; $3 \to 3,9,7,1$; $7 \to 7,9,3,1$; $8 \to 8,4,2,6$

**Geometry**
- Inradius: $r = \frac{\text{Areal}}{s}$, Circumradius: $R = \frac{abc}{4 \cdot \text{Area}}$
- Right triangle: $R = \frac{\text{hypotenuse}H(2)$, $r = 5 - \text{hypotenuse}$
  
**P&C**
- Circular arrangement of $n$: $(n-1)!$; if reflections identical: $frac(n-1) -162}$
- Selection with repetition: $\binom{n+r-1Hr}$

### 3.3 Shortcut techniques

#### A. Back-solving from options
If options are numeric and the equation is ugly, plug options. Start with the **middle** option - you learn direction in one try.

**Example:** *Sum of digits of a 2-digit number is 12. Reversing gives o number 18 Less. Find it.*
Options： （a） 39 （b） 57 （c） 75 （d） 93.
Try (c) 75 - reverse 57, diff 18.  Done in 8 seconds.

#### B. Approximation
CAT answers are often spaced far apart. Compute to 2 significant Figures.

**Example:** $\frac{47.8 \times 102.3H{29.6}$. Approx: $\frac{48 \times 100]{30} = 160$. Only one option will be near 165.

#### C. Digit sum / mod 9
For "which of the following equals..." - take digit sum of both sides. Rules out 3 options Fast.

#### D. Assume convenient numbers
Ratio / percentage problems with no absolute number given + assume 100 or LCM.
**Example: ** *Price rises 20%,
then falls 25%. Net?*
