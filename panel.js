var backgroundPageConnection;


window.onload = function() {
  document.getElementsByTagName('button')[0].onclick = handleClick;

  backgroundPageConnection = chrome.runtime.connect({
    name: 'devtools-page'
  });
  
  sendMessage({handler: 'injectContentScript'});
};

 
function handleClick() {
  getResources()
  .then(getContents)
  .then(parseCSSTexts);
}


function getResources() {
  var promise = new Promise(function(resolve, reject) {
    chrome.devtools.inspectedWindow.getResources(function(resources) {
      resolve(resources);
    });
  });
  
  return promise;
}


function getContents(resources) {
  resources = resources.filter(function(resource) {
    return resource.type == 'stylesheet';
  });
    
  return Promise.all(resources.map(getContent));
}


function getContent(resource) {
  var promise = new Promise(function(resolve, reject) {
    resource.getContent(function(content) {
      resolve(content);
    });
  });
  
  return promise;
}


function parseCSSTexts(contents) {
  sendMessage({handler: 'executeContentScript', cssTexts: contents});
}


function sendMessage(message) {
  message.tabId = chrome.devtools.inspectedWindow.tabId;
  backgroundPageConnection.postMessage(message);
}