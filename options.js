var idRemove = 'remove';

var remove = document.getElementById(idRemove);

document.addEventListener('DOMContentLoaded', restoreOptions);

remove.onchange = saveOption;


function restoreOptions() {
  var valueDefault = {};
  valueDefault[idRemove] = true;
  
  chrome.storage.sync.get(valueDefault, function(items) {
    remove.checked = items[idRemove];
  });
}


function saveOption() {
  var valueNew = {};
  valueNew[this.id] = this.checked;
  
  chrome.storage.sync.set(valueNew, function() {});
}