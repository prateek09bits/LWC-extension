// =================================================================
// 🔥 SALESFORCE LWC SCHEMA BUILDER - COMPLETE PRODUCTION APP
// =================================================================

console.log("📦 LWC Schema Builder v1.0 Loaded");

class LWCSchemaBuilder {
    constructor() {
        this.nodes = [];
        this.connections = [];
        this.workspaces = [];
        this.currentWorkspace = null;
        this.viewMode = 'relationship';
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isPanning = false;
        this.isDragging = false;
        this.draggedNode = null;
        this.dragOffset = { x: 0, y: 0 };
        this.availableComponents = [];
        this.allComponents = [];
        this.searchTerm = '';
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadWorkspaces();
        this.updateUI();
        console.log("✅ Initialized");
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
        this.els.closeBtn?.addEventListener('click', () => window.close());
        this.els.sidebarToggle?.addEventListener('click', () => this.toggleSidebar());
        this.els.relationshipBtn?.addEventListener('click', () => this.switchViewMode('relationship'));
        this.els.dataflowBtn?.addEventListener('click', () => this.switchViewMode('dataflow'));
        this.els.newWorkspaceBtn?.addEventListener('click', () => this.openModal('workspace'));
        this.els.saveBtn?.addEventListener('click', () => this.saveWorkspace());
        this.els.moreMenuBtn?.addEventListener('click', () => this.toggleMoreMenu());
        this.els.closeSidebar?.addEventListener('click', () => this.toggleSidebar());
        this.els.searchInput?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.els.canvas?.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', () => this.handleMouseUp());
        this.els.canvas?.addEventListener('dragover', (e) => e.preventDefault());
        this.els.canvas?.addEventListener('drop', (e) => this.handleDrop(e));
        this.els.zoomIn?.addEventListener('click', () => this.zoom(0.1));
        this.els.zoomOut?.addEventListener('click', () => this.zoom(-0.1));
        this.els.closeWorkspaceModal?.addEventListener('click', () => this.closeModal('workspace'));
        this.els.newWorkspaceName?.addEventListener('input', (e) => {
            this.els.createWorkspaceBtn.disabled = !e.target.value.trim();
        });
        this.els.createWorkspaceBtn?.addEventListener('click', () => this.createWorkspace());
        this.els.closeExportModal?.addEventListener('click', () => this.closeModal('export'));
        this.els.cancelExport?.addEventListener('click', () => this.closeModal('export'));
        this.els.downloadExport?.addEventListener('click', () => this.handleExport());
        this.els.fileInput?.addEventListener('change', (e) => this.handleImport(e));
        
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleMenuAction(action);
                this.toggleMoreMenu();
            });
        });
        
        document.querySelectorAll('.action-link').forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleBulkAction(e.currentTarget.dataset.action);
            });
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                this.els.moreMenu?.classList.remove('active');
            }
        });
        
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.onMessage.addListener((msg) => {
                if (msg.type === "LWC_DEPENDENCY_DATA") {
                    console.log("✅ Received:", msg.payload);
                    this.processSalesforceMetadata(msg.payload);
                }
            });
            
            chrome.runtime.sendMessage({ 
                type: "FETCH_LWC_DEPENDENCY", 
                url: window.location.href 
            });
        }
    }
    
    switchViewMode(mode) {
        if (this.viewMode === mode) return;
        this.viewMode = mode;
        this.els.relationshipBtn?.classList.toggle('active', mode === 'relationship');
        this.els.dataflowBtn?.classList.toggle('active', mode === 'dataflow');
        document.querySelectorAll('.legend-section').forEach(s => {
            s.classList.toggle('hidden', s.dataset.mode !== mode);
        });
        this.renderConnections();
    }
    
    processSalesforceMetadata(deps) {
        const map = new Map();
        deps.forEach(d => {
            if (!map.has(d.MetadataComponentName)) {
                map.set(d.MetadataComponentName, {
                    name: d.MetadataComponentName,
                    id: d.MetadataComponentId,
                    apexClasses: [],
                    lwcDependencies: [],
                    messageChannels: []
                });
            }
            const comp = map.get(d.MetadataComponentName);
            const refType = d.RefMetadataComponentType;
            const refName = d.RefMetadataComponentName;
            
            if (refType === 'ApexClass') comp.apexClasses.push(refName);
            else if (refType === 'LightningComponentBundle') comp.lwcDependencies.push(refName);
            else if (refType === 'LightningMessageChannel') comp.messageChannels.push(refName);
        });
        
        this.allComponents = Array.from(map.values()).map(c => ({
            ...c,
            hasApexClasses: c.apexClasses.length > 0
        }));
        this.availableComponents = [...this.allComponents];
        this.renderComponentList();
        this.updateUI();
    }
    
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
            this.els.componentList.innerHTML = `<div class="empty-state"><p>${filtered.length ? 'All on canvas' : 'No matches'}</p></div>`;
            return;
        }
        
        available.forEach(comp => {
            const item = document.createElement('div');
            item.className = 'component-item';
            item.draggable = true;
            item.dataset.name = comp.name;
            item.innerHTML = `
                <div class="component-icon"></div>
                <div class="component-info">
                    <div class="component-name">${comp.name}</div>
                    ${comp.hasApexClasses ? `<div class="component-meta">${comp.apexClasses.length} Apex</div>` : ''}
                </div>
            `;
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'component', name: comp.name }));
            });
            this.els.componentList.appendChild(item);
        });
    }
    
    renderNodes() {
        document.querySelectorAll('.schema-node').forEach(n => n.remove());
        this.nodes.forEach(node => {
            const el = document.createElement('div');
            el.className = 'schema-node';
            el.dataset.id = node.id;
            el.dataset.label = node.label;
            el.style.left = `${node.x}px`;
            el.style.top = `${node.y}px`;
            
            const apexHtml = node.hasApexClasses ? `<div class="node-content">${node.apexClasses.map(c => 
                `<div class="apex-class-item"><div class="apex-dot"></div><span class="apex-name">${c}</span></div>`
            ).join('')}</div>` : '';
            
            el.innerHTML = `
                <div class="node-card">
                    <div class="node-header">
                        <div class="node-title-section">
                            <div class="node-title">${node.label}</div>
                            <div class="node-type">LWC Component</div>
                        </div>
                        <button class="node-close-btn">×</button>
                    </div>
                    ${apexHtml}
                </div>
                <div class="node-port"></div>
            `;
            
            el.addEventListener('mousedown', (e) => this.handleNodeMouseDown(e, el));
            el.querySelector('.node-close-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeNode(node.id);
            });
            this.els.canvasWorld.appendChild(el);
        });
    }
    
    renderConnections() {
        this.els.svg.querySelectorAll('line').forEach(l => l.remove());
        
        this.connections.forEach(conn => {
            const from = this.nodes.find(n => n.label === conn.from);
            const to = this.nodes.find(n => n.label === conn.to);
            if (!from || !to) return;
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            const fromH = from.hasApexClasses ? 60 + from.apexClasses.length * 20 : 80;
            const toH = to.hasApexClasses ? 60 + to.apexClasses.length * 20 : 80;
            
            line.setAttribute('x1', from.x + 240);
            line.setAttribute('y1', from.y + fromH / 2);
            line.setAttribute('x2', to.x);
            line.setAttribute('y2', to.y + toH / 2);
            line.setAttribute('stroke-width', '2.5');
            
            const style = this.getConnectionStyle(conn.type);
            line.setAttribute('stroke', style.color);
            line.setAttribute('stroke-dasharray', style.dash);
            line.setAttribute('marker-end', style.marker);
            
            this.els.svg.appendChild(line);
        });
    }
    
    getConnectionStyle(type) {
        const styles = {
            dependency: { color: '#0176d3', dash: '0', marker: 'url(#arrowhead-dependency)' },
            apex: { color: '#fe9339', dash: '4,2', marker: 'url(#arrowhead-apex)' },
            publish: { color: '#2e844a', dash: '0', marker: 'url(#arrowhead-publish)' },
            subscribe: { color: '#8b44ac', dash: '0', marker: 'url(#arrowhead-subscribe)' },
            dispatch: { color: '#e3165b', dash: '4,2', marker: 'url(#arrowhead-dispatch)' },
            listen: { color: '#0070d2', dash: '4,2', marker: 'url(#arrowhead-listen)' }
        };
        return styles[type] || styles.dependency;
    }
    
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
    }
    
    handleMouseMove(e) {
        if (this.isPanning) {
            this.offsetX = e.clientX - this.panStartX;
            this.offsetY = e.clientY - this.panStartY;
            this.updateCanvasTransform();
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
        }
        if (this.isDragging) {
            this.isDragging = false;
            this.draggedNode = null;
            this.scheduleAutoSave();
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
    
    addNode(name, x, y) {
        const comp = this.allComponents.find(c => c.name === name);
        if (!comp) return;
        const node = {
            id: `node-${Date.now()}`,
            label: comp.name,
            x, y,
            apexClasses: comp.apexClasses || [],
            hasApexClasses: (comp.apexClasses || []).length > 0,
            lwcDependencies: comp.lwcDependencies || []
        };
        this.nodes.push(node);
        this.createAutoConnections(node);
        this.renderNodes();
        this.renderConnections();
        this.renderComponentList();
        this.updateUI();
        this.scheduleAutoSave();
    }
    
    createAutoConnections(node) {
        node.lwcDependencies.forEach(dep => {
            const target = this.nodes.find(n => n.label === dep);
            if (target && !this.connections.some(c => c.from === node.label && c.to === dep)) {
                this.connections.push({ from: node.label, to: dep, type: 'dependency' });
            }
        });
    }
    
    removeNode(id) {
        const node = this.nodes.find(n => n.id === id);
        if (!node) return;
        this.nodes = this.nodes.filter(n => n.id !== id);
        this.connections = this.connections.filter(c => c.from !== node.label && c.to !== node.label);
        this.renderNodes();
        this.renderConnections();
        this.renderComponentList();
        this.updateUI();
        this.scheduleAutoSave();
    }
    
    handleBulkAction(action) {
        if (action === 'addAll') {
            this.availableComponents.forEach((c, i) => {
                if (!this.nodes.some(n => n.label === c.name)) {
                    this.addNode(c.name, 100 + (i % 4) * 280, 100 + Math.floor(i / 4) * 200);
                }
            });
        } else if (action === 'clearAll' && confirm('Clear all?')) {
            this.nodes = [];
            this.connections = [];
            this.renderNodes();
            this.renderConnections();
            this.renderComponentList();
            this.updateUI();
        }
    }
    
    handleMenuAction(action) {
        if (action === 'export') this.openModal('export');
        else if (action === 'import') this.els.fileInput.click();
        else if (action === 'autoLayout') this.applyAutoLayout();
    }
    
    applyAutoLayout() {
        if (!this.nodes.length) return;
        const layout = this.calculateLayout();
        this.nodes.forEach(n => {
            if (layout[n.label]) {
                n.x = layout[n.label].x;
                n.y = layout[n.label].y;
            }
        });
        this.renderNodes();
        this.renderConnections();
    }
    
    calculateLayout() {
        const map = new Map();
        this.nodes.forEach(n => map.set(n.label, { ...n, in: 0, out: 0, level: 0 }));
        this.connections.forEach(c => {
            const f = map.get(c.from);
            const t = map.get(c.to);
            if (f && t) { f.out++; t.in++; }
        });
        const roots = Array.from(map.values()).filter(n => n.in === 0);
        if (!roots.length && map.size) {
            roots.push(Array.from(map.values()).sort((a, b) => b.out - a.out)[0]);
        }
        const levels = [];
        const visited = new Set();
        const queue = roots.map(r => ({ node: r, level: 0 }));
        while (queue.length) {
            const { node, level } = queue.shift();
            if (visited.has(node.label)) continue;
            visited.add(node.label);
            if (!levels[level]) levels[level] = [];
            levels[level].push(node);
            this.connections.filter(c => c.from === node.label).forEach(c => {
                const child = map.get(c.to);
                if (child && !visited.has(child.label)) {
                    queue.push({ node: child, level: level + 1 });
                }
            });
        }
        map.forEach(n => {
            if (!visited.has(n.label)) {
                const l = levels.length;
                if (!levels[l]) levels[l] = [];
                levels[l].push(n);
            }
        });
        const layout = {};
        levels.forEach((lvl, li) => {
            lvl.forEach((n, ni) => {
                layout[n.label] = { x: 100 + ni * 300, y: 100 + li * 200 };
            });
        });
        return layout;
    }
    
    updateCanvasTransform() {
        this.els.canvasWorld.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
        this.els.zoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
    }
    
    zoom(delta) {
        this.scale = Math.max(0.5, Math.min(2, this.scale + delta));
        this.updateCanvasTransform();
    }
    
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
            connections: [],
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
        this.connections = ws.connections || [];
        this.renderNodes();
        this.renderConnections();
        this.renderComponentList();
        this.updateUI();
    }
    
    saveWorkspace() {
        if (!this.currentWorkspace) return;
        this.currentWorkspace.nodes = this.nodes;
        this.currentWorkspace.connections = this.connections;
        this.currentWorkspace.updated = new Date().toISOString();
        this.saveWorkspacesToStorage();
        alert('Saved!');
    }
    
    saveWorkspacesToStorage() {
        localStorage.setItem('lwc_schema_workspaces', JSON.stringify(this.workspaces));
    }
    
    scheduleAutoSave() {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            if (this.currentWorkspace) {
                this.currentWorkspace.nodes = this.nodes;
                this.currentWorkspace.connections = this.connections;
                this.saveWorkspacesToStorage();
            }
        }, 2000);
    }
    
    handleExport() {
        if (this.els.exportJson.checked) this.exportJSON();
        if (this.els.exportImage.checked) this.exportSVG();
        this.closeModal('export');
    }
    
    exportJSON() {
        const data = {
            workspace: this.currentWorkspace?.name || 'Schema',
            nodes: this.nodes,
            connections: this.connections,
            exported: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.workspace}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    exportSVG() {
        const svg = this.els.svg.cloneNode(true);
        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(svg);
        const blob = new Blob([svgStr], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentWorkspace?.name || 'schema'}.svg`;
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
                this.connections = data.connections || [];
                this.renderNodes();
                this.renderConnections();
                this.updateUI();
            } catch (err) {
                alert('Invalid file');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }
    
    handleSearch(term) {
        this.searchTerm = term;
        this.renderComponentList();
    }
    
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
        } else if (type === 'export') {
            this.els.exportModal.classList.add('active');
        }
    }
    
    closeModal(type) {
        if (type === 'workspace') this.els.workspaceModal.classList.remove('active');
        else if (type === 'export') this.els.exportModal.classList.remove('active');
    }
    
    renderWorkspaceList() {
        if (!this.els.workspaceList) return;
        this.els.workspaceList.innerHTML = '';
        if (!this.workspaces.length) {
            this.els.workspaceList.innerHTML = '<div class="empty-state"><p>No workspaces</p></div>';
            return;
        }
        this.workspaces.forEach(ws => {
            const card = document.createElement('div');
            card.className = 'workspace-card';
            card.innerHTML = `
                <div class="workspace-details">
                    <div class="workspace-title">${ws.name}</div>
                    <div class="workspace-meta">${ws.nodes?.length || 0} components</div>
                </div>
                <div class="workspace-actions">
                    <button class="btn-primary" data-id="${ws.id}">Open</button>
                    <button class="btn-icon" data-id="${ws.id}">×</button>
                </div>
            `;
            card.querySelector('.btn-primary').addEventListener('click', () => {
                this.loadWorkspace(ws);
                this.closeModal('workspace');
            });
            card.querySelector('.btn-icon').addEventListener('click', () => {
                if (confirm('Delete?')) {
                    this.workspaces = this.workspaces.filter(w => w.id !== ws.id);
                    this.saveWorkspacesToStorage();
                    this.renderWorkspaceList();
                }
            });
            this.els.workspaceList.appendChild(card);
        });
    }
    
    updateUI() {
        this.els.workspaceName.textContent = this.currentWorkspace ? 
            `${this.nodes.length} Components • ${this.currentWorkspace.name}` : 
            '0 Components • No Workspace';
        this.els.saveBtn.disabled = !this.currentWorkspace;
        this.els.emptyState.style.display = this.nodes.length ? 'none' : 'flex';
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new LWCSchemaBuilder());
} else {
    new LWCSchemaBuilder();
}