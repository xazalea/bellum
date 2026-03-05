// Polyfill for async_hooks module in Cloudflare Workers / Edge Runtime
// This provides a minimal implementation of AsyncLocalStorage for edge environments

// In edge runtime, we can't use Node.js async_hooks
// We provide a minimal AsyncLocalStorage implementation that uses global state

class AsyncLocalStorage {
  constructor() {
    this._store = undefined;
  }

  getStore() {
    return this._store;
  }

  run(store, callback, ...args) {
    const previousStore = this._store;
    this._store = store;
    try {
      return callback(...args);
    } finally {
      this._store = previousStore;
    }
  }

  exit(callback, ...args) {
    const previousStore = this._store;
    this._store = undefined;
    try {
      return callback(...args);
    } finally {
      this._store = previousStore;
    }
  }

  enterWith(store) {
    this._store = store;
  }
}

// Export the polyfill
module.exports = {
  AsyncLocalStorage,
  AsyncResource: class AsyncResource {
    constructor(type, triggerAsyncId) {
      this.type = type;
      this.triggerAsyncId = triggerAsyncId;
    }
    runInAsyncScope(fn, thisArg, ...args) {
      return fn.call(thisArg, ...args);
    }
    emitDestroy() {}
    asyncId() { return 0; }
    triggerAsyncId() { return 0; }
  },
  createHook: () => ({
    enable: () => {},
    disable: () => {},
  }),
  executionAsyncId: () => 0,
  triggerAsyncId: () => 0,
  hookNames: {},
};