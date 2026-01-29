/**
 * Salesforce API Factory - Class-Based Architecture
 * Centralized service for interacting with Salesforce Tooling API
 * @version 2.0.0
 */

// ============================================================================
// URL & SESSION UTILITIES CLASS
// ============================================================================

export class UrlUtils {
  /**
   * Check if URL is a Salesforce domain
   * @param {string} url - URL to check
   * @returns {boolean}
   */
  static isSalesforceUrl(url) {
    return url && (url.includes("salesforce.com") || url.includes("lightning.force.com"));
  }

  /**
   * Convert Lightning Force URL to Salesforce instance URL
   * @param {string} url - Original URL
   * @returns {string} Instance URL
   */
  static getInstanceUrl(url) {
    const urlObj = new URL(url);
    const host = urlObj.hostname.replace(
      ".lightning.force.com",
      ".my.salesforce.com"
    );
    return `https://${host}`;
  }
}

// ============================================================================
// SESSION MANAGER CLASS
// ============================================================================

export class SessionManager {
  constructor() {
    this.currentSessionId = null;
    this.currentInstanceUrl = null;
  }

  /**
   * Retrieve Salesforce session ID from Chrome cookies
   * @param {string} instanceUrl - Salesforce instance URL
   * @returns {Promise<string|null>}
   */
  async getSessionId(instanceUrl) {
    return new Promise((resolve) => {
      chrome.cookies.get({ url: instanceUrl, name: "sid" }, (cookie) => {
        if (!cookie) {
          console.error("❌ No Salesforce session found");
          this.currentSessionId = null;
          resolve(null);
        } else {
          console.log("✅ Session ID found");
          this.currentSessionId = cookie.value;
          this.currentInstanceUrl = instanceUrl;
          resolve(cookie.value);
        }
      });
    });
  }

  /**
   * Get currently cached session ID
   * @returns {string|null}
   */
  getCachedSessionId() {
    return this.currentSessionId;
  }

  /**
   * Get currently cached instance URL
   * @returns {string|null}
   */
  getCachedInstanceUrl() {
    return this.currentInstanceUrl;
  }

  /**
   * Clear cached session data
   */
  clearCache() {
    this.currentSessionId = null;
    this.currentInstanceUrl = null;
  }
}

// ============================================================================
// TOOLING API BASE SERVICE CLASS
// ============================================================================

export class ToolingApiService {
  constructor(instanceUrl, sessionId) {
    this.instanceUrl = instanceUrl;
    this.sessionId = sessionId;
    this.apiVersion = 'v60.0';
  }

  /**
   * Set API version
   * @param {string} version - API version (e.g., 'v60.0')
   */
  setApiVersion(version) {
    this.apiVersion = version;
  }

  /**
   * Get current API version
   * @returns {string}
   */
  getApiVersion() {
    return this.apiVersion;
  }

  /**
   * Update instance URL
   * @param {string} instanceUrl - New instance URL
   */
  setInstanceUrl(instanceUrl) {
    this.instanceUrl = instanceUrl;
  }

  /**
   * Update session ID
   * @param {string} sessionId - New session ID
   */
  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }

  /**
   * Build Tooling API query URL
   * @param {string} query - SOQL query
   * @returns {string}
   */
  buildQueryUrl(query) {
    return `${this.instanceUrl}/services/data/${this.apiVersion}/tooling/query?q=${encodeURIComponent(query)}`;
  }

  /**
   * Get request headers
   * @returns {Object}
   */
  getHeaders() {
    return {
      Authorization: `Bearer ${this.sessionId}`,
      "Content-Type": "application/json"
    };
  }

  /**
   * Execute SOQL query via Tooling API
   * @param {string} query - SOQL query
   * @returns {Promise<Array>}
   */
  async executeQuery(query) {
    const url = this.buildQueryUrl(query);
    
    const response = await fetch(url, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Tooling API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.records || [];
  }

  /**
   * Execute multiple queries in parallel
   * @param {Array<string>} queries - Array of SOQL queries
   * @returns {Promise<Array<Array>>}
   */
  async executeQueriesParallel(queries) {
    const promises = queries.map(query => this.executeQuery(query));
    return Promise.all(promises);
  }
}

