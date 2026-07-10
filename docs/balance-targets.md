# Four-era balance targets

These targets define the acceptance bands for the M2 balance pass. They are intentionally expressed as ranges rather than exact outputs so deterministic seeds expose regressions without forcing every headquarters into the same result.

## Validation matrix

Final acceptance uses:

- all four eras and all four simulator policies;
- Beijing, Dubai, London, New York, and Sydney headquarters;
- at least 20 deterministic seeds per era, policy, and headquarters;
- the advertised 80-quarter horizon for eras 1-3 and 240-quarter horizon for era 4;
- state invariant validation after every quarter.

Fast tuning runs may use fewer seeds, but they cannot replace the final matrix.

Run the complete matrix with:

```bash
npm run balance:acceptance -- --output /tmp/doudou-balance-acceptance.json
```

The acceptance runner uses deterministic jobs and worker threads, restores result order before aggregation, and reports matrix coverage separately from metric failures. `--era`, `--policy`, `--hq`, and `--runs` are available for scoped diagnostics; `--strict` returns a non-zero status unless the full matrix and all checks pass.

## Campaign bands

Rates are aggregated across the complete regional matrix. Victory timing applies to successful quest-focused (`aggressive`) runs. Route and profit margins exclude asset-sale proceeds and rescue capital. Cash pressure is the share of quarters ending below the policy reserve.

| Era | Difficulty | All-policy survival | Aggressive victory | Aggressive victory turn | Route operating margin | Total profit margin | Cash pressure |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| era1 | Challenge | 70%-95% | 30%-65% | 62-78 | 15%-35% | 10%-30% | 10%-35% |
| era2 | Standard | 80%-98% | 50%-85% | 58-75 | 15%-35% | 10%-30% | 5%-25% |
| era3 | Easy | 95%-100% | 75%-100% | 50-70 | 20%-40% | 15%-35% | 0%-15% |
| era4 | Epic | 60%-90% | 35%-70% | 140-215 | 15%-35% | 10%-30% | 10%-35% |

These bands apply to regional aggregates, not every individual headquarters. Geography should matter, but no headquarters may have a guaranteed failure under every policy.

Survival and the cross-system limits use all four policies. Victory, victory timing, route margin, profit margin, cash pressure, and non-route income use the quest-focused aggressive policy. This keeps economic comparisons on one stable strategy while the all-policy checks measure overall viability.

## Cross-system limits

- Non-route income should remain below 15% of gross inflows for a route-focused policy over a full campaign.
- No recurring income source may be proportional to accumulated cash; that creates exponential growth independent of operating decisions.
- Median end cash should stay below 25 times starting cash in eras 1-3 and below 100 times starting cash in era 4.
- Forced liquidation should occur in 5%-30% of challenge/epic runs and remain below 10% in the easy era.
- Angel rescue should remain exceptional: below 10% in eras 1-3 and below 20% in era 4.
- At least two policies should remain viable in every era. Diversification may lead company value, but should not dominate more than 70% of headquarters/seed combinations.

## Victory grades

Grades are calibrated by era instead of sharing one absolute threshold:

| Era | S | A | B | C |
| --- | ---: | ---: | ---: | --- |
| era1 | <= 52 turns | <= 64 | <= 76 | later completion |
| era2 | <= 48 turns | <= 60 | <= 72 | later completion |
| era3 | <= 44 turns | <= 56 | <= 68 | later completion |
| era4 | <= 144 turns | <= 176 | <= 208 | later completion |

An S grade represents an optimized run rather than the expected first success. The B threshold sits near the upper edge of the target victory window; completing later is still a valid campaign victory.

## Quest calibration

Each cell lists company value / routes / represented base regions / consecutive profitable quarters. These are the current tuning values pending the full regional matrix.

| Stage | era1 | era2 | era3 | era4 |
| --- | --- | --- | --- | --- |
| 1 | 150M / 8 / 1 / 4 | 500M / 10 / 2 / 4 | 800M / 12 / 2 / 4 | 500M / 10 / 2 / 4 |
| 2 | 400M / 22 / 2 / 6 | 2,000M / 40 / 3 / 8 | 3,000M / 45 / 3 / 8 | 2,000M / 40 / 3 / 8 |
| 3 | 700M / 38 / 3 / 8 | 5,000M / 68 / 6 / 12 | 4,500M / 68 / 6 / 6 | 5,000M / 70 / 6 / 12 |

## Change order

1. Remove cash-proportional recurring income.
2. Re-run contribution diagnostics and tune route margins through one subsystem at a time.
3. Calibrate era-specific quest dimensions against executable regional strategies.
4. Apply era-specific grade thresholds.
5. Run the full validation matrix and record medians, tail failures, and reproducible outliers.
