/**
 * Side Panel Entry Point
 *
 * This file mounts the SidePanelShell component to the DOM.
 * It should be bundled and loaded by sidepanel.html.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import SidePanelShell from "./SidePanelShell";
import "./index.css";

// Find the root element
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    'Root element not found. Make sure sidepanel.html has a <div id="root"></div>'
  );
}

// Mount the React app
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SidePanelShell />
  </React.StrictMode>
);
