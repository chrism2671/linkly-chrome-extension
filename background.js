chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.create({
    url: 'https://app.linklyhq.com/app/chrome-plugin/new?url=' + tab.url,
  });
});
