// Polyfill for async_hooks for edge runtime
// This provides a minimal implementation that doesn't rely on Node.js

class AsyncHook {
  constructor({ init, before, after, destroy, promiseResolve } = {}) {
    this._init = init;
    this._before = before;
    this._after = after;
    this._destroy = destroy;
    this._promiseResolve = promiseResolve;
  }

  enable() {
    return this;
  }

  disable() {
    return this;
  }
}

const asyncHooks = {
  // Create a new async hook
  createHook(callbacks) {
    return new AsyncHook(callbacks);
  },

  // Execution async id (returns 0 as a placeholder)
  executionAsyncId() {
    return 0;
  },

  // Trigger async id (returns 0 as a placeholder)
  triggerAsyncId() {
    return 0;
  },

  // Async wrap (not implemented for edge)
  asyncWrap: undefined,

  // Current execution context (placeholder)
  currentId: 0,

  // Constants
  init: 'init',
  before: 'before',
  after: 'after',
  destroy: 'destroy',
  promiseResolve: 'promiseResolve',
};

module.exports = asyncHooks;