# LWC Schema Builder - Functional Specification

## 1. Executive Summary
The LWC Schema Builder is a developer tool Chrome Extension designed to visualize the architecture, dependencies, and data flow of Salesforce Lightning Web Components (LWC) within an active org. It allows users to see both static relationships (imports) and dynamic data interactions (events, @api properties).

## 2. System Capabilities (Backend Logic)
These are the technical capabilities implemented in the extensions core logic (`background.js` and `app.js`).

### 2.1. Metadata Extraction
-   **Component Discovery**: Can query the Salesforce Tooling API to fetch all `LightningComponentBundle` and `ApexClass` items in the org.
-   **Dependency Analysis**:
    -   Identifies **Static Dependencies**: Which LWCs import other LWCs or Apex classes.
    -   Identifies **Message Channels**: Detects usage of `LightningMessageChannel`.

### 2.2. Source Code Analysis (Data Flow)
The system parses the `.js` and `.html` source files of components to extract deep insights:
-   **@api Properties**: Identifies public properties exposed by components.
-   **Wire Adapters**: Detects `@wire` usage to map data dependencies.
-   **Event Dispatching**: Scans for `dispatchEvent(new CustomEvent('...'))` to find outgoing communication.
-   **Event Listeners**: Scans HTML templates for `on[eventname]` handlers to map incoming communication.
-   **LMS Logic**: Parses `publish()` and `subscribe()` calls to map Message Channel usage.
-   **Query Selectors**: Detects `this.template.querySelector('c-child').method()` calls to certain child component methods.

### 2.3. Workspace Persistence
-   **Local Storage**: Saves the current layout (node positions) and user preferences to the browser's local storage.
-   **Serialization**: Converts the complex graph object into a JSON format for export/import.

---

## 3. User Capabilities (Front-End Features)
These are the features directly available to the **End User** through the extension's interface.

### 3.1. Visualization Modes
The user can toggle between two distinct views:
1.  **Relationship Mode (Static View)**:
    -   Shows high-level dependencies.
    -   **Blue Arrows**: LWC Parent imports Child.
    -   **Orange Dashed Arrows**: LWC imports Apex Class.
2.  **Data Flow Mode (Dynamic View)**:
    -   Shows how data moves at runtime.
    -   **Green Arrows**: Parent calls Child `@api` method or passes data to `@api` property.
    -   **Pink Dashed Arrows**: Child emits `CustomEvent` caught by Parent.
    -   **Purple Dashed Arrows**: Component publishes/subscribes to a Message Channel.

### 3.2. Canvas Interaction
-   **Navigation**:
    -   **Pan**: Click and drag empty space to move the view.
    -   **Zoom**: Mouse wheel to zoom in/out (focused on cursor).
    -   **Reset**: "Reset Zoom" button to return to 100%.
-   **Organization**:
    -   **Drag Nodes**: Move components to customize the layout.
    -   **Auto-Layout**: "Auto Layout" button (Force-Directed) to automatically arrange nodes to minimize overlap.

### 3.3. Workspace Management
-   **Create Workspace**: Start a fresh blank canvas.
-   **Save Workspace**: Save current node positions.
-   **Load Workspace**: Switch between saved diagrams.
-   **Import/Export**:
    -   **Export**: Download current schema as a `.json` file (logic) or `.svg` (image).
    -   **Import**: Upload a previously exported `.json` file to restore a diagram.

### 3.4. Component Sidebar
-   **Search**: Filter the list of all available components in the org.
-   **Add/Remove**:
    -   Drag and drop components from the sidebar to the canvas.
    -   "Add All" / "Clear All" bulk actions.
    -   Click "X" on a node card to remove it from the canvas.

### 3.5. Node Inspection
-   **Details**: Each node card shows:
    -   Component Name & Type.
    -   List of used Apex classes.
    -   (In Data Flow mode) List of API properties and Events.
-   **Validation**: Indicators (badges) showing if a component uses LMS, Apex, or API features.
