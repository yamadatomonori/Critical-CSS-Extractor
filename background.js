var messageHandlers = {};


chrome.runtime.onConnect.addListener(handleConnect);

  
function handleConnect(port) {
  if (port.name == 'devtools-page') {
    messageHandlers.injectContentScript = injectContentScript;
    messageHandlers.executeContentScript = executeContentScript;
    
    port.onMessage.addListener(devToolsListener);
  }
}


function injectContentScript(message, sender, sendRequest) {
  chrome.tabs.executeScript(message.tabId, {file: 'content_script.js'});
}   
  
 
function executeContentScript(message, sender, sendResponse) {
  var tabId = message.tabId;
  
  chrome.tabs.get(tabId, function(tab) {
    chrome.tabs.create({
      active: false,
      url: tab.url
    });
  });
  
  executeCode(tabId, 'var ccss = new AKAM.CCSS();')
  .then(executeCode.bind(undefined, tabId, 'ccss.getCrossOriginStyleSheets();'))
  .then(inlineCrossOriginStyleSheets.bind(undefined, tabId, message.contents))
  .then(executeCode.bind(undefined, tabId, 'ccss.extractCriticalRules();'));
}


function executeCode(tabId, code) {
  var promise = new Promise(function(resolve, reject) {
    chrome.tabs.executeScript(tabId, {code: code}, function(results) {
      resolve(results[0]);
    });
  });
  
  return promise;
}


function inlineCrossOriginStyleSheets(tabId, contents, crossOriginStyleSheets) {
  contents = contents.filter(function(content) {
    return 0 <= crossOriginStyleSheets.indexOf(content.url);
  });
  
  var promise = Promise.all(contents.map(function(content) {
    return applyRule(tabId, content.cssText);
  }));
  
  return promise;
}


function applyRule(tabId, cssText) {
  cssText = cssText.replace(/\\/g, '\\\\');
  cssText = cssText.replace(/'/g, '\\\'');
  cssText = cssText.replace(/\n/g, '');
  cssText = cssText.replace(/\r/g, '');
    
  return executeCode(tabId, 'ccss.applyRules(\'' + cssText + '\', \'external\')');
}


function devToolsListener(message, sender, sendResponse) {
  tabId = message.tabId;
  messageHandlers[message.handler](message, sender, sendResponse);
}


var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-68451209-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();