// ===== EVENT BUS (core ↔ UI decoupling) =====
const _bus = new EventTarget();

function emit(name, detail) {
  _bus.dispatchEvent(new CustomEvent(name, { detail }));
}

function on(name, fn) {
  _bus.addEventListener(name, e => fn(e.detail));
}

// Remove a specific listener
function off(name, fn) {
  _bus.removeEventListener(name, e => fn(e.detail));
}
