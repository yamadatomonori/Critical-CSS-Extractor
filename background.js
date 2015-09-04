var targetTabId;

chrome.browserAction.onClicked.addListener(handleClick);


function handleClick(tab) {
  targetTabId = tab.id;

  chrome.runtime.onMessage.addListener(handleMessage);
  
  chrome.tabs.executeScript(targetTabId, {file: "critical_css.js"});
}


function handleMessage(request, sender, sendResponse) {
  if (targetTabId == sender.tab.id) {
    console.log(request.cssRule);
  }
}
