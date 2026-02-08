// ============================================================================
// LWC SCHEMA BUILDER - ENTERPRISE ARCHITECTURE VISUALIZATION
// Factory Pattern Implementation with Separation of Concerns
// v5.1 - REFRESH FIX EDITION
// ============================================================================

console.log("🚀 Initializing Professional LWC Schema Builder (Refresh Fix)...");

// ============================================================================
// FACTORY PATTERN: CONNECTION RENDERER FACTORY
// ============================================================================

class ConnectionRendererFactory {
    static createRenderer(viewMode) {
        switch (viewMode) {
            case 'relationship':
                return new RelationshipConnectionRenderer();
            case 'dataflow':
                return new DataFlowConnectionRenderer();
            default:
                return new RelationshipConnectionRenderer();
        }
    }
}

// ============================================================================
// RELATIONSHIP MODE RENDERER
// Uses MetadataComponentDependency data (no source parsing)
// ============================================================================

class RelationshipConnectionRenderer {
    render(nodes, allComponents, svgElement) {
        const connections = [];
        const drawn = new Set();

        console.log("📊 Rendering Relationship Mode connections...");

        nodes.forEach(node => {
            const comp = allComponents.find(c => c.name === node.label);
            if (!comp) return;

            // Draw LWC-to-LWC dependencies
            comp.lwcDependencies?.forEach(depName => {
                const targetNode = nodes.find(n => n.label === depName);
                if (targetNode) {
                    const key = `${node.label}-${depName}`;
                    if (!drawn.has(key)) {
                        drawn.add(key);
                        connections.push({
                            from: node,
                            to: targetNode,
                            type: 'dependency',
                            label: ''
                        });
                    }
                }
            });

            // Draw LWC-to-MessageChannel dependencies
            comp.messageChannels?.forEach(channelName => {
                const targetNode = nodes.find(n => n.label === channelName);
                if (targetNode) {
                    const key = `${node.label}-${channelName}`;
                    if (!drawn.has(key)) {
                        drawn.add(key);
                        connections.push({
                            from: node,
                            to: targetNode,
                            type: 'message',
                            label: 'channels'
                        });
                    }
                }
            });
        });

        console.log(`✅ Relationship Mode: ${connections.length} connections`);
        return connections;
    }

    getLayoutConnections(nodes, allComponents) {
        const connections = [];

        nodes.forEach(node => {
            const comp = allComponents.find(c => c.name === node.label);
            if (!comp) return;

            comp.lwcDependencies?.forEach(depName => {
                if (nodes.some(n => n.label === depName)) {
                    connections.push({ from: node.label, to: depName });
                }
            });
        });

        return connections;
    }
}

// ============================================================================
// DATA FLOW MODE RENDERER
// Uses parsed source code to show actual data flow
// ============================================================================

