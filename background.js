console.log("Salesforce Schema Extension Background Service Worker Running");
console.log("Background service worker loaded");

// Disable extension by default
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.disable();
});

// Listen when user switches tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  handleTab(tab);
});

// Listen when tab URL changes (navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    handleTab(tab);
  }
});

function handleTab(tab) {
  if (!tab || !tab.url) return;

  const isSalesforce =
    tab.url.includes("salesforce.com") ||
    tab.url.includes("lightning.force.com");

  if (isSalesforce) {
    chrome.action.enable(tab.id);
  } else {
    chrome.action.disable(tab.id);
  }
}