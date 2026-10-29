var CREATE_LINK_URL = 'https://app.linklyhq.com/app/chrome-plugin/new?url=';
var CONTEXT_MENU_ID = 'linkly-shorten-link';

function openLinkCreator(url) {
  chrome.tabs.create({
    url: CREATE_LINK_URL.concat(encodeURIComponent(url)),
  });
}

chrome.action.onClicked.addListener(function(tab) {
  openLinkCreator(tab.url);
});

// Menu items persist across browser restarts, so register once on install/update.
chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Shorten with Linkly',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(function(info) {
  if (info.menuItemId === CONTEXT_MENU_ID && info.linkUrl) {
    openLinkCreator(info.linkUrl);
  }
});

chrome.runtime.onMessageExternal.addListener(function(
  msg,
  sender,
  sendResponse
) {
  sendResponse({ installed: true });
});
