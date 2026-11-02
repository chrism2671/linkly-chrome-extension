var CREATE_LINK_URL = 'https://app.linklyhq.com/app/chrome-plugin/new?url=';
var CONTEXT_MENU_ID = 'linkly-shorten-link';

function openLinkCreator(url) {
  chrome.tabs.create({
    url: CREATE_LINK_URL.concat(encodeURIComponent(url)),
  });
}

// Pulls a URL out of highlighted text, e.g. a plain-text URL pasted by an AI
// chat tool that isn't a real hyperlink.
function urlFromSelection(text) {
  var trimmed = (text || '').trim();
  var match = trimmed.match(/https?:\/\/[^\s<>"']+/i);
  if (match) {
    return match[0].replace(/[.,;:!?)\]]+$/, '');
  }
  // A bare domain such as "example.com/page" gets a scheme; anything else is
  // passed through for the Linkly form to validate.
  if (trimmed && !/\s/.test(trimmed) && trimmed.indexOf('.') > 0) {
    return 'https://'.concat(trimmed.replace(/[.,;:!?)\]]+$/, ''));
  }
  return trimmed;
}

chrome.action.onClicked.addListener(function(tab) {
  openLinkCreator(tab.url);
});

// Menu items persist across browser restarts, so register once on install/update.
chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.removeAll(function() {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Shorten with Linkly',
      contexts: ['link', 'selection'],
    });
  });
});

chrome.contextMenus.onClicked.addListener(function(info) {
  if (info.menuItemId !== CONTEXT_MENU_ID) {
    return;
  }
  var url = info.linkUrl || urlFromSelection(info.selectionText);
  if (url) {
    openLinkCreator(url);
  }
});

chrome.runtime.onMessageExternal.addListener(function(
  msg,
  sender,
  sendResponse
) {
  sendResponse({ installed: true });
});
