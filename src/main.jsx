import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })
import App from "./App.jsx";
import './index.css'

ReactDOM.createRoot(document.getElementById("root")).render(
	<App />
);

// Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}
