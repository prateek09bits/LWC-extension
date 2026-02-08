console.log("🚀 Salesforce LWC Schema Builder - Background Service Worker v5.1 (Refresh Fix)");

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const isSalesforceUrl = (url) =>
  url && (url.includes("salesforce.com") || url.includes("lightning.force.com"));

// ============================================================================
// EXTENSION ICON STATE MANAGEMENT
// ============================================================================

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

// ============================================================================
// MESSAGE LISTENER - MAIN ENTRY POINT (FIXED FOR REFRESH)
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_LWC_DEPENDENCY") {
    console.log("📥 Received FETCH_LWC_DEPENDENCY request");
    
    const urlObj = new URL(message.url);
    const host = urlObj.hostname.replace(
      ".lightning.force.com",
      ".my.salesforce.com"
    );
    const instanceUrl = `https://${host}`;

    chrome.cookies.get({ url: instanceUrl, name: "sid" }, async (cookie) => {
      if (!cookie) {
        console.error("❌ No Salesforce session found");
        sendResponse({ error: "No Salesforce session found" });
        return;
      }

      const sessionId = cookie.value;
      console.log("✅ Session ID found, fetching LWC data...");

      try {
        const payload = await fetchLWCDependencies(instanceUrl, sessionId);
        console.log(`📦 Data fetched: ${payload.bundles.length} components`);

        // CRITICAL FIX: Send message back to ALL extension contexts
        // This ensures the data reaches the UI whether it's freshly opened or refreshed
        chrome.runtime.sendMessage({
          type: "LWC_DEPENDENCY_DATA",
          payload: payload
        }).catch(err => {
          // Ignore "no receivers" error - normal if extension just opened
          console.log("ℹ️ Message sent (no active receivers yet)");
        });

        sendResponse({ 
          status: "ok", 
          componentsCount: payload.bundles.length,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.error("❌ Error fetching dependencies:", err);
        sendResponse({ error: err.message });
      }
    });

    return true; // CRITICAL: Keep message channel open for async response
  }
});

// ============================================================================
// MAIN TOOLING API ORCHESTRATOR
// ============================================================================

async function fetchLWCDependencies(instanceUrl, sessionId) {
  console.log("📊 Starting comprehensive LWC metadata fetch...");

  try {
    const bundles = await fetchLightningComponentBundles(instanceUrl, sessionId);
    console.log(`✅ Fetched ${bundles.length} LWC bundles`);

    const dependencies = await fetchMetadataComponentDependencies(instanceUrl, sessionId);
    console.log(`✅ Fetched ${dependencies.length} dependency records`);

    const bundlesWithSource = await fetchAllBundleSources(instanceUrl, sessionId, bundles);
    console.log(`✅ Fetched source files for all bundles`);

    const messageChannels = await fetchLightningMessageChannels(instanceUrl, sessionId);
    console.log(`✅ Fetched ${messageChannels.length} message channels`);

    const parsedBundles = bundlesWithSource.map(bundle =>
      parseLwcDataFlow(bundle)
    );

    console.log("🎉 Data processing complete!");

    return {
      bundles: parsedBundles,
      dependencies: dependencies,
      messageChannels: messageChannels
    };

  } catch (error) {
    console.error("❌ Fatal error in fetchLWCDependencies:", error);
    throw error;
  }
}

// ============================================================================
// TOOLING API - FETCH LIGHTNING COMPONENT BUNDLES
// ============================================================================

async function fetchLightningComponentBundles(instanceUrl, sessionId) {
  const query = `
    SELECT Id, DeveloperName, NamespacePrefix, Description
    FROM LightningComponentBundle WHERE NamespacePrefix != 'devedapp'
    ORDER BY DeveloperName
  `;

  const url = `${instanceUrl}/services/data/v60.0/tooling/query?q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${sessionId}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch bundles: ${response.statusText}`);
  }

  const data = await response.json();
  return data.records || [];
}

// ============================================================================
// TOOLING API - FETCH METADATA COMPONENT DEPENDENCIES
// ============================================================================

