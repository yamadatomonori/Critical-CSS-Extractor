var AKAM = AKAM || {};


/**
 * @constructor
 */
AKAM.CCSS = function() {
  this.init.call(this);
};



/**
 * @type {Array}
 */
AKAM.CCSS.prototype.criticalRules = [];


/**
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.init = function() {
  this.parseStyleSheets(document.styleSheets);
  this.crearCurrentStyles();

  var criticalRules = this.criticalRules.reverse().join(' ');
  
  this.applyCriticalRules(criticalRules);
  
  this.downloadCriticalRules(criticalRules); 
  
  document.title = 'Extracted: ' + document.title;
  
  chrome.runtime.sendMessage({cssRule: criticalRules});
};
  

/**
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.crearCurrentStyles = function() {
  var links = document.querySelectorAll('link[rel=stylesheet]');

  for (var i = links.length; i--;) {
    links[i].rel = '';
  }
};


/**
 * @param {string} criticalRules .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.applyCriticalRules = function(criticalRules) {
  var style = document.createElement('style');
  style.innerText = criticalRules;
  style.dataset.critical = '1';
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
  a.download = 'critical_' + location.href + '.css';
  a.click();
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
      	this.parseCSSRule(rule);
      }
    }
  }
};


/**
 * @param {CSSStyleRule} rule
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.parseCSSRule = function(rule) {
  if (rule.criticalRules) {
    for (var i = rule.criticalRules.length; i--;) {
      this.parseCSSRule(rule.criticalRules[i]);
    }
  } else {
    if (/:(before|after)/.test(rule.selectorText)) {
      this.criticalRules.push(rule.cssText);
    } else {
      var elements = document.querySelectorAll(rule.selectorText);

      for (var j = elements.length; j--;) {
        if (this.isInViewport(elements[j].getBoundingClientRect())) {

          this.criticalRules.push(rule.cssText);
        
          break;
        }
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


var ccss = new AKAM.CCSS();
