var tabId;
var cssTexts = [];

chrome.runtime.onConnect.addListener(function(port) {

  if (port.name == 'devtools-page') {
    var devToolsListener = function(message, sender, sendResponse) {
      tabId = message.tabId;
      
      cssTexts = message.cssTexts.filter(function(cssText) {
        return typeof cssText == 'string';
      });
      
      injectContentScript()
      .then(initiateConstructor)
      .then(applyRules)
      .then(extractCriticalRules);
    };
      
    port.onMessage.addListener(devToolsListener);
  }
});


function injectContentScript() {
  var promise = new Promise(function(resolve, reject) {
    chrome.tabs.executeScript(tabId, {file: 'content_script.js'}, function() {
      resolve();
    });
  });
  
  return promise;
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
  var promise = new Promise(function(resolve, reject) {
    
    cssText = cssText.replace(/'/g, '\\\'');
    cssText = cssText.replace(/\n/g, '');
    cssText = cssText.replace(/\r/g, '');
    
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