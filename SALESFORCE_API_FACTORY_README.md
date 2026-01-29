# Salesforce API Factory - Class-Based Architecture

A comprehensive, object-oriented JavaScript factory for interacting with the Salesforce Tooling API. This factory provides organized class-based services for fetching Lightning Web Component metadata, dependencies, source code, and parsing component data flows.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Class Overview](#class-overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Detailed Usage](#detailed-usage)
- [API Reference](#api-reference)
- [Examples](#examples)

---

## ✨ Features

- **Object-Oriented Design**: Clean class-based architecture with proper encapsulation
- **Session Management**: Automatic handling of Salesforce session cookies with caching
- **Batch Processing**: Efficient fetching with configurable batch sizes
- **Source Code Parsing**: Extract data flow patterns from LWC JavaScript and HTML
- **Error Handling**: Comprehensive error handling with detailed logging
- **Chrome Extension Ready**: Built for Chrome extension integration
- **Flexible Usage**: Use the main factory or individual service classes

---

## 🏗️ Architecture

The factory follows a layered class-based architecture:

```
SalesforceApiFactory (Main Entry Point)
    ↓
OrchestratorService (Workflow Coordinator)
    ↓
├── ToolingApiService (Base API Client)
├── LightningComponentBundleService
├── MetadataDependencyService
├── ComponentResourceService
└── SourceCodeParserService

Supporting Classes:
├── UrlUtils (Static utility methods)
└── SessionManager (Session handling)
```

---

## 📦 Class Overview

### **SalesforceApiFactory** (Main Class)
The primary entry point that orchestrates all services. Initialize once and use for all operations.

### **OrchestratorService**
Coordinates multiple services to perform complex workflows like fetching all LWC metadata.

### **ToolingApiService**
Base service for executing SOQL queries against the Salesforce Tooling API.

### **LightningComponentBundleService**
Manages fetching of Lightning Web Component bundle metadata.

### **MetadataDependencyService**
Handles component dependency relationships.

### **ComponentResourceService**
Fetches JavaScript, HTML, and other source files for components.

### **SourceCodeParserService**
Parses source code to extract data flow patterns (properties, events, wire adapters, etc.).

### **SessionManager**
Manages Salesforce session cookies and caching.

### **UrlUtils**
Static utility methods for URL validation and transformation.

---

## 🚀 Installation

### For Chrome Extension

1. Copy `salesforceApiFactory.js` to your extension directory

2. Import in your background script:

```javascript
import SalesforceApiFactory from './salesforceApiFactory.js';
```

Or import specific classes:

```javascript
import { 
  SalesforceApiFactory,
  UrlUtils, 
  SessionManager,
  OrchestratorService 
} from './salesforceApiFactory.js';
```

### Manifest Configuration

Ensure your `manifest.json` includes:

```json
{
  "permissions": [
    "cookies",
    "tabs"
  ],
  "host_permissions": [
    "https://*.salesforce.com/*",
    "https://*.force.com/*"
  ]
}
```

---

## 🎯 Quick Start

### Simple Usage (Recommended)

```javascript
import SalesforceApiFactory from './salesforceApiFactory.js';

// Create factory instance
const factory = new SalesforceApiFactory();

// Initialize with Salesforce URL
await factory.initialize('https://mycompany.lightning.force.com');

// Fetch all LWC data
const data = await factory.fetchAllLWCData();

console.log('Bundles:', data.bundles);
console.log('Dependencies:', data.dependencies);
console.log('Metadata:', data.metadata);

// Clean up when done
factory.reset();
```

---

## 💡 Detailed Usage

### 1. Initialize Factory

```javascript
const factory = new SalesforceApiFactory();

try {
  await factory.initialize(salesforceUrl);
  console.log('Factory initialized successfully');
} catch (error) {
  console.error('Initialization failed:', error.message);
}
```

### 2. Fetch All LWC Data

```javascript
const data = await factory.fetchAllLWCData();

// Access results
console.log('Total bundles:', data.metadata.totalBundles);
console.log('Total dependencies:', data.metadata.totalDependencies);
console.log('Timestamp:', data.metadata.timestamp);

// Iterate through bundles
data.bundles.forEach(bundle => {
  console.log('Component:', bundle.name);
  console.log('API Properties:', bundle.dataFlow.apiProperties);
  console.log('Events:', bundle.dataFlow.dispatchedEvents);
  console.log('Wire Adapters:', bundle.dataFlow.wireAdapters);
});
```

### 3. Fetch Specific Components

```javascript
const componentNames = ['myComponent', 'anotherComponent'];
const result = await factory.fetchComponents(componentNames);

console.log(`Found ${result.metadata.found} of ${result.metadata.requested} components`);
```

### 4. Fetch Component Dependencies

```javascript
const componentId = 'a00123456789';
const result = await factory.fetchDependencies(componentId);

console.log('Dependencies:', result.dependencies);
console.log('Dependent components:', result.dependents);
```

### 5. Using Individual Services (Advanced)

```javascript
// Get orchestrator
const orchestrator = factory.getOrchestrator();

// Access individual services
const bundleService = orchestrator.getBundleService();
const resourceService = orchestrator.getResourceService();
const parserService = orchestrator.getParserService();

// Use services directly
const bundles = await bundleService.fetchAllBundles();
const namespaceBundles = await bundleService.fetchBundlesByNamespace('c');
const specificBundle = await bundleService.fetchBundleByName('myComponent');
```

---

## 📚 API Reference

### SalesforceApiFactory

#### Constructor
```javascript
const factory = new SalesforceApiFactory();
```

#### Methods

**`async initialize(url)`**
Initialize the factory with a Salesforce URL.
- **Parameters:** `url` (string) - Salesforce URL
- **Returns:** `Promise<boolean>`
- **Throws:** Error if URL is invalid or no session found

**`getSessionManager()`**
Get the SessionManager instance.
- **Returns:** `SessionManager`

**`getOrchestrator()`**
Get the OrchestratorService instance.
- **Returns:** `OrchestratorService`
- **Throws:** Error if factory not initialized

**`async fetchAllLWCData()`**
Fetch all LWC metadata, dependencies, and source code.
- **Returns:** `Promise<Object>` with `bundles`, `dependencies`, and `metadata`

**`async fetchComponents(componentNames)`**
Fetch specific components by name.
- **Parameters:** `componentNames` (Array<string>)
- **Returns:** `Promise<Object>`

**`async fetchDependencies(componentId)`**
Fetch dependencies for a specific component.
- **Parameters:** `componentId` (string)
- **Returns:** `Promise<Object>`

**`reset()`**
Reset factory state and clear caches.

---

### UrlUtils (Static Class)

**`static isSalesforceUrl(url)`**
Check if URL is a Salesforce domain.
- **Parameters:** `url` (string)
- **Returns:** `boolean`

**`static getInstanceUrl(url)`**
Convert Lightning Force URL to instance URL.
- **Parameters:** `url` (string)
- **Returns:** `string`

---

### SessionManager

#### Constructor
```javascript
const sessionManager = new SessionManager();
```

#### Methods

**`async getSessionId(instanceUrl)`**
Retrieve Salesforce session ID from cookies.
- **Parameters:** `instanceUrl` (string)
- **Returns:** `Promise<string|null>`

**`getCachedSessionId()`**
Get cached session ID.
- **Returns:** `string|null`

**`getCachedInstanceUrl()`**
Get cached instance URL.
- **Returns:** `string|null`

**`clearCache()`**
Clear cached session data.

---

### ToolingApiService

#### Constructor
```javascript
const toolingApi = new ToolingApiService(instanceUrl, sessionId);
```

#### Methods

**`setApiVersion(version)`**
Set API version (default: 'v60.0').
- **Parameters:** `version` (string)

**`getApiVersion()`**
Get current API version.
- **Returns:** `string`

**`async executeQuery(query)`**
Execute SOQL query.
- **Parameters:** `query` (string)
- **Returns:** `Promise<Array>`

**`async executeQueriesParallel(queries)`**
Execute multiple queries in parallel.
- **Parameters:** `queries` (Array<string>)
- **Returns:** `Promise<Array<Array>>`

---

### LightningComponentBundleService

#### Constructor
```javascript
const bundleService = new LightningComponentBundleService(toolingApiService);
```

#### Methods

**`async fetchAllBundles()`**
Fetch all LWC bundles.
- **Returns:** `Promise<Array>`

**`async fetchBundlesByNamespace(namespace)`**
Fetch bundles by namespace.
- **Parameters:** `namespace` (string)
- **Returns:** `Promise<Array>`

**`async fetchBundleByName(developerName)`**
Fetch specific bundle by developer name.
- **Parameters:** `developerName` (string)
- **Returns:** `Promise<Object|null>`

---

### MetadataDependencyService

#### Constructor
```javascript
const dependencyService = new MetadataDependencyService(toolingApiService);
```

#### Methods

**`async fetchDependencies()`**
Fetch all component dependencies.
- **Returns:** `Promise<Array>`

**`async fetchDependenciesForComponent(componentId)`**
Fetch dependencies for a specific component.
- **Parameters:** `componentId` (string)
- **Returns:** `Promise<Array>`

**`async fetchDependentComponents(componentId)`**
Fetch components that depend on a specific component.
- **Parameters:** `componentId` (string)
- **Returns:** `Promise<Array>`

---

### ComponentResourceService

#### Constructor
```javascript
const resourceService = new ComponentResourceService(toolingApiService);
```

#### Methods

**`setBatchSize(size)`**
Set default batch size for parallel fetching.
- **Parameters:** `size` (number)

**`async fetchBundleSource(bundle)`**
Fetch JS and HTML source for a bundle.
- **Parameters:** `bundle` (Object)
- **Returns:** `Promise<Object>`

**`async fetchAllBundleSources(bundles, batchSize?)`**
Fetch sources for multiple bundles.
- **Parameters:** 
  - `bundles` (Array)
  - `batchSize` (number, optional)
- **Returns:** `Promise<Array>`

**`async fetchAllBundleResources(bundleId)`**
Fetch all resources (JS, HTML, CSS, etc.) for a bundle.
- **Parameters:** `bundleId` (string)
- **Returns:** `Promise<Array>`

---

### SourceCodeParserService

#### Constructor
```javascript
const parser = new SourceCodeParserService();
```

#### Methods

**`extractApiProperties(jsSource)`**
Extract @api decorated properties.
- **Parameters:** `jsSource` (string)
- **Returns:** `Array<Object>`

**`extractDispatchedEvents(jsSource)`**
Extract CustomEvents dispatched.
- **Parameters:** `jsSource` (string)
- **Returns:** `Array<Object>`

**`extractWireAdapters(jsSource)`**
Extract @wire decorated adapters.
- **Parameters:** `jsSource` (string)
- **Returns:** `Array<Object>`

**`extractMessagePublish(jsSource)`**
Extract LMS publish calls.
- **Parameters:** `jsSource` (string)
- **Returns:** `Array<Object>`

**`extractMessageSubscribe(jsSource)`**
Extract LMS subscriptions.
- **Parameters:** `jsSource` (string)
- **Returns:** `Array<Object>`

**`extractChildComponents(htmlSource)`**
Extract child component usage.
- **Parameters:** `htmlSource` (string)
- **Returns:** `Array<Object>`

**`parseComponentDataFlow(component)`**
Parse complete component data flow.
- **Parameters:** `component` (Object)
- **Returns:** `Object`

**`parseMultipleComponents(components)`**
Parse multiple components.
- **Parameters:** `components` (Array)
- **Returns:** `Array`

---

### OrchestratorService

#### Constructor
```javascript
const orchestrator = new OrchestratorService(instanceUrl, sessionId);
```

#### Methods

**`getToolingApi()`**
Get ToolingApiService instance.
- **Returns:** `ToolingApiService`

**`getBundleService()`**
Get LightningComponentBundleService instance.
- **Returns:** `LightningComponentBundleService`

**`getDependencyService()`**
Get MetadataDependencyService instance.
- **Returns:** `MetadataDependencyService`

**`getResourceService()`**
Get ComponentResourceService instance.
- **Returns:** `ComponentResourceService`

**`getParserService()`**
Get SourceCodeParserService instance.
- **Returns:** `SourceCodeParserService`

**`async fetchLWCDependencies()`**
Fetch all LWC dependencies and metadata.
- **Returns:** `Promise<Object>`

**`async fetchSpecificComponents(componentNames)`**
Fetch specific components by name.
- **Parameters:** `componentNames` (Array<string>)
- **Returns:** `Promise<Object>`

**`async fetchComponentWithDependencies(componentId)`**
Fetch dependencies for a component.
- **Parameters:** `componentId` (string)
- **Returns:** `Promise<Object>`

---

## 📖 Examples

### Example 1: Chrome Extension Background Script

```javascript
import SalesforceApiFactory from './salesforceApiFactory.js';

let factory = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_LWC_DATA') {
    (async () => {
      try {
        if (!factory) {
          factory = new SalesforceApiFactory();
        }
        
        await factory.initialize(message.url);
        const data = await factory.fetchAllLWCData();
        
        chrome.runtime.sendMessage({
          type: 'LWC_DATA_READY',
          payload: data
        });
        
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true;
  }
});
```

### Example 2: Error Handling

```javascript
const factory = new SalesforceApiFactory();

try {
  await factory.initialize(url);
  const data = await factory.fetchAllLWCData();
  
} catch (error) {
  if (error.message.includes('Not a valid Salesforce URL')) {
    console.error('Invalid URL');
  } else if (error.message.includes('No Salesforce session')) {
    console.error('Not logged in');
  } else if (error.message.includes('401')) {
    console.error('Session expired');
  } else {
    console.error('Unknown error:', error);
  }
} finally {
  factory.reset();
}
```

### Example 3: Custom Workflow

```javascript
const factory = new SalesforceApiFactory();
await factory.initialize(url);

const orchestrator = factory.getOrchestrator();
const bundleService = orchestrator.getBundleService();
const resourceService = orchestrator.getResourceService();

// Custom workflow
const namespaceBundles = await bundleService.fetchBundlesByNamespace('c');
const sources = await resourceService.fetchAllBundleSources(namespaceBundles, 5);

console.log(`Processed ${sources.length} components`);
```

---

## 🎓 Best Practices

1. **Always initialize** the factory before use
2. **Call reset()** when done to clear caches
3. **Reuse factory instance** across operations
4. **Handle errors** appropriately for better UX
5. **Use batch sizes** wisely for performance
6. **Access services** through orchestrator for consistency

---

## 🔧 Advanced Configuration

### Custom Batch Size

```javascript
const orchestrator = factory.getOrchestrator();
const resourceService = orchestrator.getResourceService();
resourceService.setBatchSize(15); // Process 15 at a time
```

### Custom API Version

```javascript
const toolingApi = orchestrator.getToolingApi();
toolingApi.setApiVersion('v61.0');
```

---

## 📝 Output Structure

### Complete Data Output

```javascript
{
  bundles: [
    {
      id: "a00123456789",
      name: "myComponent",
      namespace: "c",
      description: "My component description",
      jsSource: "...",
      htmlSource: "...",
      dataFlow: {
        apiProperties: [...],
        dispatchedEvents: [...],
        wireAdapters: [...],
        childComponents: [...],
        messageChannelPublish: [...],
        messageChannelSubscribe: [...]
      }
    }
  ],
  dependencies: [...],
  metadata: {
    totalBundles: 150,
    totalDependencies: 300,
    timestamp: "2026-01-29T18:30:00.000Z"
  }
}
```

---

## 🤝 Contributing

Contributions welcome! Ensure:
- Classes maintain single responsibility
- Methods are well-documented
- Error handling is comprehensive
- Code follows existing patterns

---

## 📄 License

MIT

---

## 🙋 Support

For issues or questions, refer to usage examples or create an issue.