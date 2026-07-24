import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Maakt "toevoegen aan startscherm" mogelijk én zorgt dat een nieuwe versie
// vanzelf binnenkomt: bij het openen van de app en telkens als je hem weer
// naar voren haalt, wordt gekeken of er een update klaarstaat.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");

      const check = () => { reg.update().catch(() => {}); };
      check();
      setInterval(check, 30 * 60 * 1000);                       // elk half uur
      document.addEventListener("visibilitychange", () => {      // bij terugkeren
        if (!document.hidden) check();
      });

      // Staat er een nieuwe versie klaar? Meteen laten overnemen.
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            sw.postMessage("skip-waiting");
          }
        });
      });

      // Zodra de nieuwe versie het overneemt: één keer herladen.
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      });
    } catch (e) {}
  });
}