// ============================================================================
// LIGHTNING COMPONENT BUNDLE SERVICE CLASS
// ============================================================================

export class LightningComponentBundleService {
  constructor(toolingApiService) {
    this.toolingApi = toolingApiService;
  }

  /**
   * Build query for fetching LWC bundles
   * @returns {string}
   */
  buildBundleQuery() {
    return `
      SELECT Id, DeveloperName, NamespacePrefix, Description
      FROM LightningComponentBundle
      ORDER BY DeveloperName
    `;
  }

  /**
   * Fetch all Lightning Web Components (LWC) bundles
   * @returns {Promise<Array>}
   */
  async fetchAllBundles() {
    console.log("📦 Fetching Lightning Component Bundles...");
    
    const query = this.buildBundleQuery();
    const bundles = await this.toolingApi.executeQuery(query);
    
    console.log(`✅ Fetched ${bundles.length} LWC bundles`);
    return bundles;
  }

  /**
   * Fetch bundles by namespace
   * @param {string} namespace - Namespace prefix
   * @returns {Promise<Array>}
   */
  async fetchBundlesByNamespace(namespace) {
    const query = `
      SELECT Id, DeveloperName, NamespacePrefix, Description
      FROM LightningComponentBundle
      WHERE NamespacePrefix = '${namespace}'
      ORDER BY DeveloperName
    `;
    
    return await this.toolingApi.executeQuery(query);
  }

  /**
   * Fetch bundle by developer name
   * @param {string} developerName - Component developer name
   * @returns {Promise<Object|null>}
   */
  async fetchBundleByName(developerName) {
    const query = `
      SELECT Id, DeveloperName, NamespacePrefix, Description
      FROM LightningComponentBundle
      WHERE DeveloperName = '${developerName}'
      LIMIT 1
    `;
    
    const results = await this.toolingApi.executeQuery(query);
    return results[0] || null;
  }
}

// ============================================================================
// METADATA DEPENDENCY SERVICE CLASS
// ============================================================================

export class MetadataDependencyService {
  constructor(toolingApiService) {
    this.toolingApi = toolingApiService;
  }