async function fetchMetadataComponentDependencies(instanceUrl, sessionId) {
  const query = `
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

  const url = `${instanceUrl}/services/data/v60.0/tooling/query?q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${sessionId}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dependencies: ${response.statusText}`);
  }

  const data = await response.json();
  return data.records || [];
}

// ============================================================================
// TOOLING API - FETCH LIGHTNING MESSAGE CHANNELS
// ============================================================================

async function fetchLightningMessageChannels(instanceUrl, sessionId) {
  const query = `
    SELECT Id, DeveloperName, MasterLabel, Description 
    FROM LightningMessageChannel 
    ORDER BY DeveloperName
  `;

  const url = `${instanceUrl}/services/data/v60.0/tooling/query?q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${sessionId}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    console.warn(`Failed to fetch message channels: ${response.statusText}`);
    return [];
  }

  const data = await response.json();
  return data.records || [];
}

// ============================================================================
// TOOLING API - FETCH SOURCE FILES FOR ALL BUNDLES
// ============================================================================

async function fetchAllBundleSources(instanceUrl, sessionId, bundles) {
  const sourcePromises = bundles.map(bundle =>
    fetchBundleSourceFiles(instanceUrl, sessionId, bundle)
  );

  const batchSize = 10;
  const results = [];

  for (let i = 0; i < sourcePromises.length; i += batchSize) {
    const batch = sourcePromises.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);

    console.log(`📦 Processed ${Math.min(i + batchSize, sourcePromises.length)}/${sourcePromises.length} components`);
  }

  return results;
}

// ============================================================================
// TOOLING API - FETCH JS AND HTML SOURCE FOR A SPECIFIC BUNDLE
// ============================================================================

async function fetchBundleSourceFiles(instanceUrl, sessionId, bundle) {
  const bundleName = bundle.DeveloperName;

  const jsQuery = `
    SELECT Id, Source, FilePath
    FROM LightningComponentResource
    WHERE LightningComponentBundleId = '${bundle.Id}'
    AND FilePath LIKE '%js'
    AND FilePath NOT LIKE '%test.js'
    AND FilePath NOT LIKE '%__test__%'
  `;

  const htmlQuery = `
    SELECT Id, Source, FilePath
    FROM LightningComponentResource
    WHERE LightningComponentBundleId = '${bundle.Id}'
    AND FilePath LIKE '%html'
  `;

  try {
    const [jsResponse, htmlResponse] = await Promise.all([
      fetch(
        `${instanceUrl}/services/data/v60.0/tooling/query?q=${encodeURIComponent(jsQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${sessionId}`,
            "Content-Type": "application/json"
          }
        }
      ),
      fetch(
        `${instanceUrl}/services/data/v60.0/tooling/query?q=${encodeURIComponent(htmlQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${sessionId}`,
            "Content-Type": "application/json"
          }
        }
      )
    ]);

    const jsData = await jsResponse.json();
    const htmlData = await htmlResponse.json();

    const jsFile = jsData.records?.find(r =>
      r.FilePath.endsWith('.js') &&
      !r.FilePath.includes('test') &&
      !r.FilePath.includes('__')
    );

    const htmlFile = htmlData.records?.[0];

    return {
      id: bundle.Id,
      name: bundle.DeveloperName,
      namespace: bundle.NamespacePrefix,
      description: bundle.Description,
      jsSource: jsFile?.Source || '',
      htmlSource: htmlFile?.Source || '',
      jsFilePath: jsFile?.FilePath || '',
      htmlFilePath: htmlFile?.FilePath || ''
    };

  } catch (error) {
    console.error(`⚠️ Error fetching source for ${bundleName}:`, error.message);
    return {
      id: bundle.Id,
      name: bundleName,
      namespace: bundle.NamespacePrefix,
      description: bundle.Description,
      jsSource: '',
      htmlSource: '',
      error: error.message
    };
  }
}

// ============================================================================
// ENHANCED LWC DATA FLOW PARSER (INDUSTRY-LEVEL)
// ============================================================================

