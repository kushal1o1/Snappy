/* global browser, chrome */
const API = (() => {
  const isFirefox = typeof browser !== 'undefined' && browser.runtime;
  const api = isFirefox ? browser : chrome;

  return {
    tabs: {
      query: (opts) => api.tabs.query(opts),
      create: (opts) => api.tabs.create(opts),
    },
    windows: {
      create: (opts) => api.windows.create(opts),
    },
    storage: {
      get: (keys) => api.storage.local.get(keys),
      set: (data) => api.storage.local.set(data),
      remove: (keys) => api.storage.local.remove(keys),
    },
    runtime: {
      sendMessage: (msg) => api.runtime.sendMessage(msg),
      onMessage: {
        addListener: (fn) => api.runtime.onMessage.addListener(fn),
      },
    },
    sidePanel: isFirefox
      ? { open: () => api.sidebarAction.open() }
      : { open: (opts) => api.sidePanel.open(opts) },
  };
})();