var tabId;
var cssTexts = [];

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
  cssTexts = message.cssTexts.filter(function(cssText) {
    return typeof cssText == 'string';
  });
  
  initiateConstructor().then(applyRules).then(extractCriticalRules);
}


function promiseExecuteScript(callback) {
  return new Promise(callback);
}

 
function initiateConstructor() {
  var promise = new Promise(function(resolve, reject) {
    chrome.tabs.executeScript(tabId, {code: 'var ccss = new AKAM.CCSS();'}, function() {
      resolve();
    });
  });
  
  return promise;
}


function applyRules() {
  var promise = Promise.all(cssTexts.map(function(cssText) {
    return applyRule(cssText);
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