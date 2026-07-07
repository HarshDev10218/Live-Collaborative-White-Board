# Real-Time Collaborative Whiteboard

A highly responsive, production-ready full-stack web application that enables multiple users to join separate rooms and draw collaboratively on a shared canvas simultaneously with ultra-low latency[cite: 1, 4, 5, 6]. 

---

## Core Features

*   **Proportional Synchronization:** Translates cursor coordinates into proportional screen percentages, ensuring drawing parity across desktop monitors and mobile screens alike[cite: 4].
*   **Multi-Room Partitioning:** Isolates individual teams or groups into separate custom whiteboards using basic URL queries.
*   **Collaborative Undo Engine:** Tracks input brush stroke boundaries locally to support rolling back state history updates cleanly across all active peer canvases simultaneously[cite: 4, 5].
*   **Mobile-Ready Interactivity:** Maps touch-responsive movement layers to work seamlessly on smartphones and tablets[cite: 4].
*   **Gesture Lockdowns:** Suppresses native device page-scrolling or pull-to-refresh gestures while drawing directly on the canvas surface[cite: 6].
*   **Live Metrics:** Displays continuous status badge notifications alongside real-time counts of online room occupants[cite: 1, 5].
*   **Asset Exporting:** Allows downloading the current canvas layout directly to your device as a clear PNG file image[cite: 1, 4].

---

## Project Architecture and Files

The application is structured into modular components to cleanly segregate interface logic, layout design, and socket event orchestration:

*   **`index.html`**: Establishes the tool-switch headers, layout controls, canvas drawing environment, and pulls the production Socket.IO framework library via an absolute CDN address[cite: 1].
*   **`style.css`**: Manages the interface styling variables, controls structural layout distributions using flexbox alignment wrappers, adds mobile breakpoint adjustments, and configures touch interaction overrides[cite: 6].
*   **`script.js`**: Drives client-side input recording listeners across mouse or touch profiles, handles window resizing without dropping active artwork, calculates percentage-scaled drawing tracks, and controls the historical memory snapshot arrays[cite: 4].
*   **`server.js`**: Orchestrates the Node.js Express architecture, dynamically groups sockets into individual target namespaces, relays vector streams to workspace peers, and manages room disconnect states.
*   **`package.json`**: Tracks external node module manifests, structures structural semantic project versions, and configures build execution commands.
*   **`package-lock.json`**: Safely locks the internal reliance parameters of downloaded module trees to maintain consistent environmental environments[cite: 3].
*   **`.gitignore`**: Instructs Git tracking services to omit massive third-party package directories, personal secret parameters, or system-generated performance log records[cite: 7].

---

## Technical Stack

| Component | Technology | Primary Role |
| :--- | :--- | :--- |
| **Frontend Renderer** | HTML5 Canvas API | Delivers performant vector line rendering and raster export functions[cite: 1, 4]. |
| **Interface Layout** | CSS3 Grid & Flexbox | Aligns structural toolbar options and dynamically resizes drawing fields[cite: 6]. |
| **Application Logic** | JavaScript (ES6+) | Captures pointer coordinates, hooks page events, and executes historical snapshots[cite: 4]. |
| **Backend Environment** | Node.js | Serves as the lightweight, asynchronous runtime engine powering the app[cite: 5]. |
| **Web Server Layer** | Express | Hosts public static front-end assets and handles routing pathways[cite: 5]. |
| **Real-Time Gateway** | Socket.IO | Executes full-duplex bi-directional data messaging pipelines between open sockets[cite: 5]. |

---

## Installation and Local Setup

Follow these commands step-by-step to initiate your development environment locally:

1. Clone or download your project folder repository and open your terminal within that workspace.
2. Install the production-ready application package dependencies declared inside your tracking files[cite: 2]:
   ```bash
   npm install
