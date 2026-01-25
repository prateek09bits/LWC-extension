console.log("Salesforce Schema Extension Loaded:", window.location.hostname);

chrome.runtime.sendMessage({
  type: "FETCH_LWC_DEPENDENCY",
  url: window.location.origin
});