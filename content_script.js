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
        for (var i = rule.cssRules.length; i--;) {
          this.parseCSSRule(rule.cssRules[i]);
        }
      break;
    case CSSFontFaceRule:
    case CSSKeyframesRule:
      this.criticalRules.push(rule.cssText);
      break;
    default:
      var elements = document.querySelectorAll(rule.selectorText.split(':')[0]);
  
      for (var j = elements.length; j--;) {
        if (this.isInViewport(elements[j].getBoundingClientRect())) {
          
          this.criticalRules.push(rule.cssText);
        
          break;
        }
      }
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