var backgroundPageConnection;


window.onload = function() {
  document.getElementsByTagName('button')[0].onclick = handleClick;
  
  document.querySelector('#go-to-options').addEventListener('click', handleClickGoToOption);

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
  sendMessage({
    handler: 'executeContentScript',
    contents: contents.map(mapContents)});
}


function mapContents(content) {
  var relativePathes = content.cssText.match(/url\(.+?\)/g) || [];
    
  relativePathes.forEach(function(relativePath) {
    var patterns = [
      /url\(([^:]+?)\)/,
      /url\('([^:]+?)'\)/,
      /url\("([^:]+?)"\)/
    ];
  
    patterns.some(function(pattern) {
      var matches = relativePath.match(new RegExp(pattern));
      
      if (matches) {
        relativePath = matches[1];
        
        return true;
      } else {
        return false;
      }
    });
    
    var replacement = 'url(' + getAbsolutePath(content.url, relativePath) + ')';
    
    var cssText = content.cssText;
    cssText = cssText.replace((new RegExp('url\\(' + relativePath + '\\)')), replacement);
    cssText = cssText.replace((new RegExp('url\\(\'' + relativePath + '\'\\)')), replacement);
    cssText = cssText.replace((new RegExp('url\\("' + relativePath + '"\\)')), replacement);
    content.cssText = cssText;
  });
  
  return content;
}


function getAbsolutePath(baseUrl, relativePath) {
  var directoriesAbsolute = baseUrl.split('/');
  var directoriesRelative = relativePath.split('/');
  
  directoriesAbsolute.pop();
  
  directoriesAbsolute = directoriesRelative.reduce(function(directoriesAbsolute, directoryRelative) {
    if (directoryRelative == '.') {
    } else if (directoryRelative == '..') {
      directoriesAbsolute.pop();
    } else if (directoryRelative === '') {
      directoriesAbsolute.splice(3);
    } else {
      directoriesAbsolute.push(directoryRelative);
    }
    
    return directoriesAbsolute;
  }, directoriesAbsolute);
  
  return directoriesAbsolute.join('/');
}


function sendMessage(message) {
  message.tabId = chrome.devtools.inspectedWindow.tabId;
  backgroundPageConnection.postMessage(message);
}


function handleClickGoToOption() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  } 
}