class DataFlowConnectionRenderer {
    render(nodes, allComponents, svgElement) {
        const connections = [];
        const drawn = new Set();

        console.log("🔍 Rendering Data Flow Mode connections (Enhanced)...");

        nodes.forEach(parentNode => {
            const parentComp = allComponents.find(c => c.name === parentNode.label);
            if (!parentComp?.dataFlow) return;

            const df = parentComp.dataFlow;
            console.log(`📊 Parent: ${parentNode.label}`, df);

            // Process child components
            df.childComponents?.forEach(childUsage => {
                const childName = this.kebabToCamel(childUsage.name);
                const childNode = nodes.find(n =>
                    n.label.toLowerCase() === childName.toLowerCase()
                );

                if (!childNode) return;

                const childComp = allComponents.find(c => c.name === childNode.label);
                if (!childComp?.dataFlow) return;

                console.log(`  🔗 Child: ${childNode.label}`);
                console.log(`    Props bound:`, childUsage.props);
                console.log(`    Events:`, childUsage.events);
                console.log(`    Child @api:`, childComp.dataFlow.apiProps);
                console.log(`    Child events:`, childComp.dataFlow.events);

                // PARENT → CHILD: Property bindings via @api
                childUsage.props?.forEach(propBinding => {
                    const apiName = propBinding.api;

                    // Check if child has this @api property (optional validation)
                    const hasApi = childComp.dataFlow.apiProps?.includes(apiName);

                    const key = `p2c-${parentNode.id}-${childNode.id}-${apiName}`;
                    if (!drawn.has(key)) {
                        drawn.add(key);
                        connections.push({
                            from: parentNode,
                            to: childNode,
                            type: 'publish',
                            label: `via api (${apiName})`
                        });
                    }
                });

                // CHILD → PARENT: Event dispatching
                childUsage.events?.forEach(eventBinding => {
                    const eventName = eventBinding.event;

                    // Check if child dispatches this event
                    const hasEvent = childComp.dataFlow.events?.some(
                        e => e.name.toLowerCase() === eventName.toLowerCase()
                    );

                    const key = `c2p-${childNode.id}-${parentNode.id}-${eventName}`;
                    if (!drawn.has(key)) {
                        drawn.add(key);
                        connections.push({
                            from: childNode,
                            to: parentNode,
                            type: 'dispatch',
                            label: `custom event(${eventName})`
                        });
                    }
                });
            });

            // PARENT → CHILD: Template querySelector method calls
            df.querySelectorCalls?.forEach(qsCall => {
                const childName = qsCall.childComponent;
                const childNode = nodes.find(n =>
                    n.label.toLowerCase() === childName.toLowerCase()
                );

                if (childNode) {
                    const key = `qs-${parentNode.id}-${childNode.id}-${qsCall.method}`;
                    if (!drawn.has(key)) {
                        drawn.add(key);
                        console.log(`    ✅ PARENT→CHILD (querySelector): ${qsCall.method}()`);
                        connections.push({
                            from: parentNode,
                            to: childNode,
                            type: 'publish',
                            label: `call: ${qsCall.method}()`
                        });
                    }
                }
            });

            // LMS: Message Channel connections
            df.lmsChannels?.forEach(lms => {
                // 1. Link to actual Message Channel Node if present
                const lmsNode = nodes.find(n => n.label === lms.channel);
                if (lmsNode) {
                    const lmcComp = allComponents.find(c => c.name === lmsNode.label);
                    if (lmcComp?.type === 'lmc') {
                        const key = `lms-direct-${parentNode.id}-${lmsNode.id}`;
                        if (!drawn.has(key)) {
                            drawn.add(key);
                            const fromNode = lms.type === 'publish' ? parentNode : lmsNode;
                            const toNode = lms.type === 'publish' ? lmsNode : parentNode;

                            connections.push({
                                from: fromNode,
                                to: toNode,
                                type: 'message',
                                label: lms.type // 'publish' or 'subscribe'
                            });
                        }
                    }
                }

                // 2. Link Component-to-Component (Fallback/Implicit)
                nodes.forEach(otherNode => {
                    if (otherNode.id === parentNode.id) return;

                    const otherComp = allComponents.find(c => c.name === otherNode.label);
                    if (!otherComp?.dataFlow?.lmsChannels) return;

                    const hasMatchingChannel = otherComp.dataFlow.lmsChannels.some(
                        ch => ch.channel === lms.channel && ch.type !== lms.type
                    );

                    if (hasMatchingChannel) {
                        const key = `lms-${parentNode.id}-${otherNode.id}-${lms.channel}`;
                        if (!drawn.has(key)) {
                            drawn.add(key);
                            const fromNode = lms.type === 'publish' ? parentNode : otherNode;
                            const toNode = lms.type === 'publish' ? otherNode : parentNode;

                            connections.push({
                                from: fromNode,
                                to: toNode,
                                type: 'message',
                                label: `publish(${toNode.label})`
                            });
                        }
                    }
                });
            });
        });

        console.log(`✅ Data Flow Mode: ${connections.length} connections`);
        return connections;
    }

    getLayoutConnections(nodes, allComponents) {
        const connections = [];

        nodes.forEach(parentNode => {
            const parentComp = allComponents.find(c => c.name === parentNode.label);
            if (!parentComp?.dataFlow) return;

            parentComp.dataFlow.childComponents?.forEach(child => {
                const childName = this.kebabToCamel(child.name);
                if (nodes.some(n => n.label.toLowerCase() === childName.toLowerCase())) {
                    connections.push({ from: parentNode.label, to: childName });
                }
            });

            // Add querySelector connections for layout
            parentComp.dataFlow.querySelectorCalls?.forEach(qsCall => {
                const childName = qsCall.childComponent;
                if (nodes.some(n => n.label.toLowerCase() === childName.toLowerCase())) {
                    connections.push({ from: parentNode.label, to: childName });
                }
            });
        });

        return connections;
    }

