# Backtracking - From Scratch (with N-Queens) - Java Edition

<a id="top"></a›
> A practical, intuition-first guide to backtracking in **Java**: what it is, when
> to use it, the universal template, complexity analysis, and a fully worked
> N-Queens solution.

---

## Table of Contents

1. [What- Is Backtracking?](#1-what-is-backtracking)
2. [The Core Idea (Intuition)](#2-the-core-idea-intuition)
3. [Backtracking vs. Brute Force vs. DP](#3-backtracking-vs-brute-force-vs-dp)
4. [The Universal Backtracking Template (Java)](#4-the-universal-backtracking-template-java)
5. [Subsets](#5-subsets)
6. [Permutations](#6-permutations)
7. [Combination Sum](#7-combination-sum)
8. [N-Queens: The Classic Problem](#9-n-queens-the-classic-problem)
9. [N-Queens: Step-by-Step Walkthrough (4x4)](#10-n-queens-step-by-step-walkthrough-44)
10. [N-Queens: Optimized Java Implementation](#11-n-queens-optimized-java-implementation)
11. [Complexity Analysis](#12-complexity-analysis)
12. [Pruning: The Heart of Efficiency](#13-pruning-the-heart-of-efficiency)
13. [Common Pitfalls & Tips (Java-specific)](#14-common-pitfalls--tips-java-specific)
14. [Practice Problems](#15-practice-problems)
15. [Cheat Sheet](#16-cheat-sheet)

---

## 1. What Is Backtracking?
**Backtracking** is a general algorithmic technique for solving problems
*incrementally*, building candidates to the solution one piece at a time, and
**abandoning** a candidate ("backtracking") as soon as it determines the candidate cannot possibly lead to a valid solution.
Think of it as a smart, systematic **trial and error**:
> "Try a choice → explore deeper + if it fails, undo the choice and try the next one."
It is essentially a **depth-first search (DFS)** over the space of all possible partial solutions, with ""pruning** to skip branches that can't work.
### When should you reach for backtracking?
Use backtracking when a problem asks you to:
- Find **all** solutions (e.g, all permutations, all subsets) .
- Find **any one**valid solution (e.g., solve a Sudoku).
- Find the **best** solution among many (sometimes - though DP/greedy may be better).
- Satisfy a set of **constraints** (Constraint Satisfaction Problems).
Typical keywords in problem statements: *"all combinations"*, *"all paths"*,*"generate every"*, *"place items so that..."*, *"is there an arrangement..."*.

<div align="left"><a href="#top">Back to top</a></div›

---

## 2. The Core Idea (Intuition)
Imagine you're navigating a maze. At each junction you:
1. **Pick** a direction (make a choice).
2. **Walk** forward (recurse / go deeper).
3. If you hit a dead end, **walk back** to the last junction (undo the choice).
4. Try the **next** unexplored direction.
5. Repeat until you escape (solution found) or exhaust all paths (no solution).
The "walk back and undo" step is the **backtrack**. The crucial optimization is: if you can *tell early* that a path leads nowhere, you don't waste time walking all the way down it. That early detection is called **pruning**.
``` 
     start
    /  |  \
   A   B   C  <-- choices at level 1
  /|   |   |
  ... (dead...
       end --> backtrack)
```

<div align="left"><a href="#top">Back to top</a></div›

---

## 3. Backtracking vs. Brute Force vs. DP
| Aspect | Brute Force | Backtracking | Dynamic Programming |
|---|---|---|---|
| Strategy | Generate *all* candidates, then test | Build incrementally, **prune** invalid early | Reuse overlapping subproblem results |
| Wasted work | Lots | Much less (pruning) | Minimal (memoization) |
| Best for | Tiny inputs | Constraint satisfaction, enumeration | Optimization with overlapping subproblems |
| Example | List all 20 subsets then filter | Stop building a subset once it's invalid | Longest common subsequence |

**Key insight:** Backtracking = Brute force + **early abandonment** of doomed paths.
Without pruning, backtracking degrades into plain brute force.

<div align="left"><a href="#top">Back to top</a></div›
     
---


## 4. The Universal Backtracking Template (Java)

Almost every backtracking solution fits this shape:
```java
void backtrack(State state) {
  if (isSolution(state)) {
    record(state);  // found a complete valid solution
    return;  // (or " return true" if you only need one)
}

for (Choice choice : getcandidates(state)) {
  if (isValid(state, choice)) { // <-- PRUNING happens here
    makeChoice(state, choice); // 1. choose
    backtrack(state); // 2. explore
    undoChoice(state, choice); // 3. un-choose (BACKTRACK)
  }
 }
}
```

The three magic steps inside the loop - **choose → explore + un-choose** - are the signature of backtracking. The `isValid` check is what keeps it efficient.
> **Mnemonic:** *Choose, Explore, Un-choose.*

<div align="left"><a href="#top">Back to top</a></div›

---

## 5. Subsets
Generate all subsets of `[1, 2, 3]`.
```java 
import java.util.*;

public class Subsets {
  public List‹List‹Integer>> subsets(int[] nums) {
    List‹List<Integer>> result = new ArrayList<>(); 
    backtrack(nums, 0, new ArrayList<>(), result):
    return result;
  }
  private void backtrack(int[] nums, int start,List<Integer> path, List‹List<Integer>> result) {
    result.add(new ArrayList>(path));  // every node is a valid subset
    for (int i = start; 1 < nums.length; i++) {
      path.add(nums [i]);  // choose
      backtrack(nums, i + 1, path, result); // explore
      path. remove(path.size() - 1); // un-choose (backtrack)
    }
  }
}
// subsets ([1,2,3]) ->
// [[], [11, [1,21, [1,2,3], [1,3]. [2], [2,3], [3]]
```

Notice the **choose + explore + un-choose** rhythm with `add` / `remove` .
Also note `new ArrayList<>(path)` - we store a **copy**, not the live reference.

<div align="left"><a href="#top">Back to top</a></div›

---

## 6. Permutations
Generate all orderings of `[1, 2, 3]`.
```java
import java.util.*;
public class Permutations {
     public List‹ List‹Integer›> permute(int[] nums) {
          List‹List<Integer>> result = new ArrayList<>();
          boolean[] used = new boolean[nums.length];
          backtrack(nums, used, new ArrayList>(), result);
          return result;
     }
     private void backtrack(int[] nums, boolean[] used,List‹Integer> path, List<List<Integer>> result) {
          if (path.size() == nums.length) { // isSolution
               result.add(new ArrayList>(path)):
               return;
          }
          for (int 1 = 0; i < nums.length; i++) {
               if (used[i]) continue;  // pruning: skip already-used
               used [1] = true; // choose
               path.add(nums [i]);
               backtrack(nums, used, path, result): // explore
               path. remove(path.size() - 1); // un-choose
               used[i] = false;
          }
     }
}
```

<div align="left"><a href="#top">Back to top</a></div›

---

## 7. Combination Sum
> **Problem (LeetCode 39):** Given an array of **distinct** integers `candidates`
> and a `target`, return all **unique** combinations whose numbers sum to
> `target`. The **same** number may be chosen an **unlimited** number of times.

This is the exact same backtracking machinery as Subsets/Permutations - only the constraints change. Two ideas drive it:
1. **Pruning by the running total.** Subtract each pick from "remaining". If `remaining == 6` we found a valid combination; if `remaining < o` we overshot and abandon the branch immediately.
2. **Avoiding duplicate combinations.** Pass a `start` index so each level only considers candidates from the current position onward. Crucially we recurse with `i` (not `i + 1`) so the **same** number can be reused, while still never revisiting earlier numbers (which would produce permuted duplicates like `[2,3]` and `[3,2]`).

```java
import java.util.*;
public class CombinationSum {
     public List‹List<Integer>> combinationSum(int[] candidates, int target) {
          List‹List<< Integer>> result = new ArrayList<>();
          backtrack(candidates, target, 0, new ArrayList<>(), result);
          return result;
     }
     private void backtrack(int[] candidates, int remaining, int start, List‹Integer> path, List‹List<Integer>> result) {
     if (remaining == 0) {  // isSolution: hit the target
          result.add(new ArrayList>(path));
          return;
     }
     if (remaining < 0) { // pruning: overshot the target
          return;
     }
     for (int i = start; i ‹ candidates.length; i++) {
          path.add (candidates [i]); // choose
          // pass `i` (not `i + 1`) so the same number can be reused
          backtrack(candidates, remaining - candidates[i], i, path, result);
          path.remove(path.size() - 1); // un-choose (backtrack)
          }
     }
}
// combinationSum([2,3,6,7], 7) -> [[2,2,3], [7]]
```

### How it maps to the template
| Template step | Combination Sum |
|---|---|
|`isSolution` | `remaining == 0` |
| Pruning | `remaining ‹ 0` (overshoot) + `start` index (no duplicates) |
| Choose | `path.add(candidates[i])` |
| Explore | recurse with `remaining - candidates[i]`, same `i` for reuse I |
| Un-choose | `path.remove(path.size() - 1)` |

Notice the identical **choose + explore + un-choose** rhythm, and again we store
`new ArrayList<>(path)` - a **copy**, never the live reference.
**Tiny tweak + a different problem.** Recurse with `i + 1` instead of `i` and
> you get **Combination Sum II** (each number used at most once). Add a sort plus
> a `if (i > start && candidates[i] == candidates[i-1]) continue;` skip and it
> handles duplicate inputs too. Same skeleton, new constraints.

<div align="left"><a href="#top">Back to top</a></div›

---

## 9. N-Queens: The Classic Problem
> **Problem:** Place `N` queens on an `N*N` chessboard so that **no two queens
> attack each other**. A queen attacks along its **row**, **Column**, and both
> **diagonals**. Return all distinct valid placements.

### Why it's a perfect backtracking problem
- We build the solution **one row at a time** (place exactly one queen per row).
- At each row, we **try every column**
- We **prune** any column that is attacked by a previously placed queen.
- If no column works in a row, we **backtrack** to the previous row and move its queen.
  
### Key observation that shrinks the problem
Since two queens can never share a row, we place **exactly one queen in each row**.
This reduces the search from "choose N squares out of N2" to "choose one column for each of the N rows" - a state-space tree of depth `N` with up to `N` branches per node.

### Detecting attacks in 0(1)
For a queen at `(row, col)`:
- **Same column:** another queen has the same `col`.
- **Same \ diagonal (top-left + bottom-right):** cells where `row - col` is equal.
- **Same / diagonal (top-right - bottom-left):** cells where `row + col` is equal.

So we maintain three tracking structures:

| Structure | Tracks | Identity |
|---|---|---|
| `cols` | occupied columns | `col` |
| `diag1` | "\" diagonals | `row - col` | 
| `diag2` | "/" diagonals | `row + col` |
> A column is safe iff `col` is not in `cols` **and** `(row - col)` is not in `diag1` **and**`(row + col)` is not in `diag2`. Each check is 0(1). **Java note:** `row - col` can be negative (range `-(N-1)` to `N-1`). If you
> use boolean arrays instead of a `HashSet`, offset the index by `N - 1`, i.e.
> `diag1[row - col + (N - 1)]`. The example below uses `boolean[]` for speed.

<div align="left"><a href="#top">Back to top</a></div›

---

## 10. N-Queens: Step-by-Step Walkthrough (4×4)
Let's trace `N = 4`. We place one queen per row, columns indexed `0-3`.

**Row 0:** try col 0. Place `Q` at (0,0).
```
Q...
....
....
....
```
**Row 1:** col 0 X (same column), col 1 X (diagonal of (0,0)), col 2 V. Place (1,2).
```
Q...
..Q.
....
....
```
**Row 2:** col 0 X (column), col 1 X (diag of (1,2)), col 2 X (column), col 3 X (diag of (1,2)). **Dead end --> backtrack to row 1.**
**Row 1 again:** try col 3 (next after 2). Place (1,3) .
```
Q...
...Q
....
....
```
**Row 2:** col 0 X, col 1 V. Place (2,1) -
```
Q...
...Q
.Q..
....
```

**Row 3:** col 0 X, col 1 X, col 2 X, col 3 X. **Dead end → backtrack**.
Row 2 has no more options --> backtrack to row 1 exhausted --> backtrack to row 0.
**Row 0 again:** try col 1. Place (0,1).
```
.Q..
....
....
....
```

Conitnuing this process evenutally finds the two valid solutions for `N=4`.

```
Solution 1                Solution 2
.Q..                      ..Q.
...Q                      Q...
Q...                      ...Q
..Q.                      .Q..
```
Continuing this process eventually finds the two valid solutions for *N = 4*:
This trace shows the essence: ** Try, hit a wall, undo, try the next option**

<div align="left"><a href="#top">Back to top</a></div›

---

## 11. N-Queens: Optimized Java Implementation
```java
import java.util.*;

     public class NQueens {
     private int n;
     private boolean[] cols; // columns under attack
     private boolean[] diag1; // "'" diagonals: indexed by (row - col + n - 1)
     private boolean[] diag2; // "/" diagonals: indexed by (row + col)
     private int[] placement; // placement[row] = column of the queen in that row
     private List‹List<String>> solutions;
     
     public List<List<String>> solveNQueens(int n) {
          this.n = n;
          this.cols = new boolean[n];
          this.diag1 = new boolean[2 * n - 1];
          this.diag2 = new boolean[2 * n - 1];
          this-placement = new int[n]:
          this solutions = new ArrayListo>0;
          backtrack(0);
          return solutions;
     }

     private void backtrack(int row) {
          if (row == n) {      // all N queens placed + solution
               solutions.add(buildBoard()):
               return;
          }
          for (int col = 0; col < n; col++) {
               int d1 = row - col + n - 1;
               int d2 = row + col;
               // --- PRUNING: skip any column under attack ---
               if (cols[col] || diag1[d1] || diag2[d2]) {
                    continue;
               }
               // shift into [O, 2n-2]
               //--- CHOOSE ---
               cols[col] = diag1[d1] = diag2[d2] = true;
               placement [row] = col;
               //--- EXPLORE ---
               backtrack(row + 1);
               //--- UN-CHOOSE (BACKTRACK) ---
               cols [col] = diag1[1] = diag2[d2] = false;
          }     
     }
          private List< String> buildBoard() {
               List<String> board = new ArrayList<>();
               for (int row = 0; row < n; row++) {
                    char[] line - new char [n];
                    Arrays. fill(line, '.');
                    line [placement [rowl] = '0';
                    board.add (new String(line));
               }
               return board;
          }
     //---Demo---
     public static void main(String[] args){
          int n=4;
          List<List<String>> boards = new NQueens().solveNQueens(n);
          System.out.printf("%d solution(s) for N= %d%n%n", boards.size(),n);
          int i=1;
          for (List<String> board : boards){
               System.out.println("Solution"+(i++)+":");
               board.forEach(System.out::println);
               System.out.println();
          }
     }
}
```

### Just want the count* of solutions?
```java
public class NQueensCount {
     public int totalNQueens(int n) {
          return backtrack(0, n, new boolean[n],
          new boolean[2 *n - 1], new boolean[2 * n - 1]);
     }
     private int backtrack(int row, int n, booleanll cols,boolean[] diag1, boolean[] diag2) {
          if (row == n) return 1;
          int total = 0;
          for (int col = 0; col < n; col++) {
               int d1 = row - col + n - 1;
               int d2 = row + col;
               if (cols[col] || diag1[d1] || diag2[d2]) continue;
               cols[col] = diag1[d1] = diag2[d2] = true;
               total += backtrack(row + 1, n, cols, diag1, diag?);
               cols[col] = diag1[d1] = diag2[d2] = false;
               }
          return total;
     }
}

// new NQueensCount) -totalNQueens (8) -> 92
```

### Bitmask variant (fastest, for the curious)
For larger N, you can replace the boolean arrays with `int` bitmasks. Each set bit marks an attacked column/diagonal, and `Integer.numberOfTrailingZeros` extracts candidate columns:

```java
public class NQueensBitmask {
     private int n, count;
     public int totalnQueens(int n) {
          this.n = n;
          this.count = 0;
          backtrack(e, 0, 0):
          return count;
     }

     // cols, di, d2 are bitmasks of attacked positions
     private void backtrack(int cols, int di, int d2) {
          if (cols == (1 << n) - 1) {  // all columns filled
               count++;
               return;
          }
          int available =~(cols | d1 | d2) & ((1 << n) - 1);
          while (available != 0) {
               int bit = available & -available;    // lowest set bit
               available -= bit;   // mark this column as tried
               // di shifts left, d2 shifts right as we descend one row
               backtrack(cols | bit, (d1 | bit) < 1, (d2 | bit) >> 1);
          }
     }
}
```
<div align="left"><a href="#top">Back to top</a></div›

---
     
## 12. Complexity Analysis
### Time complexity
- **Upper bound (no pruning):** `O(N*N)` - N choices at each of N rows.
- **With the one-queen-per-row constraint:** `O(N!)` - first row has N options, next has ≤ N-1, and so on.
**With diagonal pruning:** Far fewer nodes are actually wisited in practice, though the worst-case bound stays "O(N!)*. Pruning provides a large *constant factor* (and often more) speedup.
  
| N | Number of solutions |
|---|---|
|1 |1|
|4|2|
|6|4|
|8|92 |
| 10 | 724 |
| 12 | 14,200 |

### Space complexity
- **Recursion depth:** `O(N)` (one stack frame per row).
- **Auxiliary arrays:** `O(N)` total across `cols`, `diagl`, `diag2`, `placement`.
- **Output:** `O(number_of_solutions * N)` to store all boards.
So the working space (excluding output) is **`O(N)`**.

<div align="left"><a href="#top">Back to top</a></div›

---

## 13. Pruning: The Heart of Efficiency
Pruning is what separates backtracking from naive brute force. The earlier and more aggressively you can reject invalid partial solutions, the smaller the state-space tree you actually explore.
**Good pruning checklist:**
1. **Validate at every step**, not just at the leaves.
     - X Place all N queens, *then* check validity → brute force.
     - Check each queen against prior ones *before* recursing --> backtracking.
2. **Use O(1) constraint checks** (`boolean[]` / bitmasks) instead of rescanning the whole board.
3. **Order choices smartly** when looking for *one* solution - try the most constrained options first (a heuristic from Constraint Satisfaction Problems, e-g-, *Minimum Remaining Values*).
4. **Exploit symmetry** - e.g., for N-Queens you can fix the first queen to the left half of row 0 and mirror results to roughly halve the work.

<div align="left"><a href="#top">Back to top</a></div›
     
ーーー

## 14. Common Pitfalls & Tips (Java-specific)
- **Forgetting to un-choose.** If you mutate shared state (a `List`, a `boolean[]`, a board) you *must* undo it after the recursive call, or sibling branches see corrupted state.
- **Storing a reference instead of a copy.** When recording a solution from a mutable `path`, store `new ArrayList<>(path)`, not `path` itself - otherwise
later mutations corrupt your saved results. This is the single most common Java backtracking bug.
- **Negative diagonal indices.** `row - col` ranges from `-(N-1)` to `N-1`. With arrays you **must** offset by `N - 1`; forgetting this throws `ArrayIndexOutOfBoundsException`.
- **`List.remove(int)` vs 'List.remove(Object)`.** `path. remove(path.size() - 1)` removes by **index** (correct for backtracking). Be careful with `List<Integer>`: `path.remove(someInteger)` may call the *object* overload and remove by value instead.
- **Pruning too late.** Checking validity only at leaves throws away the whole benefit of backtracking.
- **Returning early when you need *all* solutions,** Use `return true` to stop at the first solution; keep iterating (no early return) to collect them all.
- **`StackOverflowError` for huge N.** The JVM default stack handles N-Queens fine, but very deep custom recursion may need `-Xss` tuning or an explicit stack.

<div align="left"><a href="#top">Back to top</a></div›

---

## 15. Practice Problems
Work these in roughly increasing difficulty:

| Problem | Concept reinforced |
|---|---|
| Subsets / Subsets II | Include-exclude tree, dedup | 
| Permutations / Permutations II | Used-tracking, dedup | 
| Combination Sum I/II/III | Choice reuse, target pruning | 
|Letter Combinations of a Phone Number | Mapping choices | 
|Generate Parentheses | Constraint-driven pruning |
| Word Search | Grid DFS + visited backtracking |
| Palindrome Partitioning | Substring choices |
|**N-Queens / N-Queens II** | Multi-constraint pruning |
|Sudoku Solver | Constraint propagation + backtracking |
| Restore IP Addresses | Segment validation |

<div align="left"><a href="#top">Back to top</a></div›

---

## 16. Cheat Sheet
```text
BACKTRACKING = DFS over the state-space tree + PRUNING

Template (Java):
     void backtrack(State s) {
          if (isSolution(s)) { record(s); return; }
          for (Choice c : candidates (s)) {
               if (isValid(s, c)) { //  prune here
                    choose(c);  // mutate state
                    backtrack(s);  // recurse
                    unChoose (c); // restore state
               }
          }
     }

Rhythm: CHOOSE + EXPLORE + UN-CHOOSE

N-Queens constraints (all 0(1)):
     same column : cols[coll
     "\" diagonal : diag1[row - col + n - 1]
     "/" diagonal : diag2[row + col]

Place one queen per row + depth = N, branching ≤ N.
Time: O(N!) worst case (pruning cuts the constant heavily)
Space: O(N) working memory

Java gotchas:
     - store new ArrayList<>(path), never the live reference
     - offset negative diagonal index by (n - 1)
     - path. remove(path.size() - 1) removes by index, not value
```
---
