var AKAM = AKAM || {};


/**
 * @constructor
 * @param {Array} resources .
 */
AKAM.CCSS = function(resources) {
          
  /**
   * @param {string} href .
   * @return {string} .
   * @this {AKAM.CCSS}
   */
  this.getCssText = function(href) {
    return resources[href];
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
  
  
  this.init.call(this);
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
 * @const {RegEx}
 */
AKAM.CCSS.prototype.PSEUDO_ELEMENTS_PATTERN = new RegExp('::(:?' + AKAM.CCSS.prototype.PSEUDO_ELEMENTS.join('|') + ')$');


/**
 * @enum {function(this:AKAM.CCSS, CSSRule, Array<string>)
 */
AKAM.CCSS.prototype.switchCssRule = {};


/**
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.init = function() {
  var cssRule = CSSRule.prototype;
  
  this.switchCssRule[cssRule.FONT_FACE_RULE] = this.caseRuleFontFace.bind(this);
  this.switchCssRule[cssRule.IMPORT_RULE] = this.caseRuleImport.bind(this);
  this.switchCssRule[cssRule.KEYFRAMES_RULE] = this.caseRuleKeyframes.bind(this);
  this.switchCssRule[cssRule.MEDIA_RULE] = this.caseRuleMedia.bind(this);
  this.switchCssRule[cssRule.STYLE_RULE] = this.caseRuleStyle.bind(this);  
};


/**
 * @param {CSSFontFaceRule} rule .
 * @param {Array<string>} criticalRules .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.caseRuleFontFace = function(rule, criticalRules) {
  criticalRules.push(rule.cssText);
};


/**
 * @param {CSSImportRule} rule .
 * @param {Array<string>} criticalRules .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.caseRuleImport = function(rule, criticalRules) {
  this.parseStyleSheet(criticalRules, rule.styleSheet);
};



/**
 * @param {CSSKeyframesRule} rule .
 * @param {Array<string>} criticalRules .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.caseRuleKeyframes = function(rule, criticalRules) {
  criticalRules.push(rule.cssText);
};


/**
 * @param {CSSMediaRule} rule .
 * @param {Array<string>} criticalRules .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.caseRuleMedia = function(rule, criticalRules) {
  if (window.matchMedia(rule.media.mediaText).matches === true) {
    [].forEach.call(rule.cssRules, function(rule) {
      criticalRules.push(rule.cssText);
    });
  }
};


/**
 * @param {CSSStyleRule} rule .
 * @param {Array<string>} criticalRules .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.caseRuleStyle = function(rule, criticalRules) {
  var elements = this.querySelectorAll(rule.selectorText);
        
  var isInViewport = [].some.call(elements, function(element) {
    return this.isInViewport(element.getBoundingClientRect());
  }, this);
  
  if (isInViewport) {
    criticalRules.push(rule.cssText);
  }
};


/**
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.extractCriticalRules = function() {
  var criticalRules = [];
  var styleSheet;

  for (var i = 0; i < document.styleSheets.length; i++) {
    styleSheet = document.styleSheets[i];
    this.currentReferenceElement = styleSheet.ownerNode.nextSibling;
    
    this.parseStyleSheet(criticalRules, styleSheet);
  }

  this.downloadCriticalRules(criticalRules); 
  
  //chrome.runtime.sendMessage({cssRule: criticalRules});
  
  this.getPromiseStorage().then(function(items) {
    if (items.perfRemove) {
      this.removeCurrentStyles();
      
      this.applyRules(criticalRules.join(' '), 'critical');
  
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
  if (styleSheet.cssRules === null && styleSheet.href) {
    this.applyRules(this.getCssText(styleSheet.href), 'external');
  }

  return [].reduce.call(
      styleSheet.rules || [], this.parseCSSRule.bind(this, styleSheet.href), criticalRules);
};


/**
 * @param {Array<string>} criticalRules .
 * @param {CSSStyleRule} rule .
 * @return {Array<string>} .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.parseCSSRule = function(href, criticalRules, rule) {
  this.switchCssRule[rule.type](rule, criticalRules);
  
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
    nodes = [].map.call(nodeList, function(node) {
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
  return selectorText.replace(this.PSEUDO_ELEMENTS_PATTERN, '');
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
  [].forEach.call(
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
  style.insertAdjacentText('afterBegin', rules);
  style.dataset[type] = 'true';

  var referenceElement = this.currentReferenceElement;
  
  if (referenceElement) {
    referenceElement.parentNode.insertBefore(style, referenceElement);
  } else {
    document.head.appendChild(style);
  }
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