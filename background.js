console.log("🚀 Salesforce LWC Schema Builder - Background Service Worker v4.0");

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
// MESSAGE LISTENER - MAIN ENTRY POINT
// ============================================================================

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
        console.error("❌ No Salesforce session found");
        sendResponse({ error: "No Salesforce session found" });
        return;
      }

      const sessionId = cookie.value;
      console.log("✅ Session ID found, fetching LWC data...");

      try {
        const payload = await fetchLWCDependencies(instanceUrl, sessionId);
        
        chrome.runtime.sendMessage({
          type: "LWC_DEPENDENCY_DATA",
          payload: payload
        });

        sendResponse({ status: "ok", componentsCount: payload.bundles.length });
      } catch (err) {
        console.error("❌ Error fetching dependencies:", err);
        sendResponse({ error: err.message });
      }
    });

    return true;
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

    const parsedBundles = bundlesWithSource.map(bundle => 
      parseComponentDataFlow(bundle)
    );

    console.log("🎉 Data processing complete!");

    return {
      bundles: parsedBundles,
      dependencies: dependencies
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
    FROM LightningComponentBundle
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
// SOURCE CODE PARSER - EXTRACT DATA FLOW PATTERNS
// ============================================================================

function parseComponentDataFlow(component) {
  const { name, jsSource, htmlSource } = component;

  const dataFlow = {
    apiProperties: [],
    dispatchedEvents: [],
    wireAdapters: [],
    childComponents: [],
    messageChannelPublish: [],
    messageChannelSubscribe: []
  };

  if (jsSource) {
    // Extract @api properties (including getters/setters)
    const apiRegex = /@api\s+(?:get\s+)?(\w+)/g;
    let match;
    const foundProps = new Set();
    while ((match = apiRegex.exec(jsSource)) !== null) {
      if (!foundProps.has(match[1])) {
        foundProps.add(match[1]);
        dataFlow.apiProperties.push({
          name: match[1],
          type: 'parent-to-child',
          decorator: '@api'
        });
      }
    }

    // Extract dispatched CustomEvents with detail analysis
    const dispatchRegex = /this\.dispatchEvent\s*\(\s*new\s+CustomEvent\s*\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*\{([^}]*)\})?\s*\)\s*\)/g;
    const foundEvents = new Set();
    while ((match = dispatchRegex.exec(jsSource)) !== null) {
      if (!foundEvents.has(match[1])) {
        foundEvents.add(match[1]);
        dataFlow.dispatchedEvents.push({
          name: match[1],
          type: 'child-to-parent',
          method: 'CustomEvent'
        });
      }
    }

    // Extract @wire adapters
    const wireRegex = /@wire\s*\(\s*(\w+)(?:\s*,\s*\{([^}]+)\})?\s*\)/g;
    while ((match = wireRegex.exec(jsSource)) !== null) {
      dataFlow.wireAdapters.push({
        adapter: match[1],
        params: match[2] ? match[2].trim() : '',
        type: 'data-source'
      });
    }

    // Extract Lightning Message Service - Publish
    const publishImportRegex = /import\s+\{\s*publish\s*\}/gi;
    const publishCallRegex = /publish\s*\(\s*this\.messageContext\s*,\s*(\w+)\s*,/g;
    if (publishImportRegex.test(jsSource)) {
      while ((match = publishCallRegex.exec(jsSource)) !== null) {
        dataFlow.messageChannelPublish.push({
          channel: match[1],
          type: 'message-publish'
        });
      }
    }

    // Extract Lightning Message Service - Subscribe
    const subscribeImportRegex = /import\s+\{\s*subscribe\s*\}/gi;
    const subscribeCallRegex = /subscribe\s*\(\s*this\.messageContext\s*,\s*(\w+)\s*,/g;
    if (subscribeImportRegex.test(jsSource)) {
      while ((match = subscribeCallRegex.exec(jsSource)) !== null) {
        dataFlow.messageChannelSubscribe.push({
          channel: match[1],
          type: 'message-subscribe'
        });
      }
    }
  }

  if (htmlSource) {
    // Extract child component usage with enhanced attribute parsing
    const childCompRegex = /<c-([a-z0-9-]+)([^>]*?)(?:>|\/?>)/gi;
    while ((match = childCompRegex.exec(htmlSource)) !== null) {
      const componentName = match[1];
      const attributes = match[2];

      const propBindings = [];
      // Match property bindings (non-event attributes)
      const propRegex = /(\w+(?:-\w+)*)=(?:\{([^}]+)\}|"([^"]+)"|'([^']+)')/g;
      let propMatch;
      while ((propMatch = propRegex.exec(attributes)) !== null) {
        const attrName = propMatch[1];
        
        // Skip event handlers (start with 'on')
        if (attrName.toLowerCase().startsWith('on')) continue;
        
        const boundValue = propMatch[2] || propMatch[3] || propMatch[4];
        
        propBindings.push({
          property: attrName,
          boundTo: boundValue ? boundValue.trim() : '',
          flow: 'parent-to-child'
        });
      }

      const eventBindings = [];
      // Match event handlers (attributes starting with 'on')
      const eventRegex = /on([a-z]+)=\{([^}]+)\}/gi;
      let eventMatch;
      while ((eventMatch = eventRegex.exec(attributes)) !== null) {
        eventBindings.push({
          event: eventMatch[1].toLowerCase(),
          handler: eventMatch[2].trim(),
          flow: 'child-to-parent'
        });
      }

      dataFlow.childComponents.push({
        name: componentName,
        propertyBindings: propBindings,
        eventHandlers: eventBindings
      });
    }
  }

  return {
    ...component,
    dataFlow
  };
}

console.log("✅ Background service worker fully initialized");