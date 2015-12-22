var script = document.createElement('script');
script.async = 1;
script.src = 'https://www.google-analytics.com/analytics.js';

var firstScript = document.getElementsByTagName('script')[0];
firstScript.parentNode.insertBefore(script, firstScript);

function executeGAMethods() {
  window.ga = window.ga || function(){
    (window.ga.q = window.ga.q || []).push(arguments);
  };
  
  window.ga.l =+ new Date();

  window.ga('create', 'UA-68451209-1', 'auto', {'name': 'ccss'});
  window.ga('ccss.set', 'checkProtocolTask', function(){});
  window.ga('ccss.send', 'pageview', location.href);
  
  window.addEventListener('error', function(ev) {
    window.ga('ccss.send', 'exception', {
      'exDescription': ev.message,
      'exFatal': false
    });
  }, false);
}

if (location.protocol == 'chrome-extension:') {
  executeGAMethods();
} else {
  var script = document.createElement('script');
  script.appendChild(document.createTextNode(executeGAMethods.toString() + '\n' + executeGAMethods.name + '();'));
  
  var firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode.insertBefore(script, firstScript);
}