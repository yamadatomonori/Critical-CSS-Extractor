var tabId;

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
  chrome.tabs.executeScript(tabId, {file: 'content_script.js'});
}   
  
 
function executeContentScript(message, sender, sendResponse) {
  var tab = chrome.tabs.query({active: true, currentWindow: true}, function(tab) {
    chrome.tabs.create({
      active: false,
      url: tab[0].url
    });
  });
  
  executeCode('var ccss = new AKAM.CCSS();')
  .then(executeCode.bind(undefined, 'ccss.getCrossOriginStyleSheets();'))
  .then(inlineCrossOriginStyleSheets.bind(undefined, message.contents))
  .then(executeCode.bind(undefined, 'ccss.extractCriticalRules();'));
}


function executeCode(code) {
  var promise = new Promise(function(resolve, reject) {
    chrome.tabs.executeScript(tabId, {code: code}, function(results) {
      resolve(results[0]);
    });
  });
  
  return promise;
}


function inlineCrossOriginStyleSheets(contents, crossOriginStyleSheets) {
  contents = contents.filter(function(content) {
    return 0 <= crossOriginStyleSheets.indexOf(content.url);
  });
  
  var promise = Promise.all(contents.map(function(content) {
    return applyRule(content.cssText);
  }));
  
  return promise;
}


function applyRule(cssText) {
  cssText = cssText.replace(/\\/g, '\\\\');
  cssText = cssText.replace(/'/g, '\\\'');
  cssText = cssText.replace(/\n/g, '');
  cssText = cssText.replace(/\r/g, '');
    
  return executeCode('ccss.applyRules(\'' + cssText + '\', \'external\')');
}


function devToolsListener(message, sender, sendResponse) {
  tabId = message.tabId;
  messageHandlers[message.handler](message, sender, sendResponse);
}