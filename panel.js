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
  .then(parseCSSText);
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
      resolve({cssText: content, url: resource.url});
    });
  });
  
  return promise;
}


/**
 * @param {Array<content>} contents .
 * @see https://developer.chrome.com/extensions/devtools_inspectedWindow#type-Resource
 */
function parseCSSText(contents) {
  var relativePathes = [];
  var pattern = 'url\\((?:\\\'|"|)(\\..+?)\\)';
  
  contents = contents.map(function(content) {
    relativePathes = content.cssText.match(new RegExp(pattern, 'g')) || [];
    
    relativePathes.forEach(function(relativePath) {
      relativePath = relativePath.match(new RegExp(pattern))[1];
      
      content.cssText = 
          content.cssText
            .split(relativePath)
            .join(getAbsolutePath(
                content.url, relativePath));
    });
    
    return content;
  });
  
  sendMessage({handler: 'executeContentScript', contents: contents});
}


function getAbsolutePath(baseUrl, relativePath) {
  var directoriesAbsolutePath = baseUrl.split('/');
  var directoriesRelativePath = relativePath.split('/');
  
  directoriesAbsolutePath.pop();
  
  var directory = '';
  
  while((directory = directoriesRelativePath.shift())) {
    if (directory == '.') {
      continue;
    } else if (directory == '..') {
      directoriesAbsolutePath.pop();
    } else {
      directoriesAbsolutePath.push(directory);
    }
  }
  
  return directoriesAbsolutePath.join('/');
}


function sendMessage(message) {
  message.tabId = chrome.devtools.inspectedWindow.tabId;
  backgroundPageConnection.postMessage(message);
}