# Four-era balance baseline

Generated on 2026-07-10 with:

```bash
npm run balance -- --runs 3
```

## Method

- Four eras, four policies, three deterministic seeds per combination: 48 complete games.
- Era 1-3 use an 80-quarter horizon; era 4 uses a 240-quarter horizon.
- Headquarters is Beijing for this baseline.
- Policies cover conservative operation, balanced expansion, aggressive main-quest pursuit, and diversified investment.
- Every simulated quarter runs the same domain actions as the game and finishes with `assertGameState`.
- This is a directional baseline, not a final statistical acceptance run. Parameter changes should use at least 20 seeds and multiple headquarters.

## Key results

All 48 games reached their simulation horizon. No run failed a state invariant.

| Era | Aggressive victory rate | Average victory turn | Aggressive end cash | Aggressive company value | Aggressive profit margin | Other-policy end-cash range |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| era1 | 0% | - | 807.7M | 1,323.3M | 26.0% | 438.9M-764.6M |
| era2 | 100% | 62.0 | 8,027.7M | 9,521.1M | 59.2% | 2,170.0M-4,385.7M |
| era3 | 100% | 67.7 | 10,807.5M | 12,169.9M | 67.8% | 2,732.1M-4,830.0M |
| era4 | 100% | 112.7 | 269,962.9M | 271,288.2M | 83.0% | 10,070.6M-17,745.7M |

Additional observations:

- Every policy survived every era. Angel rescue was never required in the final baseline.
- Profitable-quarter rates were 90%-100% for almost every combination.
- Diversified policies ended with 8-27 subsidiaries and converted cash into higher company value as intended.
- Aggressive era 4 runs averaged 0.7 forced liquidations, but still recovered into extreme late-game growth.
- Fleet replacement and route reassignment are required in era 4 because aircraft reach their 25-year retirement limit during the scenario.

## Findings

### 1. Era 1 quest pacing is not aligned with its horizon

The aggressive policy finished with about 38 routes, 2.7 represented base regions, and 1,323M company value. The third quest stage requires 50 routes, six regions, and 3,000M. Unlike era 2 and era 3, the era 1 objective is not reachable by the tested high-expansion strategy before the advertised end year.

### 2. Era 2 and era 3 compound too quickly

Mature profit margins near 60%-70%, combined with 97%-100% profitable quarters, remove most recovery and financing pressure after the opening phase. The aggressive policy ends at 80 quarters with roughly 80 times its starting cash in era 2 and 70 times its starting cash in era 3.

### 3. Era 4 has an unchecked late-game growth curve

The 240-quarter scenario compounds to roughly 270,000M cash under aggressive expansion. Its 83% cumulative profit margin indicates that route, trait, city-growth, and scale effects outgrow fleet renewal and operating overhead by a wide margin.

### 4. Difficulty is not yet expressed through survival risk

Every tested policy survives every era. The labels currently describe opening conditions, but long-run outcomes do not produce a clear simple/standard/challenge/epic ordering.

### 5. Quest grades need calibration against executable strategies

The quest-focused policy averages turn 62 in era 2, turn 68 in era 3, and turn 113 in era 4. S/A thresholds of 40/55 turns are not reached in this baseline, while era 1 does not finish at all. Human optimization may be faster, but the current thresholds need evidence from both simulation and manual expert play.

## Next measurements

Per-system contribution metrics and multi-headquarters sampling support are now in place. A preliminary regional run has identified geography and trait compounding as material variables, but final calibration still requires multiple seeds per headquarters.

Before changing economy constants:

1. Use the acceptance bands in [`balance-targets.md`](balance-targets.md).
2. Run multi-seed sensitivity sweeps, then change one economic subsystem per commit.

The full simulator is deterministic, so every outlier can be reproduced from its era, policy, and seed.

## Instrumentation update

The simulator now reports quarterly contributions for route revenue and cost, fleet overhead, leases, operations, faults, loan interest, trait income, stock dividends, subsidiary returns and maintenance, emergency borrowing, forced-liquidation proceeds, and rescue capital. It also records reserve-pressure turns, negative-cash turns, and peak-to-trough cash drawdown.