function parseLwcDataFlow(bundle) {
  const result = {
    component: bundle.name,
    bundleId: bundle.id,

    // Child @api exposed surface
    apiProps: [],

    // <c-child prop={value}>
    childComponents: [],

    // this.dispatchEvent(...)
    events: [],

    // @wire(...)
    wires: [],

    // template.querySelector patterns
    querySelectorCalls: [],

    // Lightning Message Service
    lmsChannels: []
  };

  /* ===========================
     ENHANCED JS PARSING
     =========================== */

  if (bundle.jsSource) {
    const js = bundle.jsSource;

    // ---- @api props (field + getter/setter)
    const apiSet = new Set();
    const apiRegex = /@api\s+(?:get\s+|set\s+)?(\w+)/g;
    let m;
    while ((m = apiRegex.exec(js))) {
      apiSet.add(m[1]);
    }
    result.apiProps = [...apiSet];

    // ---- CustomEvent dispatch with detail extraction
    const eventRegex =
      /this\.dispatchEvent\s*\(\s*new\s+CustomEvent\s*\(\s*['\"`]([^'\"`]+)['\"`](?:\s*,\s*\{[^}]*detail\s*:\s*([^}]+)\})?/g;
    while ((m = eventRegex.exec(js))) {
      result.events.push({
        name: m[1],
        direction: "child-to-parent",
        detail: m[2] ? m[2].trim() : null
      });
    }

    // ---- @wire adapters with parameters
    const wireRegex = /@wire\s*\(\s*(\w+)(?:\s*,\s*\{([^}]+)\})?\s*\)/g;
    while ((m = wireRegex.exec(js))) {
      result.wires.push({
        adapter: m[1],
        params: m[2] ? m[2].trim() : null
      });
    }

    // ---- Template querySelector calls (parent calling child methods)
    const querySelectorRegex = /this\.template\.querySelector\s*\(\s*['\"`]c-([a-z0-9-]+)['\"`]\s*\)\.(\w+)/g;
    while ((m = querySelectorRegex.exec(js))) {
      result.querySelectorCalls.push({
        childComponent: kebabToCamel(m[1]),
        method: m[2],
        direction: "parent-to-child"
      });
    }

    // ---- Lightning Message Service patterns

    // 1. Parse Imports to map variable names to Channel Names
    // import SAMPLEMC from '@salesforce/messageChannel/SampleMessageChannel__c';
    const lmsImportRegex = /import\s+(\w+)\s+from\s+['"]@salesforce\/messageChannel\/(\w+)(?:__c)?['"]/g;
    const lmsMap = new Map(); // Variable -> ChannelName
    while ((m = lmsImportRegex.exec(js))) {
      const rawName = m[2];
      const cleanName = rawName.endsWith('__c') ? rawName.slice(0, -3) : rawName;
      lmsMap.set(m[1], cleanName);
    }

    const lmsPublishRegex = /publish\s*\(\s*this\.messageContext\s*,\s*(\w+)/g;
    const lmsSubscribeRegex = /subscribe\s*\(\s*this\.messageContext\s*,\s*(\w+)/g;

    while ((m = lmsPublishRegex.exec(js))) {
      const varName = m[1];
      const channelName = lmsMap.get(varName) || varName; // Resolve or use as-is
      result.lmsChannels.push({
        channel: channelName,
        type: 'publish'
      });
    }

    while ((m = lmsSubscribeRegex.exec(js))) {
      const varName = m[1];
      const channelName = lmsMap.get(varName) || varName; // Resolve or use as-is
      result.lmsChannels.push({
        channel: channelName,
        type: 'subscribe'
      });
    }
  }

  /* ===========================
     ENHANCED HTML PARSING
     =========================== */

  if (bundle.htmlSource) {
    const html = bundle.htmlSource;

    const childRegex = /<c-([a-z0-9-]+)([^>]*)>/gi;
    let match;

    while ((match = childRegex.exec(html))) {
      const childName = match[1];
      const attrs = match[2];

      const props = [];
      const events = [];

      // Props: message={foo} or message="literal"
      const attrRegex = /([\w-]+)=(?:\{([^}]+)\}|"([^"]+)"|'([^']+)')/g;
      let a;
      while ((a = attrRegex.exec(attrs))) {
        const attr = a[1];
        const value = a[2] || a[3] || a[4]; // Handle {}, "", ''

        if (attr.startsWith("on")) {
          // Event handler
          events.push({
            event: attr.replace("on", ""),
            handler: value,
            direction: "child-to-parent"
          });
        } else {
          // Property binding
          props.push({
            api: kebabToCamel(attr),
            parentValue: value,
            direction: "parent-to-child",
            isLiteral: !a[2] // true if not using {}
          });
        }
      }

      result.childComponents.push({
        name: childName,
        props,
        events
      });
    }
  }

  return result;
}

/* ===========================
   HELPER FUNCTIONS
   =========================== */

function kebabToCamel(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

console.log("✅ Background service worker fully initialized (Refresh Fix Edition)");