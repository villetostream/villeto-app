/** Defer a state update to the next macrotask (avoids React 19 + DevTools conflicts). */
export function deferStateUpdate(fn: () => void): void {
  window.setTimeout(fn, 0);
}
