/* =================================================================
   UPDATE CHECK — 60 sn'de bir /version.json çeker.
   Sunucudaki versiyon farklıysa neon banner gösterir.
   Kullanıcı yeniledikten sonra aynı versiyon tekrar gösterilmez.
   ================================================================= */

declare const __BUILD_TS__: number;

const BUILD_TS: number =
  typeof __BUILD_TS__ !== 'undefined' ? __BUILD_TS__ : 0;

const CHECK_INTERVAL_MS = 60_000;
const DISMISSED_KEY = 'neonDodge_dismissedVersion';

let bannerShown = false;

function _doReload(serverTs: number) {
  localStorage.setItem(DISMISSED_KEY, String(serverTs));
  location.reload();
}

function _showBanner(serverTs: number) {
  if (bannerShown) return;
  bannerShown = true;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes ub-slideIn {
      from { transform: translateY(-100%); opacity: 0; }
      to   { transform: translateY(0);     opacity: 1; }
    }
    @keyframes ub-glow {
      0%, 100% { box-shadow: 0 0 12px rgba(0,212,255,0.5), 0 0 40px rgba(0,255,170,0.15), inset 0 1px 0 rgba(255,255,255,0.15); }
      50%      { box-shadow: 0 0 20px rgba(0,212,255,0.8), 0 0 60px rgba(0,255,170,0.3),  inset 0 1px 0 rgba(255,255,255,0.25); }
    }
    @keyframes ub-pulse {
      0%, 100% { transform: scale(1); }
      50%      { transform: scale(1.06); }
    }
    @keyframes ub-shimmer {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    #update-banner {
      position: fixed;
      top: 12px; left: 12px; right: 12px;
      z-index: 999999;
      border-radius: 14px;
      background: linear-gradient(135deg, #0a1628 0%, #0d2137 40%, #0a1628 100%);
      border: 1.5px solid rgba(0,212,255,0.4);
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      cursor: pointer;
      animation: ub-slideIn 0.5s cubic-bezier(0.16,1,0.3,1), ub-glow 3s ease-in-out infinite;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      user-select: none;
    }
    #update-banner:active {
      transform: scale(0.97);
    }
    .ub-icon {
      width: 44px; height: 44px;
      border-radius: 10px;
      background: linear-gradient(135deg, #00d4ff 0%, #00ffaa 100%);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      animation: ub-pulse 2.5s ease-in-out infinite;
    }
    .ub-icon svg {
      width: 22px; height: 22px;
      fill: none; stroke: #0a1628; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round;
    }
    .ub-body { flex: 1; min-width: 0; }
    .ub-title {
      font-family: 'Orbitron', monospace;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #fff;
      margin-bottom: 3px;
      background: linear-gradient(90deg, #00d4ff, #00ffaa, #00d4ff);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: ub-shimmer 4s linear infinite;
    }
    .ub-sub {
      font-family: -apple-system, 'Segoe UI', sans-serif;
      font-size: 12px;
      color: rgba(255,255,255,0.55);
      letter-spacing: 0.3px;
    }
    .ub-arrow {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: rgba(0,212,255,0.12);
      border: 1px solid rgba(0,212,255,0.3);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .ub-arrow svg {
      width: 14px; height: 14px;
      fill: none; stroke: #00d4ff; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round;
    }
  `;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.id = 'update-banner';
  el.innerHTML = `
    <div class="ub-icon">
      <svg viewBox="0 0 24 24">
        <path d="M21 2v6h-6"/>
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
        <path d="M3 22v-6h6"/>
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
      </svg>
    </div>
    <div class="ub-body">
      <div class="ub-title">GÜNCELLEME HAZIR</div>
      <div class="ub-sub">Yenilemek için dokun</div>
    </div>
    <div class="ub-arrow">
      <svg viewBox="0 0 24 24">
        <path d="M5 12h14"/>
        <path d="M12 5l7 7-7 7"/>
      </svg>
    </div>
  `;

  const reload = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    _doReload(serverTs);
  };
  el.addEventListener('click', reload);
  el.addEventListener('touchend', reload);

  document.body.appendChild(el);
}

async function _checkOnce() {
  if (bannerShown) return;
  try {
    const base = import.meta.env.BASE_URL ?? '/';
    const url  = `${base}version.json?_=${Date.now()}`;
    const res  = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return;
    const { ts } = (await res.json()) as { ts: number };

    const dismissed = Number(localStorage.getItem(DISMISSED_KEY) || '0');
    if (ts === dismissed) return;

    if (ts > BUILD_TS) _showBanner(ts);
  } catch {
    /* ağ hatası — sessizce geç */
  }
}

export function startUpdateCheck() {
  if (import.meta.env.DEV) return;
  setInterval(_checkOnce, CHECK_INTERVAL_MS);
  setTimeout(_checkOnce, 10_000);
}
