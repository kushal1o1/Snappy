/* global chrome, browser */
if (typeof chrome !== 'undefined' && chrome['sidePanel'] && typeof chrome['sidePanel']['setPanelBehavior'] === 'function') {
  chrome['sidePanel']['setPanelBehavior']({ openPanelOnActionClick: true });
}

if (typeof browser !== 'undefined' && browser.browserAction) {
  browser.browserAction.onClicked.addListener(() => {
    browser.sidebarAction.open();
  });
}