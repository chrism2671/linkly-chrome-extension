chrome.action.onClicked.addListener(function(tab) {
  chrome.tabs.create({
    url: 'https://app.linklyhq.com/app/chrome-plugin/new?url='.concat(tab.url),
  });
});

chrome.runtime.onMessageExternal.addListener(function(
  msg,
  sender,
  sendResponse
) {
  sendResponse({ installed: true });
});