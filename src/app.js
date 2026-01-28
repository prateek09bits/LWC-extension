// ============================================================================
// LWC SCHEMA BUILDER - PROFESSIONAL ARCHITECTURE VISUALIZATION
// Industry-standard force-directed graph with intelligent data flow parsing
// ============================================================================

class LWCSchemaBuilder {
    constructor() {
        // Canvas State
        this.nodes = [];
        this.connections = [];
        
        // Workspace Management
        this.workspaces = [];
        this.currentWorkspace = null;
        
        // View Settings
        this.viewMode = 'relationship'; // 'relationship' or 'dataflow'
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        
        // Interaction State
        this.isPanning = false;
        this.isDragging = false;
        this.draggedNode = null;
        this.dragOffset = { x: 0, y: 0 };
        this.lastPanTime = 0;
        
        // Component Data
        this.availableComponents = [];
        this.allComponents = [];
        this.searchTerm = '';
        this.rawDependencies = [];
        
        // Animation Frame
        this.animationFrame = null;
        
        this.init();
    }
    
    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadWorkspaces();
        this.updateUI();
        console.log("✅ Professional LWC Schema Builder initialized");
    }
    
    cacheElements() {
        this.els = {
            closeBtn: document.getElementById('closeApp'),
            sidebarToggle: document.getElementById('sidebarToggle'),
            relationshipBtn: document.getElementById('relationshipModeBtn'),
            dataflowBtn: document.getElementById('dataflowModeBtn'),
            workspaceName: document.querySelector('.workspace-name'),
            newWorkspaceBtn: document.getElementById('newWorkspaceBtn'),
            saveBtn: document.getElementById('saveWorkspaceBtn'),
            moreMenuBtn: document.getElementById('moreMenuBtn'),
            moreMenu: document.getElementById('moreMenu'),
            sidebar: document.getElementById('sidebar'),
            closeSidebar: document.getElementById('closeSidebar'),
            searchInput: document.getElementById('searchInput'),
            componentList: document.getElementById('componentList'),
            canvas: document.getElementById('canvasContainer'),
            canvasWorld: document.getElementById('canvasWorld'),
            svg: document.getElementById('connectionsSvg'),
            emptyState: document.getElementById('canvasEmptyState'),
            legend: document.getElementById('legend'),
            zoomIn: document.getElementById('zoomInBtn'),
            zoomOut: document.getElementById('zoomOutBtn'),
            zoomReset: document.getElementById('zoomResetBtn'),
            zoomLevel: document.getElementById('zoomLevel'),
            workspaceModal: document.getElementById('workspaceModal'),
            closeWorkspaceModal: document.getElementById('closeWorkspaceModal'),
            newWorkspaceName: document.getElementById('newWorkspaceName'),
            createWorkspaceBtn: document.getElementById('createWorkspaceBtn'),
            workspaceList: document.getElementById('workspaceList'),
            exportModal: document.getElementById('exportModal'),
            closeExportModal: document.getElementById('closeExportModal'),
            exportJson: document.getElementById('exportJson'),
            exportImage: document.getElementById('exportImage'),
            cancelExport: document.getElementById('cancelExport'),
            downloadExport: document.getElementById('downloadExport'),
            fileInput: document.getElementById('fileInput')
        };
    }
    
    bindEvents() {
        // Header actions
        this.els.closeBtn?.addEventListener('click', () => window.close());
        this.els.sidebarToggle?.addEventListener('click', () => this.toggleSidebar());
        this.els.relationshipBtn?.addEventListener('click', () => this.switchViewMode('relationship'));
        this.els.dataflowBtn?.addEventListener('click', () => this.switchViewMode('dataflow'));
        this.els.newWorkspaceBtn?.addEventListener('click', () => this.openModal('workspace'));
        this.els.saveBtn?.addEventListener('click', () => this.saveWorkspace());
        this.els.moreMenuBtn?.addEventListener('click', () => this.toggleMoreMenu());
        
        // Sidebar
        this.els.closeSidebar?.addEventListener('click', () => this.toggleSidebar());
        this.els.searchInput?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        // Canvas interactions
        this.els.canvas?.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        this.els.canvas?.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', () => this.handleMouseUp());
        this.els.canvas?.addEventListener('dragover', (e) => e.preventDefault());
        this.els.canvas?.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Zoom controls
        this.els.zoomIn?.addEventListener('click', () => this.zoom(0.1));
        this.els.zoomOut?.addEventListener('click', () => this.zoom(-0.1));
        this.els.zoomReset?.addEventListener('click', () => this.resetZoom());
        
        // Modals
        this.els.closeWorkspaceModal?.addEventListener('click', () => this.closeModal('workspace'));
        this.els.newWorkspaceName?.addEventListener('input', (e) => {
            this.els.createWorkspaceBtn.disabled = !e.target.value.trim();
        });
        this.els.newWorkspaceName?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                this.createWorkspace();
            }
        });
        this.els.createWorkspaceBtn?.addEventListener('click', () => this.createWorkspace());
        this.els.closeExportModal?.addEventListener('click', () => this.closeModal('export'));
        this.els.cancelExport?.addEventListener('click', () => this.closeModal('export'));
        this.els.downloadExport?.addEventListener('click', () => this.handleExport());
        this.els.fileInput?.addEventListener('change', (e) => this.handleImport(e));
        
        // Dropdown actions
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleMenuAction(action);
                this.toggleMoreMenu();
            });
        });
        
        // Bulk actions
        document.querySelectorAll('.action-link').forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleBulkAction(e.currentTarget.dataset.action);
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                this.els.moreMenu?.classList.remove('active');
            }
        });
        
        // Chrome extension messaging
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.onMessage.addListener((msg) => {
                if (msg.type === "LWC_DEPENDENCY_DATA") {
                    console.log("✅ Received component data:", msg.payload);
                    this.processSalesforceMetadata(msg.payload);
                }
            });
            
            chrome.runtime.sendMessage({ 
                type: "FETCH_LWC_DEPENDENCY", 
                url: window.location.href 
            });
        }
    }
    
    // ========================================================================
    // VIEW MODE MANAGEMENT
    // ========================================================================
    
    switchViewMode(mode) {
        if (this.viewMode === mode) return;
        
        this.viewMode = mode;
        this.els.relationshipBtn?.classList.toggle('active', mode === 'relationship');
        this.els.dataflowBtn?.classList.toggle('active', mode === 'dataflow');
        
        document.querySelectorAll('.legend-section').forEach(section => {
            section.classList.toggle('hidden', section.dataset.mode !== mode);
        });
        
        this.renderConnections();
        console.log(`🔄 Switched to ${mode} mode`);
    }
    
    // ========================================================================
    // DATA PROCESSING - SALESFORCE METADATA
    // ========================================================================
    
    processSalesforceMetadata(data) {
        console.log("🔥 Processing Salesforce metadata...");
        
        const { bundles, dependencies } = data;
        
        if (!bundles || !Array.isArray(bundles)) {
            console.error("❌ Invalid bundles data");
            return;
        }
        
        // Store raw dependencies for relationship mode
        this.rawDependencies = dependencies || [];
        
        // Build dependency map for relationship mode
        const depMap = new Map();
        this.rawDependencies.forEach(dep => {
            if (!depMap.has(dep.MetadataComponentName)) {
                depMap.set(dep.MetadataComponentName, {
                    apexClasses: [],
                    lwcDependencies: [],
                    messageChannels: []
                });
            }
            
            const comp = depMap.get(dep.MetadataComponentName);
            const refType = dep.RefMetadataComponentType;
            const refName = dep.RefMetadataComponentName;
            
            if (refType === 'ApexClass') {
                comp.apexClasses.push(refName);
            } else if (refType === 'LightningComponentBundle') {
                comp.lwcDependencies.push(refName);
            } else if (refType === 'LightningMessageChannel') {
                comp.messageChannels.push(refName);
            }
        });
        
        // Process all components with both modes
        this.allComponents = bundles.map(bundle => {
            const deps = depMap.get(bundle.name) || {
                apexClasses: [],
                lwcDependencies: [],
                messageChannels: []
            };
            
            return {
                id: bundle.id,
                name: bundle.name,
                namespace: bundle.namespace,
                description: bundle.description,
                // Relationship mode data
                apexClasses: deps.apexClasses,
                lwcDependencies: deps.lwcDependencies,
                messageChannels: deps.messageChannels,
                hasApexClasses: deps.apexClasses.length > 0,
                // Data flow mode data
                dataFlow: bundle.dataFlow,
                jsSource: bundle.jsSource,
                htmlSource: bundle.htmlSource,
                error: bundle.error
            };
        });
        
        this.availableComponents = [...this.allComponents];
        this.renderComponentList();
        this.updateUI();
        
        console.log(`✅ Processed ${this.allComponents.length} components`);
        console.log("📊 Sample component data:", this.allComponents[0]);
    }
    
    // ========================================================================
    // COMPONENT LIST RENDERING
    // ========================================================================
    
    renderComponentList() {
        if (!this.els.componentList) return;
        
        this.els.componentList.innerHTML = '';
        
        const filtered = this.availableComponents.filter(c =>
            c.name.toLowerCase().includes(this.searchTerm.toLowerCase())
        );
        
        const available = filtered.filter(c => 
            !this.nodes.some(n => n.label === c.name)
        );
        
        if (!available.length) {
            const message = filtered.length > 0 ? 'All components on canvas' : 'No matches found';
            this.els.componentList.innerHTML = `
                <div class="empty-state">
                    <p>${message}</p>
                </div>
            `;
            return;
        }
        
        available.forEach(comp => {
            const item = document.createElement('div');
            item.className = 'component-item';
            item.draggable = true;
            item.dataset.name = comp.name;
            
            const badges = [];
            if (comp.hasApexClasses) {
                badges.push(`<span class="badge badge-apex">${comp.apexClasses.length} Apex</span>`);
            }
            if (comp.dataFlow?.apiProperties?.length > 0) {
                badges.push(`<span class="badge badge-api">${comp.dataFlow.apiProperties.length} @api</span>`);
            }
            if (comp.dataFlow?.dispatchedEvents?.length > 0) {
                badges.push(`<span class="badge badge-event">${comp.dataFlow.dispatchedEvents.length} events</span>`);
            }
            if (comp.dataFlow?.messageChannelPublish?.length > 0 || comp.dataFlow?.messageChannelSubscribe?.length > 0) {
                badges.push(`<span class="badge badge-lms">LMS</span>`);
            }
            
            item.innerHTML = `
                <div class="component-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 2L2 6v8l8 4 8-4V6l-8-4zm0 2.5l5.5 2.75L10 10 4.5 7.25 10 4.5zM4 8.5l5.5 2.75v5.5L4 14V8.5zm12 5.5l-5.5 2.75v-5.5L16 8.5V14z"/>
                    </svg>
                </div>
                <div class="component-info">
                    <div class="component-name">${comp.name}</div>
                    ${badges.length > 0 ? `<div class="component-meta">${badges.join(' ')}</div>` : ''}
                </div>
            `;
            
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'component',
                    name: comp.name
                }));
                e.dataTransfer.effectAllowed = 'copy';
                item.classList.add('dragging');
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
            
            this.els.componentList.appendChild(item);
        });
    }
    
    // ========================================================================
    // NODE RENDERING
    // ========================================================================
    
    renderNodes() {
        document.querySelectorAll('.schema-node').forEach(n => n.remove());
        
        this.nodes.forEach(node => {
            const el = document.createElement('div');
            el.className = 'schema-node';
            el.dataset.id = node.id;
            el.dataset.label = node.label;
            el.style.left = `${node.x}px`;
            el.style.top = `${node.y}px`;
            
            const comp = this.allComponents.find(c => c.name === node.label);
            
            let contentHtml = '';
            
            if (this.viewMode === 'relationship') {
                // Show Apex classes in relationship mode
                if (node.hasApexClasses && node.apexClasses.length > 0) {
                    contentHtml = `
                        <div class="node-content">
                            ${node.apexClasses.slice(0, 5).map(apexClass => `
                                <div class="apex-class-item">
                                    <div class="apex-dot"></div>
                                    <span class="apex-name">${apexClass}</span>
                                </div>
                            `).join('')}
                            ${node.apexClasses.length > 5 ? `<div class="apex-more">+${node.apexClasses.length - 5} more</div>` : ''}
                        </div>
                    `;
                }
            } else {
                // Show data flow information
                const dataFlowItems = [];
                
                if (comp?.dataFlow?.apiProperties?.length > 0) {
                    dataFlowItems.push(`
                        <div class="dataflow-item">
                            <span class="dataflow-label">@api Properties:</span>
                            <span class="dataflow-value">${comp.dataFlow.apiProperties.map(p => p.name).join(', ')}</span>
                        </div>
                    `);
                }
                
                if (comp?.dataFlow?.dispatchedEvents?.length > 0) {
                    dataFlowItems.push(`
                        <div class="dataflow-item">
                            <span class="dataflow-label">Events:</span>
                            <span class="dataflow-value">${comp.dataFlow.dispatchedEvents.map(e => e.name).join(', ')}</span>
                        </div>
                    `);
                }
                
                if (comp?.dataFlow?.childComponents?.length > 0) {
                    dataFlowItems.push(`
                        <div class="dataflow-item">
                            <span class="dataflow-label">Child Components:</span>
                            <span class="dataflow-value">${comp.dataFlow.childComponents.length}</span>
                        </div>
                    `);
                }
                
                if (dataFlowItems.length > 0) {
                    contentHtml = `<div class="node-content">${dataFlowItems.join('')}</div>`;
                }
            }
            
            el.innerHTML = `
                <div class="node-card">
                    <div class="node-header">
                        <div class="node-title-section">
                            <div class="node-title">${node.label}</div>
                            <div class="node-type">Lightning Web Component</div>
                        </div>
                        <button class="node-close-btn" title="Remove from canvas">×</button>
                    </div>
                    ${contentHtml}
                </div>
                <div class="node-port node-port-left" data-side="left"></div>
                <div class="node-port node-port-right" data-side="right"></div>
            `;
            
            el.addEventListener('mousedown', (e) => this.handleNodeMouseDown(e, el));
            el.querySelector('.node-close-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeNode(node.id);
            });
            
            this.els.canvasWorld.appendChild(el);
        });
    }
    
    // ========================================================================
    // CONNECTION RENDERING WITH PROPER DATA FLOW LOGIC
    // ========================================================================
    
    renderConnections() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.animationFrame = requestAnimationFrame(() => {
            this.els.svg.querySelectorAll('line, path').forEach(l => l.remove());
            
            if (this.viewMode === 'relationship') {
                this.renderRelationshipConnections();
            } else {
                this.renderDataFlowConnections();
            }
        });
    }
    
    renderRelationshipConnections() {
        const drawn = new Set();
        
        this.nodes.forEach(node => {
            const comp = this.allComponents.find(c => c.name === node.label);
            if (!comp) return;
            
            // Draw LWC dependencies (simple references)
            comp.lwcDependencies.forEach(depName => {
                const targetNode = this.nodes.find(n => n.label === depName);
                if (targetNode) {
                    const key = `${node.label}-${depName}`;
                    if (!drawn.has(key)) {
                        drawn.add(key);
                        this.drawConnection(node, targetNode, 'dependency');
                    }
                }
            });
        });
    }
    
    renderDataFlowConnections() {
        const drawn = new Set();
        
        console.log("🔍 Rendering data flow connections...");
        
        this.nodes.forEach(parentNode => {
            const parentComp = this.allComponents.find(c => c.name === parentNode.label);
            if (!parentComp || !parentComp.dataFlow) return;
            
            console.log(`📊 Processing parent: ${parentNode.label}`, parentComp.dataFlow);
            
            // Process each child component used in parent's template
            parentComp.dataFlow.childComponents.forEach(childUsage => {
                // Convert kebab-case tag to camelCase component name
                const childName = this.kebabToCamel(childUsage.name);
                
                // Find child node on canvas
                const childNode = this.nodes.find(n => 
                    n.label.toLowerCase() === childName.toLowerCase()
                );
                
                if (!childNode) {
                    console.log(`⚠️ Child component ${childName} not on canvas`);
                    return;
                }
                
                const childComp = this.allComponents.find(c => c.name === childNode.label);
                if (!childComp || !childComp.dataFlow) {
                    console.log(`⚠️ No data flow info for ${childNode.label}`);
                    return;
                }
                
                console.log(`🔗 Found child on canvas: ${childNode.label}`);
                console.log(`   Property bindings:`, childUsage.propertyBindings);
                console.log(`   Event handlers:`, childUsage.eventHandlers);
                console.log(`   Child @api properties:`, childComp.dataFlow.apiProperties);
                console.log(`   Child dispatched events:`, childComp.dataFlow.dispatchedEvents);
                
                // PARENT → CHILD: Property bindings via @api
                childUsage.propertyBindings.forEach(binding => {
                    const propName = binding.property;
                    
                    // Check if child has matching @api property (case-insensitive)
                    const hasMatchingApi = childComp.dataFlow.apiProperties?.some(
                        api => api.name.toLowerCase() === propName.toLowerCase()
                    );
                    
                    if (hasMatchingApi) {
                        const key = `parent-child-${parentNode.id}-${childNode.id}-${propName}`;
                        if (!drawn.has(key)) {
                            drawn.add(key);
                            console.log(`✅ Drawing PARENT→CHILD: ${parentNode.label} → ${childNode.label} (${propName})`);
                            this.drawConnection(parentNode, childNode, 'publish', `@api ${propName}`);
                        }
                    } else {
                        console.log(`❌ No matching @api for property: ${propName}`);
                    }
                });
                
                // CHILD → PARENT: Event handling
                childUsage.eventHandlers.forEach(handler => {
                    const eventName = handler.event;
                    
                    // Check if child dispatches this event (case-insensitive)
                    const hasMatchingEvent = childComp.dataFlow.dispatchedEvents?.some(
                        evt => evt.name.toLowerCase() === eventName.toLowerCase()
                    );
                    
                    if (hasMatchingEvent) {
                        const key = `child-parent-${childNode.id}-${parentNode.id}-${eventName}`;
                        if (!drawn.has(key)) {
                            drawn.add(key);
                            console.log(`✅ Drawing CHILD→PARENT: ${childNode.label} → ${parentNode.label} (${eventName})`);
                            this.drawConnection(childNode, parentNode, 'dispatch', `event: ${eventName}`);
                        }
                    } else {
                        console.log(`❌ No matching event dispatch for: ${eventName}`);
                    }
                });
            });
        });
        
        // Lightning Message Service connections
        this.renderMessageServiceConnections(drawn);
        
        console.log(`✅ Drew ${drawn.size} data flow connections`);
    }
    
    renderMessageServiceConnections(drawn) {
        const publishers = new Map();
        const subscribers = new Map();
        
        // Group components by their message channels
        this.nodes.forEach(node => {
            const comp = this.allComponents.find(c => c.name === node.label);
            if (!comp || !comp.dataFlow) return;
            
            // Track publishers
            comp.dataFlow.messageChannelPublish?.forEach(pub => {
                if (!publishers.has(pub.channel)) {
                    publishers.set(pub.channel, []);
                }
                publishers.get(pub.channel).push(node);
            });
            
            // Track subscribers
            comp.dataFlow.messageChannelSubscribe?.forEach(sub => {
                if (!subscribers.has(sub.channel)) {
                    subscribers.set(sub.channel, []);
                }
                subscribers.get(sub.channel).push(node);
            });
        });
        
        // Draw publish → subscribe connections
        publishers.forEach((pubNodes, channel) => {
            const subNodes = subscribers.get(channel);
            if (!subNodes) return;
            
            pubNodes.forEach(pubNode => {
                subNodes.forEach(subNode => {
                    if (pubNode.id === subNode.id) return;
                    
                    const key = `lms-${pubNode.id}-${subNode.id}-${channel}`;
                    if (!drawn.has(key)) {
                        drawn.add(key);
                        console.log(`✅ Drawing LMS: ${pubNode.label} → ${subNode.label} (${channel})`);
                        this.drawConnection(pubNode, subNode, 'message', channel);
                    }
                });
            });
        });
    }
    
    drawConnection(from, to, type, label = '') {
        const fromEl = document.querySelector(`.schema-node[data-id="${from.id}"]`);
        const toEl = document.querySelector(`.schema-node[data-id="${to.id}"]`);
        
        if (!fromEl || !toEl) return;
        
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        const canvasRect = this.els.canvas.getBoundingClientRect();
        
        // Use right port of source node
        const x1 = (fromRect.right - canvasRect.left - this.offsetX) / this.scale;
        const y1 = (fromRect.top + fromRect.height / 2 - canvasRect.top - this.offsetY) / this.scale;
        
        // Use left port of target node
        const x2 = (toRect.left - canvasRect.left - this.offsetX) / this.scale;
        const y2 = (toRect.top + toRect.height / 2 - canvasRect.top - this.offsetY) / this.scale;
        
        const style = this.getConnectionStyle(type);
        
        // Create smooth bezier curve
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const controlPointOffset = Math.min(distance * 0.5, 150);
        
        const d = `M ${x1} ${y1} C ${x1 + controlPointOffset} ${y1}, ${x2 - controlPointOffset} ${y2}, ${x2} ${y2}`;
        
        path.setAttribute('d', d);
        path.setAttribute('stroke', style.color);
        path.setAttribute('stroke-width', style.width);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-dasharray', style.dash);
        path.setAttribute('marker-end', style.marker);
        path.setAttribute('class', `connection connection-${type}`);
        
        // Add label if provided
        if (label) {
            path.setAttribute('data-label', label);
            
            // Add text label at midpoint
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', midX);
            text.setAttribute('y', midY - 5);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '11');
            text.setAttribute('font-family', 'Inter, system-ui, sans-serif');
            text.setAttribute('fill', style.color);
            text.setAttribute('class', 'connection-label');
            text.textContent = label;
            
            this.els.svg.appendChild(text);
        }
        
        this.els.svg.appendChild(path);
    }
    
    getConnectionStyle(type) {
        const styles = {
            // Relationship mode
            dependency: { 
                color: '#0176d3', 
                width: '2', 
                dash: '0', 
                marker: 'url(#arrowhead-dependency)' 
            },
            apex: { 
                color: '#fe9339', 
                width: '2', 
                dash: '5,3', 
                marker: 'url(#arrowhead-apex)' 
            },
            // Data flow mode
            publish: { 
                color: '#2e844a', 
                width: '2.5', 
                dash: '0', 
                marker: 'url(#arrowhead-publish)' 
            },
            dispatch: { 
                color: '#e3165b', 
                width: '2.5', 
                dash: '5,3', 
                marker: 'url(#arrowhead-dispatch)' 
            },
            message: { 
                color: '#8b44ac', 
                width: '2.5', 
                dash: '8,4', 
                marker: 'url(#arrowhead-subscribe)' 
            }
        };
        return styles[type] || styles.dependency;
    }
    
    // ========================================================================
    // CANVAS INTERACTION HANDLERS
    // ========================================================================
    
    handleCanvasMouseDown(e) {
        if (e.target.closest('.schema-node')) return;
        
        this.isPanning = true;
        this.panStartX = e.clientX - this.offsetX;
        this.panStartY = e.clientY - this.offsetY;
        this.els.canvas.style.cursor = 'grabbing';
    }
    
    handleNodeMouseDown(e, el) {
        if (e.target.closest('.node-close-btn')) return;
        
        e.stopPropagation();
        this.isDragging = true;
        this.draggedNode = el;
        
        const node = this.nodes.find(n => n.id === el.dataset.id);
        const rect = this.els.canvas.getBoundingClientRect();
        
        this.dragOffset = {
            x: (e.clientX - rect.left - this.offsetX) / this.scale - node.x,
            y: (e.clientY - rect.top - this.offsetY) / this.scale - node.y
        };
        
        el.style.cursor = 'grabbing';
        el.classList.add('dragging');
    }
    
    handleMouseMove(e) {
        if (this.isPanning) {
            this.offsetX = e.clientX - this.panStartX;
            this.offsetY = e.clientY - this.panStartY;
            this.updateCanvasTransform();
            
            // Throttle connection rendering during panning
            const now = Date.now();
            if (now - this.lastPanTime > 16) {
                this.renderConnections();
                this.lastPanTime = now;
            }
        }
        
        if (this.isDragging && this.draggedNode) {
            const rect = this.els.canvas.getBoundingClientRect();
            const node = this.nodes.find(n => n.id === this.draggedNode.dataset.id);
            
            const x = (e.clientX - rect.left - this.offsetX) / this.scale - this.dragOffset.x;
            const y = (e.clientY - rect.top - this.offsetY) / this.scale - this.dragOffset.y;
            
            node.x = x;
            node.y = y;
            this.draggedNode.style.left = `${x}px`;
            this.draggedNode.style.top = `${y}px`;
            
            this.renderConnections();
        }
    }
    
    handleMouseUp() {
        if (this.isPanning) {
            this.isPanning = false;
            this.els.canvas.style.cursor = 'grab';
            this.renderConnections();
        }
        
        if (this.isDragging) {
            this.isDragging = false;
            if (this.draggedNode) {
                this.draggedNode.style.cursor = 'grab';
                this.draggedNode.classList.remove('dragging');
            }
            this.draggedNode = null;
            this.scheduleAutoSave();
        }
    }
    
    handleWheel(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const prevScale = this.scale;
        this.scale = Math.max(0.3, Math.min(2, this.scale + delta));
        
        if (prevScale !== this.scale) {
            // Zoom towards mouse position
            const rect = this.els.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            this.offsetX = mouseX - (mouseX - this.offsetX) * (this.scale / prevScale);
            this.offsetY = mouseY - (mouseY - this.offsetY) * (this.scale / prevScale);
            
            this.updateCanvasTransform();
            this.renderConnections();
        }
    }
    
    handleDrop(e) {
        e.preventDefault();
        
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.type !== 'component') return;
        
        const rect = this.els.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.offsetX) / this.scale;
        const y = (e.clientY - rect.top - this.offsetY) / this.scale;
        
        this.addNode(data.name, x, y);
    }
    
    // ========================================================================
    // NODE MANAGEMENT
    // ========================================================================
    
    addNode(name, x, y) {
        const comp = this.allComponents.find(c => c.name === name);
        if (!comp) return;
        
        if (this.nodes.some(n => n.label === comp.name)) {
            console.warn(`Component ${comp.name} already on canvas`);
            return;
        }
        
        const node = {
            id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            label: comp.name,
            x,
            y,
            apexClasses: comp.apexClasses || [],
            hasApexClasses: (comp.apexClasses || []).length > 0,
            lwcDependencies: comp.lwcDependencies || [],
            dataFlow: comp.dataFlow
        };
        
        this.nodes.push(node);
        this.renderNodes();
        this.renderConnections();
        this.renderComponentList();
        this.updateUI();
        this.scheduleAutoSave();
    }
    
    removeNode(id) {
        this.nodes = this.nodes.filter(n => n.id !== id);
        this.renderNodes();
        this.renderConnections();
        this.renderComponentList();
        this.updateUI();
        this.scheduleAutoSave();
    }
    
    // ========================================================================
    // AUTO LAYOUT - IMPROVED FORCE-DIRECTED GRAPH ALGORITHM
    // ========================================================================
    
    applyAutoLayout() {
        if (!this.nodes.length) {
            // Add all available components
            this.availableComponents.forEach(c => {
                if (!this.nodes.some(n => n.label === c.name)) {
                    this.addNode(c.name, 0, 0);
                }
            });
        }
        
        if (!this.nodes.length) return;
        
        console.log('🎯 Applying improved force-directed layout...');
        
        // Run force-directed algorithm
        this.runForceDirectedLayout();
        
        // Center and fit the layout
        this.centerAndFitLayout();
        
        this.renderNodes();
        this.renderConnections();
        this.scheduleAutoSave();
    }
    
    runForceDirectedLayout() {
        const iterations = 150;
        const repulsionStrength = 25000;
        const attractionStrength = 0.015;
        const damping = 0.8;
        const minDistance = 300; // Minimum distance between nodes
        
        // Initialize positions randomly in a circle if not set
        this.nodes.forEach((node, i) => {
            if (!node.x && !node.y) {
                const angle = (i / this.nodes.length) * 2 * Math.PI;
                const radius = 300;
                node.x = Math.cos(angle) * radius;
                node.y = Math.sin(angle) * radius;
            }
            node.vx = 0;
            node.vy = 0;
        });
        
        // Build connection map based on current view mode
        const connections = this.getLayoutConnections();
        
        for (let iter = 0; iter < iterations; iter++) {
            const temperature = 1 - (iter / iterations); // Simulated annealing
            
            // Apply repulsive forces between all nodes
            for (let i = 0; i < this.nodes.length; i++) {
                for (let j = i + 1; j < this.nodes.length; j++) {
                    const node1 = this.nodes[i];
                    const node2 = this.nodes[j];
                    
                    const dx = node2.x - node1.x;
                    const dy = node2.y - node1.y;
                    const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
                    
                    // Stronger repulsion at close distances
                    const force = repulsionStrength / (distance * distance);
                    const fx = (dx / distance) * force;
                    const fy = (dy / distance) * force;
                    
                    node1.vx -= fx;
                    node1.vy -= fy;
                    node2.vx += fx;
                    node2.vy += fy;
                }
            }
            
            // Apply attractive forces for connected nodes
            connections.forEach(({ from, to }) => {
                const node1 = this.nodes.find(n => n.label === from);
                const node2 = this.nodes.find(n => n.label === to);
                
                if (!node1 || !node2) return;
                
                const dx = node2.x - node1.x;
                const dy = node2.y - node1.y;
                const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
                
                // Spring force
                const idealDistance = 400;
                const force = (distance - idealDistance) * attractionStrength;
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;
                
                node1.vx += fx;
                node1.vy += fy;
                node2.vx -= fx;
                node2.vy -= fy;
            });
            
            // Update positions with damping and temperature
            this.nodes.forEach(node => {
                node.vx *= damping * temperature;
                node.vy *= damping * temperature;
                
                // Limit velocity
                const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
                const maxSpeed = 50;
                if (speed > maxSpeed) {
                    node.vx = (node.vx / speed) * maxSpeed;
                    node.vy = (node.vy / speed) * maxSpeed;
                }
                
                node.x += node.vx;
                node.y += node.vy;
            });
        }
    }
    
    getLayoutConnections() {
        const connections = [];
        
        if (this.viewMode === 'relationship') {
            this.nodes.forEach(node => {
                const comp = this.allComponents.find(c => c.name === node.label);
                if (!comp) return;
                
                comp.lwcDependencies?.forEach(depName => {
                    if (this.nodes.some(n => n.label === depName)) {
                        connections.push({ from: node.label, to: depName });
                    }
                });
            });
        } else {
            this.nodes.forEach(parentNode => {
                const parentComp = this.allComponents.find(c => c.name === parentNode.label);
                if (!parentComp || !parentComp.dataFlow) return;
                
                parentComp.dataFlow.childComponents?.forEach(child => {
                    const childName = this.kebabToCamel(child.name);
                    if (this.nodes.some(n => n.label.toLowerCase() === childName.toLowerCase())) {
                        connections.push({ from: parentNode.label, to: childName });
                    }
                });
            });
        }
        
        return connections;
    }
    
    centerAndFitLayout() {
        if (!this.nodes.length) return;
        
        const bounds = this.getLayoutBounds();
        const layoutWidth = bounds.maxX - bounds.minX;
        const layoutHeight = bounds.maxY - bounds.minY;
        
        const padding = 150;
        const canvasWidth = this.els.canvas.clientWidth - padding * 2;
        const canvasHeight = this.els.canvas.clientHeight - padding * 2;
        
        // Calculate scale to fit
        const scaleX = canvasWidth / layoutWidth;
        const scaleY = canvasHeight / layoutHeight;
        this.scale = Math.min(scaleX, scaleY, 1);
        
        // Center the layout
        const centerX = bounds.minX + layoutWidth / 2;
        const centerY = bounds.minY + layoutHeight / 2;
        
        this.offsetX = this.els.canvas.clientWidth / 2 - centerX * this.scale;
        this.offsetY = this.els.canvas.clientHeight / 2 - centerY * this.scale;
        
        this.updateCanvasTransform();
    }
    
    getLayoutBounds() {
        const xs = this.nodes.map(n => n.x);
        const ys = this.nodes.map(n => n.y);
        
        return {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys)
        };
    }
    
    // ========================================================================
    // CANVAS TRANSFORM & ZOOM
    // ========================================================================
    
    updateCanvasTransform() {
        this.els.canvasWorld.style.transform = 
            `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
        this.els.zoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
    }
    
    zoom(delta) {
        const prevScale = this.scale;
        this.scale = Math.max(0.3, Math.min(2, this.scale + delta));
        
        if (prevScale !== this.scale) {
            // Zoom towards center
            const centerX = this.els.canvas.clientWidth / 2;
            const centerY = this.els.canvas.clientHeight / 2;
            
            this.offsetX = centerX - (centerX - this.offsetX) * (this.scale / prevScale);
            this.offsetY = centerY - (centerY - this.offsetY) * (this.scale / prevScale);
            
            this.updateCanvasTransform();
            this.renderConnections();
        }
    }
    
    resetZoom() {
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.updateCanvasTransform();
        this.renderConnections();
    }
    
    // ========================================================================
    // WORKSPACE MANAGEMENT
    // ========================================================================
    
    loadWorkspaces() {
        const stored = localStorage.getItem('lwc_schema_workspaces');
        this.workspaces = stored ? JSON.parse(stored) : [];
        
        if (this.workspaces.length) {
            this.loadWorkspace(this.workspaces[0]);
        }
    }
    
    createWorkspace() {
        const name = this.els.newWorkspaceName.value.trim();
        if (!name) return;
        
        const ws = {
            id: Date.now().toString(),
            name,
            nodes: [],
            viewMode: 'relationship',
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            created: new Date().toISOString()
        };
        
        this.workspaces.push(ws);
        this.saveWorkspacesToStorage();
        this.loadWorkspace(ws);
        this.closeModal('workspace');
        this.els.newWorkspaceName.value = '';
    }
    
    loadWorkspace(ws) {
        this.currentWorkspace = ws;
        this.nodes = ws.nodes || [];
        this.scale = ws.scale || 1;
        this.offsetX = ws.offsetX || 0;
        this.offsetY = ws.offsetY || 0;
        
        if (ws.viewMode && ws.viewMode !== this.viewMode) {
            this.switchViewMode(ws.viewMode);
        }
        
        this.updateCanvasTransform();
        this.renderNodes();
        this.renderConnections();
        this.renderComponentList();
        this.updateUI();
    }
    
    saveWorkspace() {
        if (!this.currentWorkspace) return;
        
        this.currentWorkspace.nodes = this.nodes;
        this.currentWorkspace.viewMode = this.viewMode;
        this.currentWorkspace.scale = this.scale;
        this.currentWorkspace.offsetX = this.offsetX;
        this.currentWorkspace.offsetY = this.offsetY;
        this.currentWorkspace.updated = new Date().toISOString();
        this.saveWorkspacesToStorage();
        
        // Show success feedback
        const btn = this.els.saveBtn;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.854 3.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L6.5 10.293l6.646-6.647a.5.5 0 01.708 0z"/></svg><span>Saved!</span>';
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    }
    
    saveWorkspacesToStorage() {
        localStorage.setItem('lwc_schema_workspaces', JSON.stringify(this.workspaces));
    }
    
    scheduleAutoSave() {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            if (this.currentWorkspace) {
                this.currentWorkspace.nodes = this.nodes;
                this.currentWorkspace.viewMode = this.viewMode;
                this.currentWorkspace.scale = this.scale;
                this.currentWorkspace.offsetX = this.offsetX;
                this.currentWorkspace.offsetY = this.offsetY;
                this.saveWorkspacesToStorage();
                console.log('💾 Auto-saved workspace');
            }
        }, 2000);
    }
    
    // ========================================================================
    // EXPORT/IMPORT
    // ========================================================================
    
    handleExport() {
        if (this.els.exportJson.checked) this.exportJSON();
        if (this.els.exportImage.checked) this.exportSVG();
        this.closeModal('export');
    }
    
    exportJSON() {
        const data = {
            workspace: this.currentWorkspace?.name || 'Schema',
            nodes: this.nodes,
            viewMode: this.viewMode,
            scale: this.scale,
            offsetX: this.offsetX,
            offsetY: this.offsetY,
            exported: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.workspace.replace(/\s+/g, '_')}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    exportSVG() {
        const bounds = this.getLayoutBounds();
        const padding = 100;
        const nodeWidth = 280;
        const nodeHeight = 120;
        
        const width = bounds.maxX - bounds.minX + nodeWidth + padding * 2;
        const height = bounds.maxY - bounds.minY + nodeHeight + padding * 2;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        
        // Add white background
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('width', '100%');
        bg.setAttribute('height', '100%');
        bg.setAttribute('fill', '#ffffff');
        svg.appendChild(bg);
        
        // Add defs for markers
        const defs = this.els.svg.querySelector('defs').cloneNode(true);
        svg.appendChild(defs);
        
        // Add connections
        const connections = this.els.svg.querySelectorAll('path');
        connections.forEach(path => {
            const newPath = path.cloneNode(true);
            const d = path.getAttribute('d');
            
            // Adjust coordinates
            const adjustedD = d.replace(/M (\S+) (\S+) C (\S+) (\S+), (\S+) (\S+), (\S+) (\S+)/g, 
                (match, x1, y1, cx1, cy1, cx2, cy2, x2, y2) => {
                    return `M ${parseFloat(x1) - bounds.minX + padding} ${parseFloat(y1) - bounds.minY + padding} ` +
                           `C ${parseFloat(cx1) - bounds.minX + padding} ${parseFloat(cy1) - bounds.minY + padding}, ` +
                           `${parseFloat(cx2) - bounds.minX + padding} ${parseFloat(cy2) - bounds.minY + padding}, ` +
                           `${parseFloat(x2) - bounds.minX + padding} ${parseFloat(y2) - bounds.minY + padding}`;
                });
            
            newPath.setAttribute('d', adjustedD);
            svg.appendChild(newPath);
        });
        
        // Add nodes (simplified for SVG export)
        this.nodes.forEach(node => {
            const x = node.x - bounds.minX + padding;
            const y = node.y - bounds.minY + padding;
            
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            
            // Node background
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', nodeWidth);
            rect.setAttribute('height', nodeHeight);
            rect.setAttribute('rx', '12');
            rect.setAttribute('fill', '#ffffff');
            rect.setAttribute('stroke', '#e5e7eb');
            rect.setAttribute('stroke-width', '2');
            rect.setAttribute('filter', 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))');
            
            // Node title
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x + 20);
            text.setAttribute('y', y + 35);
            text.setAttribute('font-family', 'Inter, system-ui, sans-serif');
            text.setAttribute('font-size', '16');
            text.setAttribute('font-weight', '600');
            text.setAttribute('fill', '#111827');
            text.textContent = node.label;
            
            // Node type
            const typeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            typeText.setAttribute('x', x + 20);
            typeText.setAttribute('y', y + 55);
            typeText.setAttribute('font-family', 'Inter, system-ui, sans-serif');
            typeText.setAttribute('font-size', '12');
            typeText.setAttribute('fill', '#6b7280');
            typeText.textContent = 'Lightning Web Component';
            
            g.appendChild(rect);
            g.appendChild(text);
            g.appendChild(typeText);
            svg.appendChild(g);
        });
        
        // Add title
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('x', padding);
        title.setAttribute('y', 40);
        title.setAttribute('font-family', 'Inter, system-ui, sans-serif');
        title.setAttribute('font-size', '24');
        title.setAttribute('font-weight', '700');
        title.setAttribute('fill', '#111827');
        title.textContent = this.currentWorkspace?.name || 'LWC Schema';
        svg.insertBefore(title, svg.firstChild.nextSibling);
        
        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(svg);
        const blob = new Blob([svgStr], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(this.currentWorkspace?.name || 'schema').replace(/\s+/g, '_')}_${Date.now()}.svg`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                this.nodes = data.nodes || [];
                this.scale = data.scale || 1;
                this.offsetX = data.offsetX || 0;
                this.offsetY = data.offsetY || 0;
                
                if (data.viewMode) {
                    this.switchViewMode(data.viewMode);
                }
                
                this.updateCanvasTransform();
                this.renderNodes();
                this.renderConnections();
                this.renderComponentList();
                this.updateUI();
            } catch (err) {
                alert('Invalid file format. Please select a valid JSON export.');
                console.error('Import error:', err);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }
    
    // ========================================================================
    // BULK ACTIONS
    // ========================================================================
    
    handleBulkAction(action) {
        if (action === 'addAll') {
            this.applyAutoLayout();
        } else if (action === 'clearAll') {
            if (confirm('Clear all components from canvas? This action cannot be undone.')) {
                this.nodes = [];
                this.renderNodes();
                this.renderConnections();
                this.renderComponentList();
                this.updateUI();
                this.scheduleAutoSave();
            }
        }
    }
    
    // ========================================================================
    // MENU ACTIONS
    // ========================================================================
    
    handleMenuAction(action) {
        if (action === 'export') {
            this.openModal('export');
        } else if (action === 'import') {
            this.els.fileInput.click();
        } else if (action === 'autoLayout') {
            this.applyAutoLayout();
        }
    }
    
    // ========================================================================
    // SEARCH & FILTER
    // ========================================================================
    
    handleSearch(term) {
        this.searchTerm = term;
        this.renderComponentList();
    }
    
    // ========================================================================
    // UI HELPERS
    // ========================================================================
    
    toggleSidebar() {
        this.els.sidebar.classList.toggle('sidebar-closed');
    }
    
    toggleMoreMenu() {
        this.els.moreMenu.classList.toggle('active');
    }
    
    openModal(type) {
        if (type === 'workspace') {
            this.els.workspaceModal.classList.add('active');
            this.renderWorkspaceList();
            setTimeout(() => this.els.newWorkspaceName.focus(), 100);
        } else if (type === 'export') {
            this.els.exportModal.classList.add('active');
        }
    }
    
    closeModal(type) {
        if (type === 'workspace') {
            this.els.workspaceModal.classList.remove('active');
            this.els.newWorkspaceName.value = '';
            this.els.createWorkspaceBtn.disabled = true;
        } else if (type === 'export') {
            this.els.exportModal.classList.remove('active');
        }
    }
    
    renderWorkspaceList() {
        if (!this.els.workspaceList) return;
        
        this.els.workspaceList.innerHTML = '';
        
        if (!this.workspaces.length) {
            this.els.workspaceList.innerHTML = `
                <div class="empty-state">
                    <p>No workspaces yet. Create one to get started!</p>
                </div>
            `;
            return;
        }
        
        this.workspaces.forEach(ws => {
            const card = document.createElement('div');
            card.className = 'workspace-card';
            if (this.currentWorkspace && ws.id === this.currentWorkspace.id) {
                card.classList.add('active');
            }
            
            const date = new Date(ws.updated || ws.created);
            const dateStr = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
            
            card.innerHTML = `
                <div class="workspace-details">
                    <div class="workspace-title">${ws.name}</div>
                    <div class="workspace-meta">
                        ${ws.nodes?.length || 0} components • ${dateStr}
                    </div>
                </div>
                <div class="workspace-actions">
                    <button class="btn-primary btn-sm" data-id="${ws.id}">Open</button>
                    <button class="btn-icon btn-delete" data-id="${ws.id}" title="Delete workspace">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </button>
                </div>
            `;
            
            card.querySelector('.btn-primary').addEventListener('click', () => {
                this.loadWorkspace(ws);
                this.closeModal('workspace');
            });
            
            card.querySelector('.btn-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete workspace "${ws.name}"? This action cannot be undone.`)) {
                    this.workspaces = this.workspaces.filter(w => w.id !== ws.id);
                    this.saveWorkspacesToStorage();
                    
                    if (this.currentWorkspace && this.currentWorkspace.id === ws.id) {
                        this.currentWorkspace = this.workspaces[0] || null;
                        if (this.currentWorkspace) {
                            this.loadWorkspace(this.currentWorkspace);
                        } else {
                            this.nodes = [];
                            this.renderNodes();
                            this.renderConnections();
                            this.updateUI();
                        }
                    }
                    
                    this.renderWorkspaceList();
                }
            });
            
            this.els.workspaceList.appendChild(card);
        });
    }
    
    updateUI() {
        if (this.currentWorkspace) {
            this.els.workspaceName.textContent = `${this.nodes.length} Components • ${this.currentWorkspace.name}`;
        } else {
            this.els.workspaceName.textContent = '0 Components • No Workspace';
        }
        
        this.els.saveBtn.disabled = !this.currentWorkspace;
        this.els.emptyState.style.display = this.nodes.length ? 'none' : 'flex';
    }
    
    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================
    
    kebabToCamel(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }
}

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.lwcSchemaBuilder = new LWCSchemaBuilder();
    });
} else {
    window.lwcSchemaBuilder = new LWCSchemaBuilder();
}

console.log("✅ Professional LWC Schema Builder loaded");a