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
AKAM.CCSS.PSEUDO_ELEMENTS = [
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
AKAM.CCSS.PSEUDO_ELEMENTS_PATTERN =
    new RegExp('::(:?' + AKAM.CCSS.PSEUDO_ELEMENTS.join('|') + ')$');


/**
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.init = function() {
  var cssRule = CSSRule.prototype;

  var switchCssRule = {};

  switchCssRule[cssRule.FONT_FACE_RULE] = this.caseRuleFontFace.bind(this);
  switchCssRule[cssRule.IMPORT_RULE] = this.caseRuleImport.bind(this);
  switchCssRule[cssRule.KEYFRAMES_RULE] = this.caseRuleKeyframes.bind(this);
  switchCssRule[cssRule.MEDIA_RULE] = this.caseRuleMedia.bind(this);
  switchCssRule[cssRule.SUPPORTS_RULE] = this.caseRuleSupports.bind(this);
  switchCssRule[cssRule.STYLE_RULE] = this.caseRuleStyle.bind(this);

  this.switchCssRule = switchCssRule;
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
    [].forEach.call(rule.cssRules, this.parseCSSRule.bind(this, criticalRules));
  }
};


/**
 * @param {CSSSupportsRule} rule .
 * @param {Array<string>} criticalRules .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.caseRuleSupports = function(rule, criticalRules) {
  if (CSS.supports(rule.conditionText)) {
    [].forEach.call(rule.cssRules, this.parseCSSRule.bind(this, criticalRules));
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
  if (styleSheet.href) {
    this.applyRules(this.getCssText(styleSheet.href), 'external');
  } else {
    var rules = styleSheet.rules || [];

    [].forEach.call(rules, this.parseCSSRule.bind(this, criticalRules));
  }
};


/**
 * @param {Array<string>} criticalRules .
 * @param {CSSStyleRule} rule .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.parseCSSRule = function(criticalRules, rule) {
  var caseRule = this.switchCssRule[rule.type];

  if (caseRule) {
    caseRule(rule, criticalRules);
  } else {
    throw Error('unknown type of rule: ' + String(rule.type));
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
  return selectorText.replace(this.constructor.PSEUDO_ELEMENTS_PATTERN, '');
};


/**
 * @param {Error} er .
 * @param {string} selectorText .
 * @this {AKAM.CCSS}
 */
AKAM.CCSS.prototype.catchErrorDocumentQuerySelectorAll =
    function(er, selectorText) {
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
 * @param {string} rules .
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
  var a = document.createElement('a');
  var file = new Blob([criticalRules], {type: 'text/css'});
  a.href = URL.createObjectURL(file);
  a.download = 'critical_' + document.title + '.css';
  a.click();
};
