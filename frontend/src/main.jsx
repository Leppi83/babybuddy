import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

const mountNode = document.getElementById("ant-app-root");
const bootstrapNode = document.getElementById("ant-app-bootstrap");

if (!mountNode || !bootstrapNode) {
  throw new Error("Ant app mount bootstrap is missing.");
}

const bootstrap = JSON.parse(bootstrapNode.textContent);
bootstrap.vapidPublicKey = mountNode.dataset.vapidPublicKey || "";

createRoot(mountNode).render(
  <React.StrictMode>
    <App bootstrap={bootstrap} />
  </React.StrictMode>,
);
