
var AKAM = AKAM || {};


/**
 * @constructor
 */
AKAM.CCSS = function() {
  
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
 * @const {RegEx}
 */
AKAM.CCSS.prototype.PSEUDO_ELEMENTS_PATTERN = new RegExp('::(:?' + AKAM.CCSS.prototype.PSEUDO_ELEMENTS.join('|') + ')$');


/**
 * @enum {function(this:AKAM.CCSS, CSSRule, Array<string>, Generator=)
 */
AKAM.CCSS.prototype.switchCSSRule = {};
 
 
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
  var cssRule = CSSRule.prototype;
  
  this.switchCSSRule[cssRule.FONT_FACE_RULE] = this.caseRuleFontFace.bind(this);
  this.switchCSSRule[cssRule.IMPORT_RULE] = this.caseRuleImport.bind(this);
  this.switchCSSRule[cssRule.KEYFRAMES_RULE] = this.caseRuleKeyframes.bind(this);
  this.switchCSSRule[cssRule.MEDIA_RULE] = this.caseRuleMedia.bind(this);
  this.switchCSSRule[cssRule.STYLE_RULE] = this.caseRuleStyle.bind(this);
  
  var criticalRules = [];

  this.generator = this.forStyleSheets(criticalRules);

  this.incrementCssRule(criticalRules);
};


/**
 * @param {CSSFontFaceRule} rule .
 * @param {Array<string>} criticalRules .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.caseRuleFontFace = function(rule, criticalRules) {
  criticalRules.push(rule.cssText);
  
  this.incrementCssRule(criticalRules);
};


/**
 * @param {CSSFontFaceRule} rule .
 * @param {Array<string>} criticalRules .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.caseRuleImport = function(rule, criticalRules) {
  chrome.runtime.sendMessage({href: rule.href}, this.applyRulesExternal.bind(this, criticalRules));
};


/**
 * @param {Array} criticalRules .
 * @param {Object} response .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.handleResponse = function(criticalRules, response) {
  this.applyRules(response.cssText, 'external');
};


/**
 * @param {CSSKeyframesRule} rule .
 * @param {Array<string>} criticalRules .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.caseRuleKeyframes = function(rule, criticalRules) {
  criticalRules.push(rule.cssText);
  
  this.incrementCssRule(criticalRules);
};


/**
 * @param {CSSMediaRule} rule .
 * @param {Array<string>} criticalRules .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.caseRuleMedia = function(rule, criticalRules) {
  if (window.matchMedia(rule.media.mediaText).matches === true) {
      this.applyRules([].reduce.call(rule.cssRules, function(cssText, rule) {
        return cssText + ' ' + rule.cssText;
      }, ''), 'media');
  }
  
  this.incrementCssRule(criticalRules);
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
  
  this.incrementCssRule(criticalRules);
};


/**
 * @param {Array} criticalRules .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.forStyleSheets = function* (criticalRules) {
  for (var i = 0; i < document.styleSheets.length; i++) {
    var styleSheet = document.styleSheets[i];
    this.currentStyleSheet = styleSheet;
    
    if (this.isCrossOriginStyleSheet(styleSheet)) {
      yield this.getCrossOriginCssRules(styleSheet.href, criticalRules);
    } else {
      //yield* this.forCssRules(styleSheet.cssRules);
      var cssRules = styleSheet.cssRules;
      
      for (var j = 0; j < cssRules.length; j++) {
        yield cssRules[j];
      }

    }
  }
};


/**
 * @param {string} href .
 * @param {Array} criticalRules .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.getCrossOriginCssRules = function (href, criticalRules) {
  chrome.runtime.sendMessage({href: href}, this.applyRulesExternal.bind(this, criticalRules));
};


/**
 * @param {Array} criticalRules .
 * @param {Object} response .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.applyRulesExternal = function(criticalRules, response) {
  var style = this.applyRules(response.cssText, 'external');
  
  this.incrementCssRule(criticalRules);
};


/**
 * @param {CSSRuleList} cssRules .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.forCssRules = function* (cssRules) {
  for (var j = 0; j < cssRules.length; j++) {
    yield cssRules[j];
  }
};

  
/**
 * @param {Array} criticalRules .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.incrementCssRule = function(criticalRules) {
  var ret = this.generator.next();

  if (ret.done) {
    this.downloadCriticalRules(criticalRules); 
  
    //chrome.runtime.sendMessage({cssRule: criticalRules});
    
    this.getPromiseStorage().then(function(items) {
      if (items.perfRemove) {
        this.removeCurrentStyles();
        
        this.applyRules(criticalRules.join(' '), 'critical');
    
        document.title = 'Extracted: ' + document.title;
      }
    }.bind(this));
  } else {
    
    if (ret.value instanceof CSSRule) {
      var rule = ret.value;
      this.switchCSSRule[rule.type](rule, criticalRules);
    }
  }
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
  selectorText = selectorText.replace(this.PSEUDO_ELEMENTS_PATTERN, '');

  return selectorText;
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
 * @return {HTMLStyleElement}
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.applyRules = function(rules, type) {
  var style = document.createElement('style');
  style.insertAdjacentText('afterBegin', rules);
  style.dataset[type] = 'true';

  var currentStyleNode = this.currentStyleSheet.ownerNode;
  
  if (currentStyleNode) {
    currentStyleNode.parentNode.insertBefore(style, currentStyleNode.nextSibling);
  } else {
    document.head.appendChild(style);
  }
  
  return style;
};


/**
 * @param {string} criticalRules .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.downloadCriticalRules = function(criticalRules) {
  var a = document.createElement('a');
  var file = new Blob([criticalRules], {type: 'text/css'});
  a.href = URL.createObjectURL(file);
  a.download = 'critical_' + document.title + '.css';
  a.click();
};