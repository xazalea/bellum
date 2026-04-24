/**
 * Empty stub for gpt4free on CF Pages edge runtime
 * 
 * The actual gpt4free code is loaded at runtime via almostnode's Node.js
 * compatibility layer (nodejs_als flag). This stub prevents webpack from
 * bundling the large gpt4free library (~9MB) into each edge function.
 * 
 * When running on CF Pages with almostnode, the actual module will be
 * available via the module system at runtime.
 */

// Re-export from lib/server/ai-gpt4free which handles the dynamic import
// The AI routes use dynamic import() which webpack will handle differently

module.exports = {
  Site: {},
  ModelType: {},
  getChatModel: () => ({
    get: () => null,
    forEach: () => {},
  }),
  Chat: function() {},
  Event: { error: 'error', message: 'message', done: 'done', search: 'search' },
  EventStream: class EventStream {
    write() {}
    end() {}
    stream() { return { on: () => {}, pipe: () => {} }; }
  },
};

module.exports.default = module.exports;