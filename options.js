var promise = new Promise(function(resolve, reject) {
  var valueDefault = {
    'prefRemove': true
  };
  
  chrome.storage.sync.get(valueDefault, function(items) {
    resolve(items);
  });
});


promise.then(function(items) {
  Array.prototype.forEach.call(document.forms.pref.elements, function(element) {
    element.checked = items[element.name];
    
    element.onchange = saveOption;
  });
});









function saveOption() {
  var valueNew = {};
  valueNew[this.name] = this.checked;
  
  chrome.storage.sync.set(valueNew, function() {
    console.log(arguments);
  });
}