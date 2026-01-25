console.log("Salesforce Schema Extension Background Service Worker Running");

// Helper
const isSalesforceUrl = (url) =>
  url && (url.includes("salesforce.com") || url.includes("lightning.force.com"));

// Enable/Disable extension icon
async function updateActionState(tabId, url) {
  if (isSalesforceUrl(url)) {
    await chrome.action.enable(tabId);
  } else {
    await chrome.action.disable(tabId);
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    updateActionState(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  updateActionState(activeInfo.tabId, tab.url);
});

// 🔥 Listen from content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_LWC_DEPENDENCY") {
    const urlObj = new URL(message.url);
    const host = urlObj.hostname.replace(
      ".lightning.force.com",
      ".my.salesforce.com"
    );
    const instanceUrl = `https://${host}`;

    chrome.cookies.get({ url: instanceUrl, name: "sid" }, async (cookie) => {
      if (!cookie) {
        sendResponse({ error: "No Salesforce session found" });
        return;
      }

      const sessionId = cookie.value;

      try {
        const records = await fetchLWCDependencies(instanceUrl, sessionId);

        // 🔥 SEND DATA TO app.js
        chrome.runtime.sendMessage({
          type: "LWC_DEPENDENCY_DATA",
          payload: records
        });

        sendResponse({ status: "ok" });
      } catch (err) {
        sendResponse({ error: err.message });
      }
    });

    return true;
  }
});

// 🔥 TOOLING API
async function fetchLWCDependencies(instanceUrl, sessionId) {
  const soql = `
    SELECT
      MetadataComponentId,
      MetadataComponentName,
      MetadataComponentType,
      RefMetadataComponentId,
      RefMetadataComponentName,
      RefMetadataComponentType
    FROM MetadataComponentDependency
    WHERE MetadataComponentType = 'LightningComponentBundle'
  `;

  const apiUrl = `${instanceUrl}/services/data/v60.0/tooling/query?q=${encodeURIComponent(
    soql
  )}`;

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${sessionId}`,
      "Content-Type": "application/json"
    }
  });

  const data = await response.json();
  console.log("🔥 Tooling API Data:", data.records || []);
  return data.records || [];
}