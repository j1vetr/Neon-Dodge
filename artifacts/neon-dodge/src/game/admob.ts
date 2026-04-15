const REWARDED_ID = 'ca-app-pub-6688478170415368/4504616167';

let initialized = false;
let rewardedLoaded = false;
let onRewardEarned: (() => void) | null = null;
let onAdDismissed: (() => void) | null = null;
let AdMobModule: any = null;
let RewardEvents: any = null;

const ADMOB_PKG = '@capacitor-community/admob';

async function loadPlugin(): Promise<boolean> {
  try {
    const cap = await import('@capacitor/core');
    if (!cap.Capacitor.isNativePlatform()) return false;
    const mod = await import(/* @vite-ignore */ ADMOB_PKG);
    AdMobModule = mod.AdMob;
    RewardEvents = mod.RewardAdPluginEvents;
    return true;
  } catch {
    return false;
  }
}

export async function initAdMob(): Promise<void> {
  if (initialized) return;

  const loaded = await loadPlugin();
  if (!loaded || !AdMobModule) return;

  try {
    await AdMobModule.initialize({
      initializeForTesting: false,
    });
  } catch {
    return;
  }

  try {
    AdMobModule.addListener(RewardEvents.Loaded, () => {
      rewardedLoaded = true;
    });

    AdMobModule.addListener(RewardEvents.Rewarded, () => {
      onRewardEarned?.();
      onRewardEarned = null;
    });

    AdMobModule.addListener(RewardEvents.Dismissed, () => {
      rewardedLoaded = false;
      onAdDismissed?.();
      onAdDismissed = null;
      prepareRewarded();
    });

    AdMobModule.addListener(RewardEvents.FailedToLoad, () => {
      rewardedLoaded = false;
    });

    AdMobModule.addListener(RewardEvents.FailedToShow, () => {
      rewardedLoaded = false;
      onAdDismissed?.();
      onAdDismissed = null;
    });
  } catch {
    return;
  }

  initialized = true;
  await prepareRewarded();
}

export async function prepareRewarded(): Promise<void> {
  if (!AdMobModule) return;
  try {
    await AdMobModule.prepareRewardVideoAd({
      adId: REWARDED_ID,
      isTesting: false,
    });
  } catch {
    rewardedLoaded = false;
  }
}

export async function showRewarded(
  onReward: () => void,
  onDismiss?: () => void,
): Promise<boolean> {
  if (!AdMobModule) return false;

  if (!rewardedLoaded) {
    await prepareRewarded();
    await new Promise(r => setTimeout(r, 2000));
    if (!rewardedLoaded) return false;
  }

  onRewardEarned = onReward;
  onAdDismissed = onDismiss ?? null;

  try {
    await AdMobModule.showRewardVideoAd();
    return true;
  } catch {
    rewardedLoaded = false;
    return false;
  }
}

export function isRewardedReady(): boolean {
  return rewardedLoaded;
}

export function isNativePlatform(): boolean {
  try {
    const cap = (globalThis as any)?.Capacitor;
    return cap?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
}
