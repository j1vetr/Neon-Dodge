import { Capacitor } from '@capacitor/core';

const ADMOB_APP_ID = 'ca-app-pub-6688478170415368~1631040813';
const REWARDED_INTERSTITIAL_ID = 'ca-app-pub-6688478170415368/4504616167';

let AdMob: any = null;
let RewardedInterstitialAd: any = null;
let AdmobConsentStatus: any = null;
let initialized = false;

async function ensureAdMob() {
  if (AdMob) return true;
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const mod = await import('@capacitor-community/admob');
    AdMob = mod.AdMob;
    RewardedInterstitialAd = mod.RewardInterstitialAdPluginEvents ?? {};
    AdmobConsentStatus = mod.AdmobConsentStatus;
    return true;
  } catch {
    return false;
  }
}

export async function initAdMob(): Promise<boolean> {
  if (initialized) return true;
  const ok = await ensureAdMob();
  if (!ok) return false;

  try {
    await AdMob.initialize({
      initializeForTesting: false,
    });
    initialized = true;
    return true;
  } catch (e) {
    console.warn('[AdMob] init failed', e);
    return false;
  }
}

export async function showRewardedInterstitial(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  await initAdMob();
  if (!AdMob) return false;

  try {
    await AdMob.prepareRewardedInterstitialAd({
      adId: REWARDED_INTERSTITIAL_ID,
      isTesting: false,
    });

    return new Promise<boolean>((resolve) => {
      let rewarded = false;

      const onReward = AdMob.addListener(
        'onRewardedInterstitialAdRewarded',
        () => { rewarded = true; },
      );

      const onDismiss = AdMob.addListener(
        'onRewardedInterstitialAdDismissed',
        () => {
          onReward?.remove?.();
          onDismiss?.remove?.();
          onFail?.remove?.();
          resolve(rewarded);
        },
      );

      const onFail = AdMob.addListener(
        'onRewardedInterstitialAdFailedToShow',
        () => {
          onReward?.remove?.();
          onDismiss?.remove?.();
          onFail?.remove?.();
          resolve(false);
        },
      );

      AdMob.showRewardedInterstitialAd().catch(() => {
        onReward?.remove?.();
        onDismiss?.remove?.();
        onFail?.remove?.();
        resolve(false);
      });
    });
  } catch (e) {
    console.warn('[AdMob] rewarded interstitial error', e);
    return false;
  }
}

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}