    kebabToCamel(str) {
        return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    }
}

// ============================================================================
// CONNECTION DRAWER - HANDLES SVG RENDERING
// ============================================================================

class ConnectionDrawer {
    constructor(svgElement, canvasElement, offsetX, offsetY, scale) {
        this.svg = svgElement;
        this.canvas = canvasElement;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.scale = scale;
        this.pathCache = new Map();
    }

    updateTransform(offsetX, offsetY, scale) {
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.scale = scale;
        this.pathCache.clear();
    }

    drawConnection(from, to, type, label = '') {
        if (!from || !to) return;

        // Use coordinates from the data model for perfect synchronization
        const fromW = from.width || 300;
        const fromH = from.height || 100;
        const toW = to.width || 300;
        const toH = to.height || 100;

        // Right port of source node
        const x1 = from.x + fromW;
        const y1 = from.y + fromH / 2;

        // Left port of target node
        const x2 = to.x;
        const y2 = to.y + toH / 2;

        const style = this.getConnectionStyle(type);

        // Enhanced bezier curve with smart control points
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Adaptive control point offset
        let controlOffset = Math.min(distance * 0.4, 200);
        if (Math.abs(dx) < 50) {
            controlOffset = Math.min(Math.abs(dy) * 0.3, 100);
        }

        const cx1 = x1 + controlOffset;
        const cy1 = y1;
        const cx2 = x2 - controlOffset;
        const cy2 = y2;

        const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

        path.setAttribute('d', d);
        path.setAttribute('stroke', style.color);
        path.setAttribute('stroke-width', style.width);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-dasharray', style.dash);
        path.setAttribute('marker-end', style.marker);
        path.setAttribute('class', `connection connection-${type}`);

        // Add label with background if provided
        if (label) {
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', midX);
            text.setAttribute('y', midY - 8);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '11');
            text.setAttribute('font-family', 'Inter, system-ui, sans-serif');
            text.setAttribute('fill', style.color);
            text.setAttribute('font-weight', '600');
            text.setAttribute('class', 'connection-label');
            text.textContent = label;

            // Add background for better readability
            const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            this.svg.appendChild(text);
            const bbox = text.getBBox();
            this.svg.removeChild(text);

            bgRect.setAttribute('x', bbox.x - 4);
            bgRect.setAttribute('y', bbox.y - 2);
            bgRect.setAttribute('width', bbox.width + 8);
            bgRect.setAttribute('height', bbox.height + 4);
            bgRect.setAttribute('fill', '#ffffff');
            bgRect.setAttribute('rx', '4');
            bgRect.setAttribute('opacity', '0.95');
            bgRect.setAttribute('class', 'connection-label-bg');

            this.svg.appendChild(bgRect);
            this.svg.appendChild(text);
        }

        this.svg.appendChild(path);
    }

    getConnectionStyle(type) {
        const styles = {
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
            publish: {
                color: '#2e844a',
                width: '2.5',
                dash: '0',
                marker: 'url(#arrowhead-publish)'
            },
            dispatch: {
                color: '#e3165b',
                width: '3',
                dash: '6,4',
                marker: 'url(#arrowhead-dispatch)'
            },
            message: {
                color: '#8b44ac',
                width: '2.5',
                dash: '8,4',
                marker: 'url(#arrowhead-listen)'
            }
        };
        return styles[type] || styles.dependency;
    }

    clear() {
        this.svg.querySelectorAll('line, path, text.connection-label, rect.connection-label-bg').forEach(el => el.remove());
        this.pathCache.clear();
    }
}

// ============================================================================
// FORCE-DIRECTED LAYOUT ENGINE
// ============================================================================

class ForceDirectedLayout {
    constructor(nodes, connections) {
        this.nodes = nodes;
        this.connections = connections;
    }

