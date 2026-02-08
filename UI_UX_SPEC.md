# LWC Schema Builder - UI/UX Enhancement Specifications

## 1. Project Overview
The goal is to transform the existing **LWC Schema Builder** into a **premium, industry-leading visualization tool** for Salesforce architects. The new UI/UX must feel "alive," professional, and fluid, moving beyond static diagrams to an interactive workspace that "wows" the user immediately.

## 2. Design Philosophy
-   **Aesthetic**: "Futuristic Professional". Clean lines, glassmorphism, subtle gradients, and high contrast for readability.
-   **Motion**: Everything should transition. No abrupt jumps. Nodes should float into place, connections should draw themselves, panels should slide with inertia.
-   **Depth**: Use shadows, blurring (backdrop-filter), and layering to create a sense of hierarchy and 3D space on the 2D canvas.

## 3. Core Component Requirements

### 3.1. The Canvas (Infinite Workspace)
-   **Background**: Dynamic grid that adapts to zoom level.
    -   *Current*: Static dots/lines.
    -   *Required*: Subtle glowing dots that fade in/out based on zoom. A "breathing" background gradient that shifts very slowly to make the app feel alive.
-   **Interactions**:
    -   **Pan/Zoom**: Inertial panning (smooth glide after release). Zoom should focus on the mouse cursor.
    -   **Minimap**: A small, semi-transparent map in the corner showing the viewport location relative to the entire graph.

### 3.2. Nodes (The Components)
-   **Visuals**:
    -   Glassmorphism effect: `backdrop-filter: blur(12px); background: rgba(255, 255, 255, 0.7);` (Adaptive for Dark Mode).
    -   Borders: Thin, gradient borders that glow on hover.
    -   Shadows: Soft, colored shadows that reflect the component type (Blue for LWC, Orange for Apex, Purple for Message Channels).
-   **Content**:
    -   **Compact vs. Expanded Mode**: Nodes should auto-collapse to a summary view when zoomed out and expand details (properties, methods) when zoomed in or hovered.
    -   **Method/Property List**: Scrollable area within the node should have custom, thin scrollbars that hide when not in use.
-   **Ports**:
    -   Connection points (ports) should pulse gently when a connection is being dragged.

### 3.3. Connections (The "Flow")
-   **Rendering**:
    -   Bezier curves must be perfectly smooth (`stroke-linecap: round`).
    -   **Animated Data Flow**: In "Data Flow" mode, small particles (dots or arrows) should animate *along* the path of the connection to visualize the direction of data.
        -   *Speed*: Faster animation for high-frequency events, slower for state updates.
-   **Interactivity**:
    -   Hovering a connection should dim all other nodes/connections to highlight the specific path (Focus Mode).
    -   Right-click connection to delete or inspect details.

### 3.4. Sidebar & Floating Panels
-   **Sidebar**:
    -   Slide-over animation with a "spring" physics effect.
    -   Search bar should have a "glow" when active.
    -   Component list items should have a staggered entry animation (cascade fade-in) when the sidebar opens.
-   **Toolbar / Header**:
    -   Floating "Island" design (like macOS dock or Dynamic Island) rather than a full-width bar. It should float 20px from the top/bottom.
    -   Tools (Zoom, Layout) should be iconic and reveal labels on hover.

## 4. Theming & Personalization
-   **Dark Mode**: First-class citizen.
    -   Deep charcoal/navy backgrounds (not pure black).
    -   Neon accents for connections.
    -   Text should be off-white with high legibility.
-   **Transition**: Toggle between Light/Dark mode must be a smooth circle-reveal animation, not an instant switch.

## 5. Micro-Interactions & Feedback
-   **Drag & Drop**:
    -   When dragging a component from the sidebar, it should slightly scale up and become translucent.
    -   Drop zones on the canvas should highlight.
-   **Selection**:
    -   Selecting multiple nodes (Shift+Drag) should draw a semi-transparent selection rectangle with a border that matches the theme accent color.
-   **Loading States**:
    -   Instead of a spinner, use a skeleton loader for the sidebar and a "scanning" effect on the canvas.

## 6. Accessibility (A11y)
-   **Keyboard Navigation**: immense focus on navigating the graph with arrow keys.
-   **Screen Reader**: Nodes must announce their connections ("Component A, connected to Component B via Property X").
-   **Contrast**: ensure WCAG AA compliance even with glassmorphism effects.

## 7. Implementation Tech Stack Guidelines
-   **CSS**: Modern CSS Variables, `backdrop-filter`, `transition`, `transform`.
    -   *Avoid*: Heavy frameworks that override custom aesthetics.
-   **Animation**: Native CSS Transitions for UI, `requestAnimationFrame` for Canvas/SVG particles.
-   **SVG**: Use hardware-accelerated SVG properties for the graph lines.

---

**Summary for AI/Designer**:
"Create a UI that looks like a futuristic dashboard for a spaceship, but functions as a serious architecture tool. Prioritize depth, motion, and clarity. The user should feel joy just moving nodes around."
