import React from "react";
import { createRoot } from "react-dom/client";
import Apuntala from "./App.jsx";

createRoot(document.getElementById("root")).render(<Apuntala />);

// Registro del service worker para funcionamiento offline (solo caché de la propia app; no se almacenan datos del usuario)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
