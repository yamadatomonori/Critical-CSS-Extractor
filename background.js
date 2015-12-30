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
  chrome.tabs.executeScript(message.tabId, {file: 'ga.js'});
  chrome.tabs.executeScript(message.tabId, {file: 'content_script.js'});
}   
  
 
function executeContentScript(message, sender, sendResponse) {
  var tabId = message.tabId;
  
  chrome.tabs.get(tabId, function(tab) {
    chrome.tabs.create({
      active: false,
      url: tab.url
    });
    
    var resources = message.content.reduce(function(prev, reource) {
      prev[resource.url] = resource.cssText;
      
      return prev;
    }, {});
    
    executeCode(tabId, 'var ccss = new AKAM.CCSS(' + JSON.stringify(resources) + ');')
    .then(executeCode.bind(undefined, tabId, 'ccss.extractCriticalRules();'));
  });
}


function executeCode(tabId, code) {
  var promise = new Promise(function(resolve, reject) {
    chrome.tabs.executeScript(tabId, {code: code}, function(results) {
      resolve(results[0]);
    });
  });
  
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