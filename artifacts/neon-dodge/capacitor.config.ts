import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tr.com.toov.neon.twa',
  appName: 'Neon Dodge',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
  android: {
    buildOptions: {
      keystorePath: '/root/neondodge-android/android.keystore',
      keystoreAlias: 'android',
    },
    backgroundColor: '#000000',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#000000',
      overlaysWebView: false,
    },
    ScreenOrientation: {
      orientation: 'portrait',
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
    },
    Keyboard: {
      resize: 'none',
      style: 'DARK',
    },
    KeepAwake: {},
    Haptics: {},
    AdMob: {
      appIdAndroid: 'ca-app-pub-6688478170415368~1631040813',
    },
  },
};

export default config;
