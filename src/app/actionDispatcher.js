export function createDelegatedActionHandler(handlers, options = {}) {
  const knownActions = options.knownActions || new Set(Object.keys(handlers));
  const selfOnlyActions = new Set(options.selfOnlyActions || []);
  const onUnknown = options.onUnknown || defaultUnknownAction;

  return function delegatedActionHandler(event) {
    const target = event?.target?.closest?.('[data-action]');
    if (!target) return false;
    const action = target.dataset?.action;
    if (!action) return false;
    if (selfOnlyActions.has(action) && event.target !== target) return false;
    const handler = handlers[action];
    if (!handler) {
      if (!knownActions.has(action)) onUnknown(action, event);
      return false;
    }
    handler({ action, event, target });
    return true;
  };
}

export function actionNames(...handlerGroups) {
  return new Set(handlerGroups.flatMap((handlers) => Object.keys(handlers)));
}

function defaultUnknownAction(action, event) {
  if (import.meta.env.DEV) console.warn(`Unhandled ${event?.type || 'DOM'} action: ${action}`);
}
