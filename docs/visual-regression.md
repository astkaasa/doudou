# Visual regression matrix

This matrix is the repeatable visual acceptance baseline for UI work. `e2e/core-flow.spec.js` automates the stable shell and core interaction checks on desktop and mobile; free-form map gestures, dense late-game data, pixel-level appearance, and long animated flows still require human inspection.

## Automated coverage

Run `npm run test:e2e` to validate four workflows on both reference viewports, for eight browser tests. The suite currently covers:

- company setup and the first operating quarter;
- map rendering and desktop zoom rerendering;
- route creation with a non-overlapping scroll body/action bar, the mobile quarter forecast, route/fleet dialogs, keyboard focus restoration, newspaper and report flow;
- concrete airport selection, alternate-airport persistence, airport management, save and load;
- delivery, angel investment and main-quest victory focus ownership and background locking;
- purchase, operations, loan, branch, investment, airport and stock workspaces, including viewport bounds, transaction refresh and feedback placement;
- browser console and uncaught page errors.

The automated suite verifies layout bounds and interaction reachability, but it is not a pixel-diff replacement for the manual scenarios below.

## Run setup

```bash
npm run check
npm run dev
```

Validate both reference viewports:

- desktop: 1280 x 720;
- mobile: 390 x 844.

Use a fresh game for setup and trait flows. Use a deterministic saved game for management workflows so comparisons start from the same state.

## Scenario matrix

| Area | Required flow | Visual contract |
| --- | --- | --- |
| Main menu | Open main, era, save, and credits views | Background asset loads; panels remain scrollable; four era and three trait colors are distinct |
| Headquarters | Select an era, enter HQ mode, choose Beijing, confirm | Banner stays inside the viewport; confirm controls appear only after selection; map and city list remain usable |
| Game shell | Load a save on both viewports | HUD wraps without overlap; map is nonblank; side panel and bottom controls remain reachable |
| Map | Pan, pinch or wheel zoom, hover and select cities | Cursor and preview states reset; city hit targets track markers; labels and routes remain aligned |
| Route creation | Select Beijing then Shanghai, open and close the route modal | Selection copy is readable; mobile markets remain comparable in one row; one scroll body ends above the persistent action bar |
| Management | Open fleet, finance, operations, branch, subsidiary, airport, and stock views | Dialog focus is visible; content scrolls; industry and status colors remain semantic |
| Quarter result | Advance a quarter and inspect paper plus report | Desktop columns and mobile stack both scroll fully; negative and positive values remain distinguishable |
| Transient states | Trigger onboarding, success/warning banners, milestone or delivery UI | Overlays do not fight for z-index; dismissing one restores focus and background interaction |

## Failure criteria

A visual pass fails when any reference viewport has:

- clipped or overlapping text, controls, dialogs, or fixed banners;
- an unreachable primary action or a nested scroll area that traps content;
- a blank, detached, or incorrectly framed map;
- state colors missing or applied to the wrong item;
- layout movement caused by hover, labels, counters, or dynamic content;
- browser console errors during the tested flow.

Record the failing viewport, flow, and exact interaction sequence. Add an automated regression assertion when the failure can be expressed without platform-specific pixel matching.
