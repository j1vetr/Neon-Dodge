import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

let _hapticsPlugin: any = null;
let _statusBarPlugin: any = null;
let _keepAwakePlugin: any = null;
let _screenOrientationPlugin: any = null;
let _splashPlugin: any = null;

async function loadPlugins() {
  if (!isNative) return;
  try {
    const [h, sb, ka, so, sp] = await Promise.all([
      import('@capacitor/haptics'),
      import('@capacitor/status-bar'),
      import('@capacitor-community/keep-awake'),
      import('@capacitor/screen-orientation'),
      import('@capacitor/splash-screen'),
    ]);
    _hapticsPlugin = h.Haptics;
    _statusBarPlugin = sb.StatusBar;
    _keepAwakePlugin = ka.KeepAwake;
    _screenOrientationPlugin = so.ScreenOrientation;
    _splashPlugin = sp.SplashScreen;
  } catch (e) {
    console.warn('[native] plugin load failed', e);
  }
}

const pluginsReady = loadPlugins();

export async function initNative(): Promise<void> {
  await pluginsReady;
  if (!isNative) return;

  try {
    await _statusBarPlugin?.setStyle({ style: 'DARK' });
    await _statusBarPlugin?.setBackgroundColor({ color: '#000000' });
    await _statusBarPlugin?.hide();
  } catch {}

  try {
    await _screenOrientationPlugin?.lock({ orientation: 'portrait' });
  } catch {}

  try {
    await _keepAwakePlugin?.keepAwake();
  } catch {}
}

export async function hideSplash(): Promise<void> {
  if (!isNative || !_splashPlugin) return;
  try { await _splashPlugin.hide({ fadeOutDuration: 300 }); } catch {}
}

export async function releaseNative(): Promise<void> {
  if (!isNative) return;
  try { await _keepAwakePlugin?.allowSleep(); } catch {}
}

export function hapticTap(): void {
  if (!isNative || !_hapticsPlugin) return;
  _hapticsPlugin.impact({ style: 'LIGHT' }).catch(() => {});
}

export function hapticCollect(): void {
  if (!isNative || !_hapticsPlugin) return;
  _hapticsPlugin.notification({ type: 'SUCCESS' }).catch(() => {});
}

export function hapticDeath(): void {
  if (!isNative || !_hapticsPlugin) return;
  _hapticsPlugin.vibrate({ duration: 300 }).catch(() => {});
}

export function hapticShieldBreak(): void {
  if (!isNative || !_hapticsPlugin) return;
  _hapticsPlugin.impact({ style: 'HEAVY' }).catch(() => {});
}
