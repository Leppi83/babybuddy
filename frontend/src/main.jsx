import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

const mountNode =
  document.getElementById("shadcn-root") || document.getElementById("root");

if (!mountNode) {
  throw new Error("No mount node found for shadcn preview.");
}

createRoot(mountNode).render(
  <React.StrictMode>
    <App bootstrap={mountNode.dataset} />
  </React.StrictMode>
);
