var AKAM = AKAM || {};


/**
 * @constructor
 */
AKAM.CCSS = function() {
  var crossOriginStyleSheets =
      Array.prototype.filter.call(document.styleSheets, this.isCrossOriginStyleSheet).
      map(function(styleSheet) {
        return styleSheet.href;
      });
          
          
  /**
   * @return {Array<string>} .
   */
  this.getCrossOriginStyleSheets = function() {
    return crossOriginStyleSheets;
  };
  
  
  var promiseStorage = new Promise(function(resolve, reject) {
    chrome.storage.sync.get({
      perfRemove: true,
      perfWindow: true
    }, function(items) {
      resolve(items);
    });
  });
  
  
  /**
   * @return {Promise} .
   */
  this.getPromiseStorage = function() {
    return promiseStorage;
  };
};


/**
 * @const {Array<string>}
 */
AKAM.CCSS.prototype.PSEUDO_ELEMENTS = [
  'after',
  'before',
  'first-letter',
  'first-line',
  'selection',
  '-webkit-\\S+'
];


/**
 * @param {CSSStyleSheet}
 * @return {boolean}
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.isCrossOriginStyleSheet = function(styleSheet) {
  return styleSheet.href && styleSheet.rules === null;
};


/**
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.extractCriticalRules = function() {
  var criticalRules = Array.prototype.reduce.call(
      document.styleSheets, this.parseStyleSheet.bind(this), []).join(' ');

  this.downloadCriticalRules(criticalRules); 
  
  chrome.runtime.sendMessage({cssRule: criticalRules});
  
  this.getPromiseStorage().then(function(items) {
    if (items.perfRemove) {
      this.removeCurrentStyles();
      
      this.applyRules(criticalRules, 'critical');
  
      document.title = 'Extracted: ' + document.title;
    }
  }.bind(this));
};


/**
 * @param {Array<string>} criticalRules .
 * @param {CSSStyleSheet} styleSheet
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.parseStyleSheet = function(criticalRules, styleSheet) {
  return Array.prototype.reduce.call(
      styleSheet.rules || [], this.parseCSSRule.bind(this), criticalRules);
};


/**
 * @param {Array<string>} criticalRules .
 * @param {CSSStyleRule} rule .
 * @return {Array<string>} .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.parseCSSRule = function(criticalRules, rule) {
  switch(rule.constructor) {
    case CSSFontFaceRule:
    case CSSKeyframesRule:
      criticalRules.push(rule.cssText);
      break;
    case CSSImportRule:
      this.parseStyleSheet(criticalRules, rule.styleSheet);
      break;
    case CSSMediaRule:
      if (window.matchMedia(rule.media.mediaText).matches === true) {
        Array.prototype.forEach.call(rule.cssRules, function(rule) {
          this.parseCSSRule(criticalRules, rule);
        }, this);
      }
      break;
    default:
      var elements = this.querySelectorAll(rule.selectorText);
      
      var isInViewport = Array.prototype.some.call(elements, function(element) {
        return this.isInViewport(element.getBoundingClientRect());
      }, this);
      
      if (isInViewport) {
        criticalRules.push(rule.cssText);
      }
  }
  
  return criticalRules;
};


/**
 * @param {string} selectorTextUnion .
 * @return {Array} .
 */
AKAM.CCSS.prototype.querySelectorAll = function(selectorTextUnion) {
  return selectorTextUnion.split(',')
      .map(this.mapSelectorTextNodes, this)
      .reduce(function(nodesLeft, nodesRight) {
          return nodesLeft.concat(nodesRight);
      });
};


/**
 * @param {string} selectorText .
 * @return {Array<Node>} .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.mapSelectorTextNodes = function(selectorText) {
  selectorText = this.removePseudoElements(selectorText);
  
  var nodeList;
  
  try {
    nodeList = document.querySelectorAll(selectorText);
  } catch (er) {
    this.catchErrorDocumentQuerySelectorAll(er, selectorText);
  }
  
  var nodes = [];
  
  if (nodeList instanceof NodeList) {
    nodes = Array.prototype.map.call(nodeList, function(node) {
      return node;
    });
  }
  
  return nodes;
};


/**
 * @param {string} selectorText .
 * @return {string} .
 */
AKAM.CCSS.prototype.removePseudoElements = function(selectorText) {
  return selectorText.replace(this.getPatternPseudoElements(), '');
};


/**
 * @return {RegEx}
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.getPatternPseudoElements = function() {
  return new RegExp('::(:?' + this.PSEUDO_ELEMENTS.join('|') + ')$');
};


/**
 * @param {Error} er .
 * @param {string} selectorText .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.catchErrorDocumentQuerySelectorAll = function(er, selectorText) {
  switch (er.constructor) {
    case DOMException:
      if (er.code == DOMException.prototype.SYNTAX_ERR) {
        console.info('ignore invalid selectorText: ' + selectorText);
      } else {
        throw er;
      }
      
      break;
    default:
      throw er;
  }
};
 
 
/**
 * @param {ClientRect} rect .
 * @return {boolean} .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.isInViewport = function(rect) {
  if (window.screen.height < rect.top) {
    return false;
  }

  if (window.screen.width < rect.left) {
    return false;
  }

  return true;
};


/**
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.removeCurrentStyles = function() {
  Array.prototype.forEach.call(
      document.querySelectorAll('link, style'),
      function(element) {
        element.parentNode.removeChild(element);
      });
};


/**
 * @param {string} criticalRules .
 * @param {string} type .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.applyRules = function(rules, type) {
  var style = document.createElement('style');
  style.innerText = rules;
  style.dataset[type] = 'true';
  document.head.appendChild(style);
};


/**
 * @param {string} criticalRules .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.downloadCriticalRules = function(criticalRules) {
  var a = document.createElement("a");
  var file = new Blob([criticalRules], {type: 'text/css'});
  a.href = URL.createObjectURL(file);
  a.download = 'critical_' + document.title + '.css';
  a.click();
};