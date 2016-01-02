
/**
 * @constructor
 */
var Panel = function() {
  window.addEventListener('load', this.handleLoadWindow.bind(this), false);
};


/**
 * @this {Panel}
 */
Panel.prototype.handleLoadWindow = function() {
  document.getElementsByTagName('button')[0].addEventListener('click', this.handleClickButton.bind(this));
  document.getElementById('go-to-options').addEventListener('click', this.handleClickGoToOption.bind(this));

  this.backgroundPageConnection = chrome.runtime.connect({
    name: 'devtools-page'
  });
  
  this.sendMessage({handler: 'injectContentScript'});
};


/**
 * @this {Panel}
 */
Panel.prototype.handleClickButton = function() {
  this.getResources()
  .then(this.getContents.bind(this))
  .then(this.parseCSSText.bind(this));
};

 
/**
 * @return {Promise} .
 * @this {Panel}
 */
Panel.prototype.getResources = function() {
  var promise = new Promise(function(resolve, reject) {
    chrome.devtools.inspectedWindow.getResources(function(resources) {
      resolve(resources);
    });
  });
  
  return promise;
};


/**
 * @param {Array} resources .
 * @return {Promise} .
 * @this {Panel}
 */
Panel.prototype.getContents = function(resources) {
  resources = resources.filter(function(resource) {
    return resource.type == 'stylesheet';
  });
    
  return Promise.all(resources.map(this.getContent));
};


/**
 * @param {Resource} resource .
 * @return {Promise} .
 * @see https://developer.chrome.com/extensions/devtools_inspectedWindow#type-Resource
 * @this {Panel}
 */
Panel.prototype.getContent = function(resource) {
  var promise = new Promise(function(resolve, reject) {
    resource.getContent(function(content) {
      resolve({cssText: content, url: resource.url});
    });
  });
  
  return promise;
};


/**
 * @param {Array<content>} contents .
 * @see https://developer.chrome.com/extensions/devtools_inspectedWindow#type-Resource
 * @this {Panel}
 */
Panel.prototype.parseCSSText = function(contents) {
  this.sendMessage({
    handler: 'executeContentScript',
    contents: contents.map(this.mapContents, this)});
};


/**
 * @param {Object} message .
 * @this {Panel}
 */
Panel.prototype.sendMessage = function(message) {
  message.tabId = chrome.devtools.inspectedWindow.tabId;
  this.backgroundPageConnection.postMessage(message);
};


/**
 * @param {content} content .
 * @see https://developer.chrome.com/extensions/devtools_inspectedWindow#type-Resource
 * @this {Panel}
 */
Panel.prototype.mapContents = function(content) {
  var urls = content.cssText.match(/url\(.+?\)/g) || [];
    
  return urls.reduce(this.reduceUrls.bind(this), content);
};


/**
 * @param {string} url .
 * @this {Panel} .
 */
Panel.prototype.reduceUrls = function(content, url) {
  var patterns = [
    /url\(([^:]+?)\)/,
    /url\('([^:]+?)'\)/,
    /url\("([^:]+?)"\)/
  ];

  this.matches = [];
  
  patterns.some(this.somePatterns.bind(this, url));
  
  if (2 <= this.matches.length) {
    var cssText = content.cssText;
    
    cssText =
        cssText
          .split(this.matches[0])
          .join('url(' + this.getAbsolutePath(content.url, this.matches[1]) + ')');
    
    content.cssText = cssText;
  }
  
  return content;
};
  
  
/*
 * @param {string} url .
 * @param {RegExp} pattern .
 * @return {boolean} .
 * @this {Panel}
 */
Panel.prototype.somePatterns = function(url, pattern) {
  var matches = url.match(pattern);
  
  if (matches) {
    this.matches = matches;
    
    return true;
  } else {
    return false;
  }
};
    
    
/**
 * @param {string} baseUrl .
 * @param {string} relativePath .
 * @return {string} .
 * @this {Panel}
 */
Panel.prototype.getAbsolutePath = function(baseUrl, relativePath) {
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
};


/**
 * @this {Panel}
 */
Panel.prototype.handleClickGoToOption = function() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  } 
};


new Panel();