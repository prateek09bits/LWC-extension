/**
 * Salesforce API Factory - Usage Examples (Class-Based)
 * Demonstrates how to use the factory classes and methods
 */

import SalesforceApiFactory, {
  UrlUtils,
  SessionManager,
  ToolingApiService,
  LightningComponentBundleService,
  MetadataDependencyService,
  ComponentResourceService,
  SourceCodeParserService,
  OrchestratorService
} from './salesforceApiFactory.js';

// ============================================================================
// EXAMPLE 1: Using the Main Factory Class (Recommended)
// ============================================================================

async function example1_MainFactory(url) {
  console.log("=== EXAMPLE 1: Using Main Factory ===");
  
  // Create factory instance
  const factory = new SalesforceApiFactory();
  
  try {
    // Initialize with URL
    await factory.initialize(url);
    
    // Fetch all LWC data
    const data = await factory.fetchAllLWCData();
    
    console.log('Total Bundles:', data.metadata.totalBundles);
    console.log('Total Dependencies:', data.metadata.totalDependencies);
    console.log('Bundles:', data.bundles);
    console.log('Dependencies:', data.dependencies);
    
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    // Clean up
    factory.reset();
  }
}

// ============================================================================
// EXAMPLE 2: Fetch Specific Components by Name
// ============================================================================

