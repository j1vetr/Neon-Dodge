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

function _showBanner(serverTs: number) {
  if (bannerShown) return;
  bannerShown = true;

  const el = document.createElement('div');
  el.id = 'update-banner';
  Object.assign(el.style, {
    position:    'fixed',
    top:         '0',
    left:        '0',
    right:       '0',
    zIndex:      '999999',
    background:  'linear-gradient(90deg,#00d4ff,#00ffaa)',
    color:       '#000',
    textAlign:   'center',
    padding:     '14px 16px',
    fontFamily:  '"Orbitron", monospace',
    fontSize:    '15px',
    fontWeight:  'bold',
    letterSpacing: '1px',
    cursor:      'pointer',
    boxShadow:   '0 3px 16px rgba(0,210,255,0.55)',
  });
  el.textContent = '🔄 YENİ GÜNCELLEME HAZIR — YENİLEMEK İÇİN DOKUN';
  el.onclick = () => {
    localStorage.setItem(DISMISSED_KEY, String(serverTs));
    location.reload();
  };
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