  /**
   * Build query for fetching metadata dependencies
   * @returns {string}
   */
  buildDependencyQuery() {
    return `
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
  }

  /**
   * Fetch component dependencies from MetadataComponentDependency
   * @returns {Promise<Array>}
   */
  async fetchDependencies() {
    console.log("🔗 Fetching Metadata Component Dependencies...");
    
    const query = this.buildDependencyQuery();
    const dependencies = await this.toolingApi.executeQuery(query);
    
    console.log(`✅ Fetched ${dependencies.length} dependency records`);
    return dependencies;
  }

  /**
   * Fetch dependencies for a specific component
   * @param {string} componentId - Component ID
   * @returns {Promise<Array>}
   */
  async fetchDependenciesForComponent(componentId) {
    const query = `
      SELECT
        MetadataComponentId,
        MetadataComponentName,
        MetadataComponentType,
        RefMetadataComponentId,
        RefMetadataComponentName,
        RefMetadataComponentType
      FROM MetadataComponentDependency
      WHERE MetadataComponentId = '${componentId}'
    `;
    
    return await this.toolingApi.executeQuery(query);
  }

  /**
   * Fetch components that depend on a specific component
   * @param {string} componentId - Component ID
   * @returns {Promise<Array>}
   */
  async fetchDependentComponents(componentId) {
    const query = `
      SELECT
        MetadataComponentId,
        MetadataComponentName,
        MetadataComponentType,
        RefMetadataComponentId,
        RefMetadataComponentName,
        RefMetadataComponentType
      FROM MetadataComponentDependency
      WHERE RefMetadataComponentId = '${componentId}'
    `;
    
    return await this.toolingApi.executeQuery(query);
  }
}

// ============================================================================
// COMPONENT RESOURCE SERVICE CLASS
// ============================================================================

export class ComponentResourceService {
  constructor(toolingApiService) {
    this.toolingApi = toolingApiService;
    this.defaultBatchSize = 10;
  }

  /**
   * Set default batch size for parallel fetching
   * @param {number} size - Batch size
   */
  setBatchSize(size) {
    this.defaultBatchSize = size;
  }

  /**
   * Build query for fetching JavaScript files
   * @param {string} bundleId - Bundle ID
   * @returns {string}
   */
  buildJsQuery(bundleId) {
    return `
      SELECT Id, Source, FilePath
      FROM LightningComponentResource
      WHERE LightningComponentBundleId = '${bundleId}'
      AND FilePath LIKE '%js'
      AND FilePath NOT LIKE '%test.js'
      AND FilePath NOT LIKE '%__test__%'
    `;
  }

  /**
   * Build query for fetching HTML files
   * @param {string} bundleId - Bundle ID
   * @returns {string}
   */
  buildHtmlQuery(bundleId) {
    return `
      SELECT Id, Source, FilePath
      FROM LightningComponentResource
      WHERE LightningComponentBundleId = '${bundleId}'
      AND FilePath LIKE '%html'
    `;
  }

  /**
   * Fetch source files (JS and HTML) for a specific bundle
   * @param {Object} bundle - Component bundle object
   * @returns {Promise<Object>}
   */
  async fetchBundleSource(bundle) {
    const bundleName = bundle.DeveloperName;

    const jsQuery = this.buildJsQuery(bundle.Id);
    const htmlQuery = this.buildHtmlQuery(bundle.Id);

    try {
      const [jsRecords, htmlRecords] = await this.toolingApi.executeQueriesParallel([
        jsQuery,
        htmlQuery
      ]);

      const jsFile = jsRecords?.find(r => 
        r.FilePath.endsWith('.js') && 
        !r.FilePath.includes('test') &&
        !r.FilePath.includes('__')
      );

      const htmlFile = htmlRecords?.[0];

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

  /**
   * Fetch source files for multiple bundles with batching
   * @param {Array} bundles - Array of bundle objects
   * @param {number} batchSize - Number of concurrent requests (optional)
   * @returns {Promise<Array>}
   */
  async fetchAllBundleSources(bundles, batchSize = null) {
    const size = batchSize || this.defaultBatchSize;
    console.log(`📥 Fetching source files for ${bundles.length} bundles...`);
    
    const sourcePromises = bundles.map(bundle => this.fetchBundleSource(bundle));
    const results = [];

    for (let i = 0; i < sourcePromises.length; i += size) {
      const batch = sourcePromises.slice(i, i + size);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
      
      console.log(`📦 Processed ${Math.min(i + size, sourcePromises.length)}/${sourcePromises.length} components`);
    }

    console.log("✅ All source files fetched");
    return results;
  }

  /**
   * Fetch all resources for a bundle (JS, HTML, CSS, etc.)
   * @param {string} bundleId - Bundle ID
   * @returns {Promise<Array>}
   */
  async fetchAllBundleResources(bundleId) {
    const query = `
      SELECT Id, Source, FilePath, Format
      FROM LightningComponentResource
      WHERE LightningComponentBundleId = '${bundleId}'
    `;
    
    return await this.toolingApi.executeQuery(query);
  }
}

// ============================================================================
// SOURCE CODE PARSER SERVICE CLASS
// ============================================================================

export class SourceCodeParserService {
  constructor() {
    this.patterns = {
      api: /@api\s+(?:get\s+)?(\w+)/g,
      dispatch: /this\.dispatchEvent\s*\(\s*new\s+CustomEvent\s*\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*\{([^}]*)\})?\s*\)\s*\)/g,
      wire: /@wire\s*\(\s*(\w+)(?:\s*,\s*\{([^}]+)\})?\s*\)/g,
      publishImport: /import\s+\{\s*publish\s*\}/gi,
      publishCall: /publish\s*\(\s*this\.messageContext\s*,\s*(\w+)\s*,/g,
      subscribeImport: /import\s+\{\s*subscribe\s*\}/gi,
      subscribeCall: /subscribe\s*\(\s*this\.messageContext\s*,\s*(\w+)\s*,/g,
      childComponent: /<c-([a-z0-9-]+)([^>]*?)(?:>|\/?>)/gi,
      property: /(\w+(?:-\w+)*)=(?:\{([^}]+)\}|"([^"]+)"|'([^']+)')/g,
      event: /on([a-z]+)=\{([^}]+)\}/gi
    };
  }

  /**
   * Parse JavaScript source to extract @api properties
   * @param {string} jsSource - JavaScript source code
   * @returns {Array}
   */
  extractApiProperties(jsSource) {
    if (!jsSource) return [];

    const foundProps = new Set();
    const properties = [];
    let match;

    const regex = new RegExp(this.patterns.api.source, 'g');
    while ((match = regex.exec(jsSource)) !== null) {
      if (!foundProps.has(match[1])) {
        foundProps.add(match[1]);
        properties.push({
          name: match[1],
          type: 'parent-to-child',
          decorator: '@api'
        });
      }
    }

    return properties;
  }

  /**
   * Parse JavaScript source to extract dispatched CustomEvents
   * @param {string} jsSource - JavaScript source code
   * @returns {Array}
   */
  extractDispatchedEvents(jsSource) {
    if (!jsSource) return [];

    const foundEvents = new Set();
    const events = [];
    let match;

    const regex = new RegExp(this.patterns.dispatch.source, 'g');
    while ((match = regex.exec(jsSource)) !== null) {
      if (!foundEvents.has(match[1])) {
        foundEvents.add(match[1]);
        events.push({
          name: match[1],
          type: 'child-to-parent',
          method: 'CustomEvent'
        });
      }
    }

    return events;
  }

  /**
   * Parse JavaScript source to extract @wire adapters
   * @param {string} jsSource - JavaScript source code
   * @returns {Array}
   */
  extractWireAdapters(jsSource) {
    if (!jsSource) return [];

    const adapters = [];
    let match;

    const regex = new RegExp(this.patterns.wire.source, 'g');
    while ((match = regex.exec(jsSource)) !== null) {
      adapters.push({
        adapter: match[1],
        params: match[2] ? match[2].trim() : '',
        type: 'data-source'
      });
    }

    return adapters;
  }

  /**
   * Parse JavaScript source to extract Lightning Message Service publishes
   * @param {string} jsSource - JavaScript source code
   * @returns {Array}
   */
  extractMessagePublish(jsSource) {
    if (!jsSource) return [];

    const publishImportRegex = new RegExp(this.patterns.publishImport.source, 'gi');
    if (!publishImportRegex.test(jsSource)) return [];

    const publishes = [];
    let match;

    const regex = new RegExp(this.patterns.publishCall.source, 'g');
    while ((match = regex.exec(jsSource)) !== null) {
      publishes.push({
        channel: match[1],
        type: 'message-publish'
      });
    }

    return publishes;
  }

  /**
   * Parse JavaScript source to extract Lightning Message Service subscriptions
   * @param {string} jsSource - JavaScript source code
   * @returns {Array}
   */
  extractMessageSubscribe(jsSource) {
    if (!jsSource) return [];

    const subscribeImportRegex = new RegExp(this.patterns.subscribeImport.source, 'gi');
    if (!subscribeImportRegex.test(jsSource)) return [];

    const subscriptions = [];
    let match;

    const regex = new RegExp(this.patterns.subscribeCall.source, 'g');
    while ((match = regex.exec(jsSource)) !== null) {
      subscriptions.push({
        channel: match[1],
        type: 'message-subscribe'
      });
    }

    return subscriptions;
  }

  /**
   * Parse HTML template to extract child component usage
   * @param {string} htmlSource - HTML template source code
   * @returns {Array}
   */
  extractChildComponents(htmlSource) {
    if (!htmlSource) return [];

    const childComponents = [];
    let match;

    const childCompRegex = new RegExp(this.patterns.childComponent.source, 'gi');
    while ((match = childCompRegex.exec(htmlSource)) !== null) {
      const componentName = match[1];
      const attributes = match[2];

      const propBindings = this.extractPropertyBindings(attributes);
      const eventBindings = this.extractEventBindings(attributes);

      childComponents.push({
        name: componentName,
        propertyBindings: propBindings,
        eventHandlers: eventBindings
      });
    }

    return childComponents;
  }

  /**
   * Extract property bindings from attributes
   * @param {string} attributes - HTML attributes string
   * @returns {Array}
   */
  extractPropertyBindings(attributes) {
    const propBindings = [];
    let propMatch;

    const propRegex = new RegExp(this.patterns.property.source, 'g');
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

    return propBindings;
  }

  /**
   * Extract event bindings from attributes
   * @param {string} attributes - HTML attributes string
   * @returns {Array}
   */
  extractEventBindings(attributes) {
    const eventBindings = [];
    let eventMatch;

    const eventRegex = new RegExp(this.patterns.event.source, 'gi');
    while ((eventMatch = eventRegex.exec(attributes)) !== null) {
      eventBindings.push({
        event: eventMatch[1].toLowerCase(),
        handler: eventMatch[2].trim(),
        flow: 'child-to-parent'
      });
    }

    return eventBindings;
  }

  /**
   * Parse complete component data flow from JS and HTML sources
   * @param {Object} component - Component object with jsSource and htmlSource
   * @returns {Object} Component with parsed dataFlow
   */
  parseComponentDataFlow(component) {
    const { jsSource, htmlSource } = component;

    const dataFlow = {
      apiProperties: this.extractApiProperties(jsSource),
      dispatchedEvents: this.extractDispatchedEvents(jsSource),
      wireAdapters: this.extractWireAdapters(jsSource),
      childComponents: this.extractChildComponents(htmlSource),
      messageChannelPublish: this.extractMessagePublish(jsSource),
      messageChannelSubscribe: this.extractMessageSubscribe(jsSource)
    };

    return {
      ...component,
      dataFlow
    };
  }

  /**
   * Parse multiple components
   * @param {Array} components - Array of component objects
   * @returns {Array}
   */
  parseMultipleComponents(components) {
    return components.map(component => this.parseComponentDataFlow(component));
  }
}

// ============================================================================
// ORCHESTRATOR SERVICE CLASS
// ============================================================================

export class OrchestratorService {
  constructor(instanceUrl, sessionId) {
    this.toolingApi = new ToolingApiService(instanceUrl, sessionId);
    this.bundleService = new LightningComponentBundleService(this.toolingApi);
    this.dependencyService = new MetadataDependencyService(this.toolingApi);
    this.resourceService = new ComponentResourceService(this.toolingApi);
    this.parserService = new SourceCodeParserService();
  }

  /**
   * Get Tooling API service instance
   * @returns {ToolingApiService}
   */
  getToolingApi() {
    return this.toolingApi;
  }

  /**
   * Get Bundle service instance
   * @returns {LightningComponentBundleService}
   */
  getBundleService() {
    return this.bundleService;
  }

  /**
   * Get Dependency service instance
   * @returns {MetadataDependencyService}
   */
  getDependencyService() {
    return this.dependencyService;
  }

  /**
   * Get Resource service instance
   * @returns {ComponentResourceService}
   */
  getResourceService() {
    return this.resourceService;
  }

  /**
   * Get Parser service instance
   * @returns {SourceCodeParserService}
   */
  getParserService() {
    return this.parserService;
  }

  /**
   * Main orchestrator to fetch all LWC dependencies and metadata
   * @returns {Promise<Object>}
   */
  async fetchLWCDependencies() {
    console.log("📊 Starting comprehensive LWC metadata fetch...");

    try {
      // Fetch bundles
      const bundles = await this.bundleService.fetchAllBundles();

      // Fetch dependencies
      const dependencies = await this.dependencyService.fetchDependencies();

      // Fetch source files for all bundles
      const bundlesWithSource = await this.resourceService.fetchAllBundleSources(bundles);

      // Parse data flow from sources
      const parsedBundles = this.parserService.parseMultipleComponents(bundlesWithSource);

      console.log("🎉 Data processing complete!");

      return {
        bundles: parsedBundles,
        dependencies: dependencies,
        metadata: {
          totalBundles: parsedBundles.length,
          totalDependencies: dependencies.length,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error("❌ Fatal error in fetchLWCDependencies:", error);
      throw error;
    }
  }

  /**
   * Fetch metadata for specific components by name
   * @param {Array<string>} componentNames - Array of component developer names
   * @returns {Promise<Object>}
   */
  async fetchSpecificComponents(componentNames) {
    console.log(`📊 Fetching metadata for ${componentNames.length} specific components...`);

    try {
      const bundles = [];
      
      // Fetch each bundle by name
      for (const name of componentNames) {
        const bundle = await this.bundleService.fetchBundleByName(name);
        if (bundle) {
          bundles.push(bundle);
        }
      }

      // Fetch source files
      const bundlesWithSource = await this.resourceService.fetchAllBundleSources(bundles);

      // Parse data flow
      const parsedBundles = this.parserService.parseMultipleComponents(bundlesWithSource);

      console.log("✅ Specific components fetched and parsed!");

      return {
        bundles: parsedBundles,
        metadata: {
          requested: componentNames.length,
          found: parsedBundles.length,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error("❌ Error fetching specific components:", error);
      throw error;
    }
  }

  /**
   * Fetch dependencies for a specific component
   * @param {string} componentId - Component ID
   * @returns {Promise<Object>}
   */
  async fetchComponentWithDependencies(componentId) {
    try {
      const [dependencies, dependents] = await Promise.all([
        this.dependencyService.fetchDependenciesForComponent(componentId),
        this.dependencyService.fetchDependentComponents(componentId)
      ]);

      return {
        componentId,
        dependencies,
        dependents,
        metadata: {
          dependencyCount: dependencies.length,
          dependentCount: dependents.length,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error("❌ Error fetching component dependencies:", error);
      throw error;
    }
  }
}

// ============================================================================
// SALESFORCE API FACTORY - MAIN CLASS
// ============================================================================

export class SalesforceApiFactory {
  constructor() {
    this.sessionManager = new SessionManager();
    this.orchestrator = null;
  }

  /**
   * Initialize the factory with URL
   * @param {string} url - Salesforce URL
   * @returns {Promise<boolean>}
   */
  async initialize(url) {
    try {
      if (!UrlUtils.isSalesforceUrl(url)) {
        throw new Error("Not a valid Salesforce URL");
      }

      const instanceUrl = UrlUtils.getInstanceUrl(url);
      const sessionId = await this.sessionManager.getSessionId(instanceUrl);

      if (!sessionId) {
        throw new Error("No Salesforce session found");
      }

      this.orchestrator = new OrchestratorService(instanceUrl, sessionId);
      console.log("✅ Salesforce API Factory initialized successfully");
      
      return true;

    } catch (error) {
      console.error("❌ Failed to initialize factory:", error);
      throw error;
    }
  }

  /**
   * Get Session Manager instance
   * @returns {SessionManager}
   */
  getSessionManager() {
    return this.sessionManager;
  }

  /**
   * Get Orchestrator instance
   * @returns {OrchestratorService|null}
   */
  getOrchestrator() {
    if (!this.orchestrator) {
      throw new Error("Factory not initialized. Call initialize() first.");
    }
    return this.orchestrator;
  }

  /**
   * Quick method to fetch all LWC data
   * @returns {Promise<Object>}
   */
  async fetchAllLWCData() {
    return await this.getOrchestrator().fetchLWCDependencies();
  }

  /**
   * Quick method to fetch specific components
   * @param {Array<string>} componentNames - Array of component names
   * @returns {Promise<Object>}
   */
  async fetchComponents(componentNames) {
    return await this.getOrchestrator().fetchSpecificComponents(componentNames);
  }

  /**
   * Quick method to fetch component dependencies
   * @param {string} componentId - Component ID
   * @returns {Promise<Object>}
   */
  async fetchDependencies(componentId) {
    return await this.getOrchestrator().fetchComponentWithDependencies(componentId);
  }

  /**
   * Reset factory state
   */
  reset() {
    this.sessionManager.clearCache();
    this.orchestrator = null;
    console.log("🔄 Factory reset complete");
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default SalesforceApiFactory;