    compute() {
        const iterations = 150;
        const repulsionStrength = 25000;
        const attractionStrength = 0.015;
        const damping = 0.8;

        // Initialize velocities and positions
        this.nodes.forEach((node, i) => {
            if (!node.x || !node.y) {
                const angle = (i / this.nodes.length) * 2 * Math.PI;
                const radius = 300;
                node.x = Math.cos(angle) * radius;
                node.y = Math.sin(angle) * radius;
            }
            node.vx = 0;
            node.vy = 0;
        });

        for (let iter = 0; iter < iterations; iter++) {
            const temp = 1 - (iter / iterations);

            // Repulsion between all nodes
            for (let i = 0; i < this.nodes.length; i++) {
                for (let j = i + 1; j < this.nodes.length; j++) {
                    const n1 = this.nodes[i];
                    const n2 = this.nodes[j];

                    const dx = n2.x - n1.x;
                    const dy = n2.y - n1.y;
                    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

                    const force = repulsionStrength / (dist * dist);
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;

                    n1.vx -= fx;
                    n1.vy -= fy;
                    n2.vx += fx;
                    n2.vy += fy;
                }
            }

            // Attraction for connected nodes
            this.connections.forEach(({ from, to }) => {
                const n1 = this.nodes.find(n => n.label === from);
                const n2 = this.nodes.find(n => n.label === to);

                if (!n1 || !n2) return;

                const dx = n2.x - n1.x;
                const dy = n2.y - n1.y;
                const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

                const idealDist = 400;
                const force = (dist - idealDist) * attractionStrength;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;

                n1.vx += fx;
                n1.vy += fy;
                n2.vx -= fx;
                n2.vy -= fy;
            });

            // Update positions
            this.nodes.forEach(node => {
                node.vx *= damping * temp;
                node.vy *= damping * temp;

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

        return this.nodes;
    }
}

// ============================================================================
// MAIN APPLICATION CLASS
// ============================================================================

class LWCSchemaBuilder {
    constructor() {
        // Canvas State
        this.nodes = [];
        this.allComponents = [];
        this.availableComponents = [];
        this.rawDependencies = [];

        // Workspace
        this.workspaces = [];
        this.currentWorkspace = null;

        // View State
        this.viewMode = 'relationship';
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        // Interaction
        this.isPanning = false;
        this.isDragging = false;
        this.draggedNode = null;
        this.dragOffset = { x: 0, y: 0 };
        this.searchTerm = '';
        this.lastPanTime = 0;

        // Renderers
        this.connectionRenderer = null;
        this.connectionDrawer = null;
        this.animationFrame = null;

        // REFRESH FIX: Data loading state
        this.isLoadingData = false;
        this.dataLoadAttempts = 0;
        this.maxDataLoadAttempts = 3;

        this.init();
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadWorkspaces();
        
        // REFRESH FIX: Try to load cached data first
        this.loadCachedData();
        
        // REFRESH FIX: Always request fresh data from background
        this.requestDataFromBackground();
        
        this.updateUI();
        console.log("✅ LWC Schema Builder initialized (Refresh Fix)");
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

        this.connectionDrawer = new ConnectionDrawer(
            this.els.svg,
            this.els.canvas,
            this.offsetX,
            this.offsetY,
            this.scale
        );
    }

    bindEvents() {
        // Header
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

        // Canvas
        this.els.canvas?.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        this.els.canvas?.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', () => this.handleMouseUp());
        this.els.canvas?.addEventListener('dragover', (e) => e.preventDefault());
        this.els.canvas?.addEventListener('drop', (e) => this.handleDrop(e));

        // Zoom
        this.els.zoomIn?.addEventListener('click', () => this.zoom(0.1));
        this.els.zoomOut?.addEventListener('click', () => this.zoom(-0.1));
        this.els.zoomReset?.addEventListener('click', () => this.resetZoom());

        // Modals
        this.els.closeWorkspaceModal?.addEventListener('click', () => this.closeModal('workspace'));
        this.els.newWorkspaceName?.addEventListener('input', (e) => {
            this.els.createWorkspaceBtn.disabled = !e.target.value.trim();
        });
        this.els.newWorkspaceName?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) this.createWorkspace();
        });
        this.els.createWorkspaceBtn?.addEventListener('click', () => this.createWorkspace());
        this.els.closeExportModal?.addEventListener('click', () => this.closeModal('export'));
        this.els.cancelExport?.addEventListener('click', () => this.closeModal('export'));
        this.els.downloadExport?.addEventListener('click', () => this.handleExport());
        this.els.fileInput?.addEventListener('change', (e) => this.handleImport(e));

        // Dropdown
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleMenuAction(e.currentTarget.dataset.action);
                this.toggleMoreMenu();
            });
        });

        // Bulk actions
        document.querySelectorAll('.action-link').forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleBulkAction(e.currentTarget.dataset.action);
            });
        });

        // Close dropdown
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                this.els.moreMenu?.classList.remove('active');
            }
        });

        // REFRESH FIX: Enhanced Chrome messaging with retry logic
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
                if (msg.type === "LWC_DEPENDENCY_DATA") {
                    console.log("✅ Received data from background:", msg.payload);
                    this.processSalesforceMetadata(msg.payload);
                    this.isLoadingData = false;
                    sendResponse({ received: true });
                }
                return true; // Keep channel open
            });
        }
    }

    // ========================================================================
    // REFRESH FIX: DATA LOADING & CACHING
    // ========================================================================

    loadCachedData() {
        try {
            const cached = localStorage.getItem('lwc_schema_cached_data');
            if (cached) {
                const data = JSON.parse(cached);
                const age = Date.now() - (data.timestamp || 0);
                
                // Use cached data if less than 5 minutes old
                if (age < 5 * 60 * 1000) {
                    console.log("📦 Loading cached component data...");
                    this.processSalesforceMetadata(data.payload);
                    return true;
                }
            }
        } catch (err) {
            console.warn("⚠️ Failed to load cached data:", err);
        }
        return false;
    }

    requestDataFromBackground() {
        if (this.isLoadingData) {
            console.log("⏳ Data load already in progress...");
            return;
        }

        if (this.dataLoadAttempts >= this.maxDataLoadAttempts) {
            console.error("❌ Max data load attempts reached");
            return;
        }

        if (typeof chrome === 'undefined' || !chrome.runtime) {
            console.warn("⚠️ Chrome runtime not available");
            return;
        }

        this.isLoadingData = true;
        this.dataLoadAttempts++;

        console.log(`📡 Requesting data from background (attempt ${this.dataLoadAttempts})...`);

        chrome.runtime.sendMessage({
            type: "FETCH_LWC_DEPENDENCY",
            url: window.location.href
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("❌ Message error:", chrome.runtime.lastError);
                this.isLoadingData = false;
                
                // Retry after 2 seconds
                if (this.dataLoadAttempts < this.maxDataLoadAttempts) {
                    setTimeout(() => this.requestDataFromBackground(), 2000);
                }
            } else if (response?.error) {
                console.error("❌ Background error:", response.error);
                this.isLoadingData = false;
            } else {
                console.log("✅ Data request acknowledged:", response);
            }
        });
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

        // Update renderer
        this.connectionRenderer = ConnectionRendererFactory.createRenderer(mode);

        this.renderNodes();
        this.renderConnections();
        console.log(`🔄 Switched to ${mode} mode`);
    }

    // ========================================================================
    // DATA PROCESSING
    // ========================================================================

    processSalesforceMetadata(data) {
        console.log("🔥 Processing metadata...");

        const { bundles, dependencies, messageChannels } = data;
        if (!bundles || !Array.isArray(bundles)) {
            console.error("❌ Invalid data");
            return;
        }

        // REFRESH FIX: Cache the data
        try {
            localStorage.setItem('lwc_schema_cached_data', JSON.stringify({
                payload: data,
                timestamp: Date.now()
            }));
            console.log("💾 Cached component data");
        } catch (err) {
            console.warn("⚠️ Failed to cache data:", err);
        }

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

        // Process components with BOTH modes
        const bundleComponents = bundles.map(bundle => {
            const deps = depMap.get(bundle.component || bundle.name) || {
                apexClasses: [],
                lwcDependencies: [],
                messageChannels: []
            };

            return {
                id: bundle.bundleId,
                name: bundle.component,
                namespace: bundle.namespace,
                description: bundle.description,
                type: 'lwc',
                // Relationship data
                apexClasses: deps.apexClasses,
                lwcDependencies: deps.lwcDependencies,
                messageChannels: deps.messageChannels,
                hasApexClasses: deps.apexClasses.length > 0,
                // Data flow data (from background.js parsing)
                dataFlow: {
                    apiProps: bundle.apiProps || [],
                    events: bundle.events || [],
                    childComponents: bundle.childComponents || [],
                    wires: bundle.wires || [],
                    querySelectorCalls: bundle.querySelectorCalls || [],
                    lmsChannels: bundle.lmsChannels || []
                }
            };
        });

        // Process Message Channels
        const lmcComponents = (messageChannels || []).map(mc => ({
            id: mc.Id,
            name: mc.DeveloperName,
            namespace: 'c',
            description: mc.Description,
            type: 'lmc',
            apexClasses: [],
            lwcDependencies: [],
            messageChannels: [],
            dataFlow: {}
        }));

        this.allComponents = [...bundleComponents, ...lmcComponents];
        this.availableComponents = [...this.allComponents];
        this.connectionRenderer = ConnectionRendererFactory.createRenderer(this.viewMode);
        this.renderComponentList();
        this.updateUI();

        console.log(`✅ Processed ${this.allComponents.length} components`);
        console.log("📊 Sample component:", this.allComponents[0]);
    }

    // ========================================================================
    // COMPONENT LIST
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
            const message = filtered.length > 0 ? 'All on canvas' : 'No matches';
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
            if (comp.type === 'lmc') {
                badges.push(`<span class="badge badge-lms" style="background: #8b44ac; color: white;">Message Channel</span>`);
            }
            if (comp.hasApexClasses) {
                badges.push(`<span class="badge badge-apex">${comp.apexClasses.length} Apex</span>`);
            }
            if (comp.dataFlow?.apiProps?.length > 0) {
                badges.push(`<span class="badge badge-api">${comp.dataFlow.apiProps.length} @api</span>`);
            }
            if (comp.dataFlow?.events?.length > 0) {
                badges.push(`<span class="badge badge-event">${comp.dataFlow.events.length} events</span>`);
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

            if (this.viewMode === 'relationship' && node.hasApexClasses) {
                contentHtml = `
                    <div class="node-content">
                        ${node.apexClasses.slice(0, 5).map(apex => `
                            <div class="apex-class-item">
                                <div class="apex-dot"></div>
                                <span class="apex-name">${apex}</span>
                            </div>
                        `).join('')}
                        ${node.apexClasses.length > 5 ? `<div class="apex-more">+${node.apexClasses.length - 5} more</div>` : ''}
                    </div>
                `;
            } else if (this.viewMode === 'dataflow' && comp?.dataFlow) {
                const items = [];
                if (comp.dataFlow.apiProps?.length) {
                    items.push(`
                        <div class="dataflow-item">
                            <span class="dataflow-label">@api:</span>
                            <span class="dataflow-value">${comp.dataFlow.apiProps.join(', ')}</span>
                        </div>
                    `);
                }
                if (comp.dataFlow.events?.length) {
                    items.push(`
                        <div class="dataflow-item">
                            <span class="dataflow-label">Events:</span>
                            <span class="dataflow-value">${comp.dataFlow.events.map(e => e.name).join(', ')}</span>
                        </div>
                    `);
                }
                if (comp.dataFlow.childComponents?.length) {
                    items.push(`
                        <div class="dataflow-item">
                            <span class="dataflow-label">Children:</span>
                            <span class="dataflow-value">${comp.dataFlow.childComponents.length}</span>
                        </div>
                    `);
                }
                if (items.length) {
                    contentHtml = `<div class="node-content">${items.join('')}</div>`;
                }
            }

            el.innerHTML = `
                <div class="node-card">
                    <div class="node-header">
                        <div class="node-title-section">
                            <div class="node-title">${node.label}</div>
                            <div class="node-type">LWC Component</div>
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

            // Measure and store dimensions for coordinate-based connections
            node.width = el.offsetWidth;
            node.height = el.offsetHeight;
        });
    }

    // ========================================================================
    // CONNECTION RENDERING
    // ========================================================================

    renderConnections() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        this.animationFrame = requestAnimationFrame(() => {
            this.connectionDrawer.clear();

            if (!this.connectionRenderer) {
                this.connectionRenderer = ConnectionRendererFactory.createRenderer(this.viewMode);
            }

            const connections = this.connectionRenderer.render(
                this.nodes,
                this.allComponents,
                this.els.svg
            );

            connections.forEach(conn => {
                this.connectionDrawer.drawConnection(
                    conn.from,
                    conn.to,
                    conn.type,
                    conn.label
                );
            });
        });
    }

    // ========================================================================
    // CANVAS INTERACTION
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
    // AUTO LAYOUT
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

        console.log('🎯 Applying auto layout...');

        // Get connections for layout
        const connections = this.connectionRenderer.getLayoutConnections(
            this.nodes,
            this.allComponents
        );

        // Run force-directed layout
        const layout = new ForceDirectedLayout(this.nodes, connections);
        layout.compute();

        // Center and fit
        this.centerAndFitLayout();

        this.renderNodes();
        this.renderConnections();
        this.scheduleAutoSave();
    }

    centerAndFitLayout() {
        if (!this.nodes.length) return;

        const bounds = this.getLayoutBounds();
        const layoutWidth = bounds.maxX - bounds.minX;
        const layoutHeight = bounds.maxY - bounds.minY;

        const padding = 150;
        const canvasWidth = this.els.canvas.clientWidth - padding * 2;
        const canvasHeight = this.els.canvas.clientHeight - padding * 2;

        const scaleX = canvasWidth / layoutWidth;
        const scaleY = canvasHeight / layoutHeight;
        this.scale = Math.min(scaleX, scaleY, 1);

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
    // CANVAS TRANSFORM
    // ========================================================================

    updateCanvasTransform() {
        this.els.canvasWorld.style.transform =
            `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
        this.els.zoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
        this.connectionDrawer.updateTransform(this.offsetX, this.offsetY, this.scale);
    }

    zoom(delta) {
        const prevScale = this.scale;
        this.scale = Math.max(0.3, Math.min(2, this.scale + delta));

        if (prevScale !== this.scale) {
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
                console.log('💾 Auto-saved');
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

        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('width', '100%');
        bg.setAttribute('height', '100%');
        bg.setAttribute('fill', '#ffffff');
        svg.appendChild(bg);

        const defs = this.els.svg.querySelector('defs').cloneNode(true);
        svg.appendChild(defs);

        // Add connections
        const connections = this.els.svg.querySelectorAll('path');
        connections.forEach(path => {
            const newPath = path.cloneNode(true);
            const d = path.getAttribute('d');

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

        // Add nodes
        this.nodes.forEach(node => {
            const x = node.x - bounds.minX + padding;
            const y = node.y - bounds.minY + padding;

            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', nodeWidth);
            rect.setAttribute('height', nodeHeight);
            rect.setAttribute('rx', '12');
            rect.setAttribute('fill', '#ffffff');
            rect.setAttribute('stroke', '#e5e7eb');
            rect.setAttribute('stroke-width', '2');

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x + 20);
            text.setAttribute('y', y + 35);
            text.setAttribute('font-family', 'Inter, system-ui, sans-serif');
            text.setAttribute('font-size', '16');
            text.setAttribute('font-weight', '600');
            text.setAttribute('fill', '#111827');
            text.textContent = node.label;

            const typeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            typeText.setAttribute('x', x + 20);
            typeText.setAttribute('y', y + 55);
            typeText.setAttribute('font-family', 'Inter, system-ui, sans-serif');
            typeText.setAttribute('font-size', '12');
            typeText.setAttribute('fill', '#6b7280');
            typeText.textContent = 'LWC Component';

            g.appendChild(rect);
            g.appendChild(text);
            g.appendChild(typeText);
            svg.appendChild(g);
        });

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
                alert('Invalid file format');
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
            if (confirm('Clear all components? This cannot be undone.')) {
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
    // SEARCH
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
                    <p>No workspaces yet. Create one!</p>
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
                    <button class="btn-icon btn-delete" data-id="${ws.id}" title="Delete">
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
                if (confirm(`Delete "${ws.name}"?`)) {
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

console.log("✅ Professional LWC Schema Builder loaded (Refresh Fix Edition)");