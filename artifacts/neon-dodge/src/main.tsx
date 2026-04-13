import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { startUpdateCheck } from "./updateCheck";

startUpdateCheck();

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

/* iOS Safari / Android Chrome: dokunuşta sayfa kaymasını tamamen engelle.
   passive:false zorunlu — aksi halde preventDefault çalışmıyor. */
const _blockScroll = (e: TouchEvent) => e.preventDefault();
document.addEventListener('touchstart',  _blockScroll, { passive: false });
document.addEventListener('touchmove',   _blockScroll, { passive: false });
document.addEventListener('touchend',    _blockScroll, { passive: false });
document.addEventListener('touchcancel', _blockScroll, { passive: false });

createRoot(document.getElementById("root")!).render(<App />);