async function example2_SpecificComponents(url) {
  console.log("=== EXAMPLE 2: Fetch Specific Components ===");
  
  const factory = new SalesforceApiFactory();
  
  try {
    await factory.initialize(url);
    
    // Fetch specific components
    const componentNames = ['myComponent', 'anotherComponent', 'testComponent'];
    const result = await factory.fetchComponents(componentNames);
    
    console.log(`Requested: ${result.metadata.requested}`);
    console.log(`Found: ${result.metadata.found}`);
    console.log('Components:', result.bundles);
    
    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 3: Fetch Component Dependencies
// ============================================================================

async function example3_ComponentDependencies(url, componentId) {
  console.log("=== EXAMPLE 3: Component Dependencies ===");
  
  const factory = new SalesforceApiFactory();
  
  try {
    await factory.initialize(url);
    
    // Fetch dependencies for a component
    const result = await factory.fetchDependencies(componentId);
    
    console.log('Component ID:', result.componentId);
    console.log('Dependencies:', result.dependencies);
    console.log('Dependent Components:', result.dependents);
    console.log('Dependency Count:', result.metadata.dependencyCount);
    console.log('Dependent Count:', result.metadata.dependentCount);
    
    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 4: Using Individual Service Classes (Advanced)
// ============================================================================

async function example4_IndividualServices(url) {
  console.log("=== EXAMPLE 4: Individual Services ===");
  
  try {
    // Step 1: Validate and convert URL
    if (!UrlUtils.isSalesforceUrl(url)) {
      throw new Error('Not a valid Salesforce URL');
    }
    
    const instanceUrl = UrlUtils.getInstanceUrl(url);
    console.log('Instance URL:', instanceUrl);
    
    // Step 2: Get session
    const sessionManager = new SessionManager();
    const sessionId = await sessionManager.getSessionId(instanceUrl);
    
    if (!sessionId) {
      throw new Error('No session found');
    }
    
    // Step 3: Create Tooling API service
    const toolingApi = new ToolingApiService(instanceUrl, sessionId);
    
    // Step 4: Use individual services
    const bundleService = new LightningComponentBundleService(toolingApi);
    const bundles = await bundleService.fetchAllBundles();
    
    console.log(`Fetched ${bundles.length} bundles`);
    console.log('First bundle:', bundles[0]);
    
    return bundles;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 5: Working with Bundle Service
// ============================================================================

async function example5_BundleService(url) {
  console.log("=== EXAMPLE 5: Bundle Service ===");
  
  const factory = new SalesforceApiFactory();
  
  try {
    await factory.initialize(url);
    
    const orchestrator = factory.getOrchestrator();
    const bundleService = orchestrator.getBundleService();
    
    // Fetch all bundles
    const allBundles = await bundleService.fetchAllBundles();
    console.log('All Bundles:', allBundles.length);
    
    // Fetch bundles by namespace
    const namespaceBundles = await bundleService.fetchBundlesByNamespace('c');
    console.log('Namespace "c" Bundles:', namespaceBundles.length);
    
    // Fetch specific bundle by name
    const specificBundle = await bundleService.fetchBundleByName('myComponent');
    console.log('Specific Bundle:', specificBundle);
    
    return { allBundles, namespaceBundles, specificBundle };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 6: Working with Dependency Service
// ============================================================================

async function example6_DependencyService(url, componentId) {
  console.log("=== EXAMPLE 6: Dependency Service ===");
  
  const factory = new SalesforceApiFactory();
  
  try {
    await factory.initialize(url);
    
    const orchestrator = factory.getOrchestrator();
    const dependencyService = orchestrator.getDependencyService();
    
    // Fetch all dependencies
    const allDeps = await dependencyService.fetchDependencies();
    console.log('All Dependencies:', allDeps.length);
    
    // Fetch dependencies for a component
    const componentDeps = await dependencyService.fetchDependenciesForComponent(componentId);
    console.log('Component Dependencies:', componentDeps);
    
    // Fetch dependent components
    const dependents = await dependencyService.fetchDependentComponents(componentId);
    console.log('Dependent Components:', dependents);
    
    return { allDeps, componentDeps, dependents };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 7: Working with Resource Service
// ============================================================================

async function example7_ResourceService(url) {
  console.log("=== EXAMPLE 7: Resource Service ===");
  
  const factory = new SalesforceApiFactory();
  
  try {
    await factory.initialize(url);
    
    const orchestrator = factory.getOrchestrator();
    const bundleService = orchestrator.getBundleService();
    const resourceService = orchestrator.getResourceService();
    
    // Get some bundles first
    const bundles = await bundleService.fetchAllBundles();
    const firstThree = bundles.slice(0, 3);
    
    // Set custom batch size
    resourceService.setBatchSize(5);
    
    // Fetch source for specific bundle
    const singleSource = await resourceService.fetchBundleSource(firstThree[0]);
    console.log('Single Bundle Source:', singleSource);
    
    // Fetch sources for multiple bundles
    const multipleSources = await resourceService.fetchAllBundleSources(firstThree);
    console.log('Multiple Bundle Sources:', multipleSources.length);
    
    // Fetch all resources for a bundle (including CSS, etc.)
    const allResources = await resourceService.fetchAllBundleResources(firstThree[0].Id);
    console.log('All Resources:', allResources);
    
    return { singleSource, multipleSources, allResources };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 8: Working with Parser Service
// ============================================================================

function example8_ParserService() {
  console.log("=== EXAMPLE 8: Parser Service ===");
  
  const parser = new SourceCodeParserService();
  
  const jsCode = `
    import { LightningElement, api, wire } from 'lwc';
    import { publish, subscribe } from 'lightning/messageService';
    import SAMPLE_CHANNEL from '@salesforce/messageChannel/SampleChannel__c';
    import getAccounts from '@salesforce/apex/AccountController.getAccounts';
    
    export default class MyComponent extends LightningElement {
      @api recordId;
      @api title;
      @api get fullName() {
        return this.firstName + ' ' + this.lastName;
      }
      
      @wire(getAccounts, { searchKey: '$searchTerm' })
      accounts;
      
      handleClick() {
        this.dispatchEvent(new CustomEvent('itemselected', {
          detail: { id: this.recordId }
        }));
        this.dispatchEvent(new CustomEvent('save'));
      }
      
      publishMessage() {
        publish(this.messageContext, SAMPLE_CHANNEL, { data: 'test' });
      }
      
      connectedCallback() {
        subscribe(this.messageContext, SAMPLE_CHANNEL, this.handleMessage);
      }
    }
  `;
  
  const htmlCode = `
    <template>
      <c-child-component 
        record-id={recordId}
        title={title}
        data={accounts}
        onitemclick={handleItemClick}
        onsave={handleSave}>
      </c-child-component>
      
      <c-another-component
        name="test"
        value={someValue}
        onchange={handleChange}>
      </c-another-component>
    </template>
  `;
  
  // Extract individual patterns
  const apiProps = parser.extractApiProperties(jsCode);
  console.log('API Properties:', apiProps);
  
  const events = parser.extractDispatchedEvents(jsCode);
  console.log('Dispatched Events:', events);
  
  const wireAdapters = parser.extractWireAdapters(jsCode);
  console.log('Wire Adapters:', wireAdapters);
  
  const publishes = parser.extractMessagePublish(jsCode);
  console.log('Message Publishes:', publishes);
  
  const subscribes = parser.extractMessageSubscribe(jsCode);
  console.log('Message Subscribes:', subscribes);
  
  const childComponents = parser.extractChildComponents(htmlCode);
  console.log('Child Components:', childComponents);
  
  // Parse complete component
  const component = {
    name: 'myComponent',
    jsSource: jsCode,
    htmlSource: htmlCode
  };
  
  const parsed = parser.parseComponentDataFlow(component);
  console.log('Complete Data Flow:', parsed.dataFlow);
  
  return parsed;
}

// ============================================================================
// EXAMPLE 9: Custom Tooling API Query
// ============================================================================

async function example9_CustomQuery(url) {
  console.log("=== EXAMPLE 9: Custom Tooling API Query ===");
  
  const factory = new SalesforceApiFactory();
  
  try {
    await factory.initialize(url);
    
    const orchestrator = factory.getOrchestrator();
    const toolingApi = orchestrator.getToolingApi();
    
    // Custom query for Apex classes
    const apexQuery = `
      SELECT Id, Name, ApiVersion, Status
      FROM ApexClass
      WHERE Name LIKE '%Controller%'
      LIMIT 20
    `;
    
    const apexClasses = await toolingApi.executeQuery(apexQuery);
    console.log('Apex Classes:', apexClasses);
    
    // Execute multiple queries in parallel
    const queries = [
      `SELECT Id, DeveloperName FROM LightningComponentBundle LIMIT 5`,
      `SELECT Id, Name FROM ApexClass LIMIT 5`,
      `SELECT Id, DeveloperName FROM ApexPage LIMIT 5`
    ];
    
    const results = await toolingApi.executeQueriesParallel(queries);
    console.log('Parallel Query Results:', results);
    
    return { apexClasses, parallelResults: results };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 10: Chrome Extension Background Script Integration
// ============================================================================

function example10_ChromeExtensionIntegration() {
  console.log("=== EXAMPLE 10: Chrome Extension Integration ===");
  
  // Global factory instance
  let factory = null;
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FETCH_LWC_DATA') {
      (async () => {
        try {
          // Create new factory if needed
          if (!factory) {
            factory = new SalesforceApiFactory();
          }
          
          // Initialize with URL
          await factory.initialize(message.url);
          
          // Fetch all data
          const data = await factory.fetchAllLWCData();
          
          // Send to popup or content script
          chrome.runtime.sendMessage({
            type: 'LWC_DEPENDENCY_DATA',
            payload: data
          });
          
          sendResponse({ 
            success: true, 
            componentsCount: data.bundles.length 
          });
          
        } catch (error) {
          console.error('Error:', error);
          sendResponse({ 
            success: false, 
            error: error.message 
          });
        }
      })();
      
      return true; // Keep message channel open
    }
    
    if (message.type === 'FETCH_SPECIFIC_COMPONENTS') {
      (async () => {
        try {
          if (!factory) {
            factory = new SalesforceApiFactory();
            await factory.initialize(message.url);
          }
          
          const result = await factory.fetchComponents(message.componentNames);
          
          sendResponse({ 
            success: true, 
            data: result 
          });
          
        } catch (error) {
          sendResponse({ 
            success: false, 
            error: error.message 
          });
        }
      })();
      
      return true;
    }
    
    if (message.type === 'RESET_FACTORY') {
      if (factory) {
        factory.reset();
        factory = null;
      }
      sendResponse({ success: true });
    }
  });
  
  console.log('Chrome extension integration ready');
}

// ============================================================================
// EXAMPLE 11: Error Handling and Retry Logic
// ============================================================================

async function example11_ErrorHandling(url) {
  console.log("=== EXAMPLE 11: Error Handling ===");
  
  const factory = new SalesforceApiFactory();
  
  try {
    // Attempt to initialize
    await factory.initialize(url);
    
  } catch (error) {
    if (error.message.includes('Not a valid Salesforce URL')) {
      console.error('Invalid URL provided');
      // Handle invalid URL
    } else if (error.message.includes('No Salesforce session found')) {
      console.error('User not logged in to Salesforce');
      // Redirect to login or show message
    } else if (error.message.includes('401')) {
      console.error('Session expired');
      // Re-authenticate
    } else if (error.message.includes('403')) {
      console.error('Insufficient permissions');
      // Show permission error
    } else {
      console.error('Unknown error:', error);
    }
    throw error;
  }
  
  try {
    // Attempt to fetch data
    const data = await factory.fetchAllLWCData();
    return data;
    
  } catch (error) {
    console.error('Error fetching LWC data:', error);
    
    // Retry logic
    console.log('Retrying in 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const data = await factory.fetchAllLWCData();
      return data;
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      throw retryError;
    }
  } finally {
    factory.reset();
  }
}

// ============================================================================
// EXAMPLE 12: Session Management
// ============================================================================

async function example12_SessionManagement(url) {
  console.log("=== EXAMPLE 12: Session Management ===");
  
  const sessionManager = new SessionManager();
  
  const instanceUrl = UrlUtils.getInstanceUrl(url);
  
  // Get session ID
  const sessionId = await sessionManager.getSessionId(instanceUrl);
  console.log('Session ID retrieved:', sessionId ? 'Yes' : 'No');
  
  // Get cached values
  const cachedSessionId = sessionManager.getCachedSessionId();
  const cachedInstanceUrl = sessionManager.getCachedInstanceUrl();
  
  console.log('Cached Session ID:', cachedSessionId);
  console.log('Cached Instance URL:', cachedInstanceUrl);
  
  // Clear cache
  sessionManager.clearCache();
  console.log('Cache cleared');
  
  return {
    sessionId,
    cachedSessionId,
    cachedInstanceUrl
  };
}

// ============================================================================
// EXPORT ALL EXAMPLES
// ============================================================================

export {
  example1_MainFactory,
  example2_SpecificComponents,
  example3_ComponentDependencies,
  example4_IndividualServices,
  example5_BundleService,
  example6_DependencyService,
  example7_ResourceService,
  example8_ParserService,
  example9_CustomQuery,
  example10_ChromeExtensionIntegration,
  example11_ErrorHandling,
  example12_SessionManagement
};