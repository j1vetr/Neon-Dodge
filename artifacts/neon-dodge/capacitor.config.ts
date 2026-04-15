import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tr.com.toov.neon.twa',
  appName: 'Neon Dodge',
  webDir: 'dist/public',
  server: {
    url: 'https://neon.toov.com.tr',
    cleartext: false,
  },
  android: {
    buildOptions: {
      keystorePath: '/root/neondodge-android/android.keystore',
      keystoreAlias: 'android',
    },
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
    KeepAwake: {},
    Haptics: {},
  },
};

export default config;
