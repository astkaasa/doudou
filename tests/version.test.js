import { describe, expect, it } from 'vitest';

import { CREDITS } from '../src/data/credits.js';
import { GAME_VERSION, VERSION_LOG } from '../src/data/version.js';

describe('version and credits data', () => {
  it('keeps the current version first in the version log', () => {
    expect(VERSION_LOG[0].ver).toBe(GAME_VERSION);
    expect(VERSION_LOG.length).toBeGreaterThan(1);
  });

  it('exposes upstream credits as structured data', () => {
    expect(CREDITS.contributors).toContain('Hooya! Dogz');
    expect(CREDITS.inspirations[0]).toMatchObject({
      name: '《航空霸业》(Aerobiz)',
      year: 1992,
    });
  });
});
