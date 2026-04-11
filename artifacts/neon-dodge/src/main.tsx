import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

/* Suppress "Cannot suspend/resume a closed AudioContext" unhandled rejections.
   These are harmless HMR artefacts: when Vite hot-reloads, the old Phaser
   instance is destroyed (AudioContext closes) but browser visibility events
   can still fire and try to suspend/resume the already-closed context. */
window.addEventListener('unhandledrejection', (e) => {
  const msg: string = e.reason?.message ?? '';
  if (msg.includes('AudioContext')) {
    e.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
