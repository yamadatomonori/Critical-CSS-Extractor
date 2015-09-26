var AKAM = AKAM || {};


/**
 * @constructor
 */
AKAM.CCSS = function() {
};



/**
 * @type {Array}
 */
AKAM.CCSS.prototype.criticalRules = [];


/**
 * @const {Array<string>
 */
AKAM.CCSS.prototype.PSEUDO_ELEMENTS = [
  'after',
  'before',
  'first-letter',
  'first-line',
  'selection'
];


/**
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.extractCriticalRules = function() {
  this.parseStyleSheets(document.styleSheets);
  
  this.removeCurrentStyles();

  var criticalRules = this.criticalRules.reverse().join(' ');
  
  this.applyRules(criticalRules, 'critical');
  
  this.downloadCriticalRules(criticalRules); 
  
  document.title = 'Extracted: ' + document.title;
  
  chrome.runtime.sendMessage({cssRule: criticalRules});
};


/**
 * @param {StyleSheetList} styleSheets
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.parseStyleSheets = function(styleSheets) {
  for (var i = styleSheets.length; i--;) {
    this.parseStyleSheet(styleSheets[i]);
  }
};
  

/**
 * @param {CSSStyleSheet} styleSheet
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.parseStyleSheet = function(styleSheet) {
  var rules = styleSheet.rules;
  
  if (rules && 0 < rules.length) {
    
    var rule;

    for (var i = rules.length; i--;) {
      rule = rules[i];
      
      if (rule.constructor == CSSImportRule) {
        this.parseStyleSheet(rule.styleSheet);
      } else {
        var href = rule.href || location.href;
        
      	this.parseCSSRule(rule, href.match(/https?:\/\/(.+?)\//));
      }
    }
  }
};


/**
 * @param {CSSStyleRule} rule .
 * @param {string} host .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.parseCSSRule = function(rule, host) {
  switch(rule.constructor) {
    case CSSMediaRule:
      if (window.matchMedia(rule.media.mediaText).matches === true) {
        for (var i = rule.cssRules.length; i--;) {
           this.parseCSSRule(rule.cssRules[i]);
        }
      }
      break;
    case CSSFontFaceRule:
    case CSSKeyframesRule:
      this.criticalRules.push(rule.cssText);
      break;
    default:
      var elements = this.querySelectorAll(rule.selectorText);
  
      for (var j = elements.length; j--;) {
        if (this.isInViewport(elements[j].getBoundingClientRect())) {
          
          this.criticalRules.push(rule.cssText);
        
          break;
        }
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
  
  if (nodes.length === 0 && /:/.test(selectorText)) {
    nodes = this.mapSelectorTextNodes(selectorText.split(':')[0]);
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
  return new RegExp(':{1,2}(' + this.PSEUDO_ELEMENTS.join('|') + ')$');
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
  if (rect.bottom < 0) {
    return false;
  }

  if (window.screen.height < rect.top) {
    return false;
  }

  if (rect.right < 0) {
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
  var links = document.querySelectorAll('link[rel=stylesheet]');

  for (var i = links.length; i--;) {
    links[i].rel = '';
  }
  
  var styles = document.querySelectorAll('style[data-external=true]');
  
  for (var j = styles.length; j--;) {
    styles[j].parentNode.removeChild(styles[j]);
  }
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