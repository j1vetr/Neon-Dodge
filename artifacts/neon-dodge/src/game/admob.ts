import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  RewardAdOptions,
  AdLoadInfo,
  RewardAdPluginEvents,
  AdMobRewardItem,
} from '@capacitor-community/admob';

const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

let initialized = false;
let rewardedLoaded = false;
let onRewardEarned: (() => void) | null = null;
let onAdDismissed: (() => void) | null = null;

export async function initAdMob(): Promise<void> {
  if (initialized) return;
  if (!Capacitor.isNativePlatform()) return;

  await AdMob.initialize({
    initializeForTesting: true,
  });

  AdMob.addListener(RewardAdPluginEvents.Loaded, (_info: AdLoadInfo) => {
    rewardedLoaded = true;
  });

  AdMob.addListener(RewardAdPluginEvents.Rewarded, (_reward: AdMobRewardItem) => {
    onRewardEarned?.();
    onRewardEarned = null;
  });

  AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
    rewardedLoaded = false;
    onAdDismissed?.();
    onAdDismissed = null;
    prepareRewarded();
  });

  AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
    rewardedLoaded = false;
  });

  AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
    rewardedLoaded = false;
    onAdDismissed?.();
    onAdDismissed = null;
  });

  initialized = true;
  await prepareRewarded();
}

export async function prepareRewarded(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const options: RewardAdOptions = {
      adId: TEST_REWARDED_ID,
      isTesting: true,
    };
    await AdMob.prepareRewardVideoAd(options);
  } catch (_e) {
    rewardedLoaded = false;
  }
}

export async function showRewarded(
  onReward: () => void,
  onDismiss?: () => void,
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  if (!rewardedLoaded) {
    await prepareRewarded();
    await new Promise(r => setTimeout(r, 2000));
    if (!rewardedLoaded) return false;
  }

  onRewardEarned = onReward;
  onAdDismissed = onDismiss ?? null;

  try {
    await AdMob.showRewardVideoAd();
    return true;
  } catch (_e) {
    rewardedLoaded = false;
    return false;
  }
}

export function isRewardedReady(): boolean {
  return rewardedLoaded;
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}
