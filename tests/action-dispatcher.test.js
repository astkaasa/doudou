import { describe, expect, it, vi } from 'vitest';

import { actionNames, createDelegatedActionHandler } from '../src/app/actionDispatcher.js';

describe('delegated action dispatcher', () => {
  it('dispatches the closest data-action target with event context', () => {
    const target = actionTarget('save-game');
    const callback = vi.fn();
    const event = { type: 'click', target: { closest: () => target } };
    const dispatch = createDelegatedActionHandler({ 'save-game': callback });

    expect(dispatch(event)).toBe(true);
    expect(callback).toHaveBeenCalledWith({ action: 'save-game', event, target });
  });

  it('ignores known actions that belong to another event type', () => {
    const target = actionTarget('company-name-input');
    const onUnknown = vi.fn();
    const dispatch = createDelegatedActionHandler({}, {
      knownActions: actionNames({ 'company-name-input': () => {} }),
      onUnknown,
    });

    expect(dispatch({ type: 'click', target: { closest: () => target } })).toBe(false);
    expect(onUnknown).not.toHaveBeenCalled();
  });

  it('reports genuinely unknown actions', () => {
    const target = actionTarget('misspelled-action');
    const onUnknown = vi.fn();
    const dispatch = createDelegatedActionHandler({}, { knownActions: new Set(), onUnknown });
    const event = { type: 'click', target: { closest: () => target } };

    expect(dispatch(event)).toBe(false);
    expect(onUnknown).toHaveBeenCalledWith('misspelled-action', event);
  });

  it('requires backdrop actions to originate on the backdrop itself', () => {
    const target = actionTarget('modal-backdrop');
    const callback = vi.fn();
    const dispatch = createDelegatedActionHandler({ 'modal-backdrop': callback }, {
      selfOnlyActions: ['modal-backdrop'],
    });

    expect(dispatch({ type: 'click', target: { closest: () => target } })).toBe(false);
    expect(callback).not.toHaveBeenCalled();
    expect(dispatch({ type: 'click', target })).toBe(true);
    expect(callback).toHaveBeenCalledOnce();
  });
});

function actionTarget(action) {
  return {
    dataset: { action },
    closest() {
      return this;
    },
  };
}
