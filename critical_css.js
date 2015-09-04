/**
 * @constructor
 */
var CCSS = function() {
  this.init.call(this);
};



/**
 * @type {Array}
 */
CCSS.prototype.cssRules = [];


/**
 * @this {CCSS}
 */
CCSS.prototype.init = function() {
  this.parseStyleSheets(document.styleSheets);

  var links = document.querySelectorAll('link[rel=stylesheet]');

  for (var i = links.length; i--;) {
    links[i].rel = '';
  }

  var cssRules = this.cssRules.join(' ');
  
  var style = document.createElement('style');
  style.innerText = cssRules;
  style.dataset.critical = '1';
  document.head.appendChild(style);

  document.title = 'Extracted: ' + document.title;
  
  var a = document.createElement("a");
  var file = new Blob([cssRules], {type: 'text/css'});
  a.href = URL.createObjectURL(file);
  a.download = 'critical_' + location.href + '.css';
  a.click();
  
  chrome.runtime.sendMessage({cssRule: cssRules});
};
  

/**
 * @param {StyleSheetList} styleSheets
 * @this {CCSS}
 */
CCSS.prototype.parseStyleSheets = function(styleSheets) {
  for (var i = styleSheets.length; i--;) {
    this.parseStyleSheet(styleSheets[i]);
  }
};
  

/**
 * @param {CSSStyleSheet} styleSheet
 * @this {CCSS}
 */
CCSS.prototype.parseStyleSheet = function(styleSheet) {
  var rules = styleSheet.rules;

  if (rules && 0 < rules.length) {
    
    var rule;

    for (var i = rules.length; i--;) {
      rule = rules[i];
      
      if (rule.constructor == CSSImportRule) {
        this.parseStyleSheet(rule.styleSheet);
      } else {
      	this.parseCSSRule(rule);
      }
    }
  }
};


/**
 * @param {CSSStyleRule} rule
 * @this {CCSS}
 */
CCSS.prototype.parseCSSRule = function(rule) {
  if (rule.cssRules) {
    for (var i = rule.cssRules.length; i--;) {
      this.parseCSSRule(rule.cssRules[i]);
    }
  } else {
    if (/:(before|after)/.test(rule.selectorText)) {
      this.cssRules.push(rule.cssText);
    } else {
      var elements = document.querySelectorAll(rule.selectorText);

      for (var j = elements.length; j--;) {
        if (this.isInViewport(elements[j].getBoundingClientRect())) {

          this.cssRules.push(rule.cssText);
        
          break;
        }
      }
    }
  }
};


/**
 * @param {ClientRect} rect .
 * @this {CCSS}
 * @return {boolean} .
 */
CCSS.prototype.isInViewport = function(rect) {
  if (rect.bottom < 0) {
    return false;
  }

  if (window.innerHeight < rect.top) {
    return false;
  }

  if (rect.right < 0) {
    return false;
  }

  if (window.innerWidth < rect.left) {
    return false;
  }

  return true;
};


var ccss = new CCSS();
