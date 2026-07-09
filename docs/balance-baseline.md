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

Before changing economy constants:

1. Add per-system contribution metrics for route revenue, route cost, operations, traits, stocks, subsidiaries, interest, and forced liquidation.
2. Add regional headquarters samples so Beijing geography does not dominate route and branch conclusions.
3. Define era-end settlement behavior; the simulator currently enforces the advertised horizon because the game itself does not.
4. Establish target bands for survival, victory timing, mature margin, cash trough, and strategy spread.
5. Run sensitivity sweeps, then change one economic subsystem per commit.

The full simulator is deterministic, so every outlier can be reproduced from its era, policy, and seed.
