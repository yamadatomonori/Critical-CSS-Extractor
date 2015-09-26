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
  initiateConstructor()
  .then(applyRules.bind(undefined, message.contents))
  .then(extractCriticalRules);
}


function initiateConstructor() {
  var promise = new Promise(function(resolve, reject) {
    chrome.tabs.executeScript(tabId, {code: 'var ccss = new AKAM.CCSS();'}, function() {
      resolve();
    });
  });
  
  return promise;
}


function applyRules(contents) {
  var promise = Promise.all(contents.map(function(content) {
    return applyRule(content.cssText);
  }));
  
  return promise;
}


function applyRule(cssText) {
  cssText = cssText.replace(/'/g, '\\\'');
  cssText = cssText.replace(/\n/g, '');
  cssText = cssText.replace(/\r/g, '');
    
  var promise = new Promise(function(resolve, reject) {
    chrome.tabs.executeScript(tabId, {code: 'ccss.applyRules(\'' + cssText + '\', \'external\')'}, function() {
      resolve();
    });
  });
  
  return promise;
}


function extractCriticalRules() {
  var promise = new Promise(function(resolve, reject) {
    chrome.tabs.executeScript(tabId, {code: 'ccss.extractCriticalRules();'}, function() {
      resolve();
    });
  });
  
  return promise;
}
     
     
function devToolsListener(message, sender, sendResponse) {
  tabId = message.tabId;
  messageHandlers[message.handler](message, sender, sendResponse);
}