Simulation policies now use restrained contracts and operating budgets while a company is starting up or has less than twice its target cash reserve. This keeps the automated policies economically competent enough for parameter comparison; it does not change player rules or remove each policy's long-run operating profile.

Regional headquarters can be sampled with:

```bash
npm run balance -- --policy aggressive --regional --runs 1
```

The first five-headquarters diagnostic run is intentionally only a one-seed sensitivity check, not a replacement baseline. It established three useful signals:

- Era 1 survival ranged from failure at Dubai to strong growth at New York, while no headquarters completed the quest. Early aircraft range and the local city graph materially affect campaign difficulty.
- Era 2 victory occurred at three of five headquarters and era 3 at all five. Mature route operating margins were typically 46%-68%, confirming that route economics are already generous before non-route income.
- In surviving era 4 runs, non-route income contributed roughly 40%-61% of all inflows. The aggressive policy uses the spicy trait, so its cash-proportional trait fund is the primary candidate behind late-game exponential growth.

The earlier `forcedLiquidations` metric also counted emergency loans. It now counts only forced stock, subsidiary, or aircraft sales; emergency borrowing is reported separately.

## Era-end settlement update

The game now settles each scenario once at its advertised horizon. The final-quarter report leads to a mandatory choice between retirement and sandbox continuation, and the choice is persisted. Existing saves already beyond their horizon migrate directly to sandbox continuation so they are not interrupted retroactively. Diagnostic simulations automatically choose sandbox only when an explicit `--turns` horizon extends beyond the scenario deadline.

## First balance change: trait income

The spicy trait now pays a fixed 0.5M plus 2.5% of route operating revenue instead of 2.5% of accumulated cash. On the comparable `balance-v1`, era 4, aggressive, Beijing seed, end cash fell from about 225,695M to 56,911M and non-route income share fell from 55.7% to 2.5%.

This removes the independent exponential income source, but does not finish the economy pass: route operating margin remained about 59.5%, still well above the 15%-35% target band. Route economics are therefore the next subsystem to calibrate.

## Second balance change: cabin service cost

Cabin service cost now scales with carried passengers and route distance instead of charging a nearly fixed amount per assigned aircraft. Era-specific multipliers represent the different service-cost environments while keeping one shared passenger-distance formula.

A three-seed Beijing diagnostic of the aggressive policy produced:

| Era | Survival | Victory | Average victory turn | Route operating margin | Profit margin | Cash pressure |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| era1 | 100.0% | 0.0% | - | 15.2% | 17.7% | 2.9% |
| era2 | 100.0% | 33.3% | 73.0 | 34.6% | 36.3% | 0.4% |
| era3 | 100.0% | 0.0% | - | 39.6% | 41.1% | 0.8% |
| era4 | 66.7% | 66.7% | 180.0 | 23.5% | 26.4% | 27.5% |

All route operating margins now fall within or on the edge of their acceptance bands. Era 1 and era 3 quest completion rates remain out of band even though their operating economics are viable, so the next calibration step is era-specific quest requirements and victory-grade thresholds rather than another route-cost increase. This diagnostic is still too small and geographically narrow for final acceptance.

## Third balance change: era-specific campaigns

Main-quest dimensions and victory-grade deadlines now resolve by era. Era 1 no longer requires a cross-region branch in its opening stage, era 2 and era 3 retain global endgame coverage with achievable scale targets, and era 4 keeps its longer campaign requirements. Consecutive-profit requirements are also lower where short scenarios or volatile expansion otherwise reset a viable run too easily.

The same three-seed Beijing aggressive-policy diagnostic now produces:

| Era | Survival | Victory | Average victory turn | Target victory band | Target turn band |
| --- | ---: | ---: | ---: | ---: | ---: |
| era1 | 100.0% | 33.3% | 78.0 | 30%-65% | 62-78 |
| era2 | 100.0% | 66.7% | 72.5 | 50%-85% | 58-75 |
| era3 | 100.0% | 100.0% | 66.3 | 75%-100% | 50-70 |
| era4 | 66.7% | 66.7% | 180.0 | 35%-70% | 140-215 |

This small Beijing sample now sits inside every victory and timing band. It is a tuning checkpoint, not final acceptance; M2.4 must still test all policies, five headquarters, and at least 20 seeds.
