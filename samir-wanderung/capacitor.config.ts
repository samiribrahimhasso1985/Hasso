import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ssbn.app',
  appName: 'SSBN',
  webDir: 'dist',
  android: { allowMixedContent: false, backgroundColor: '#0b0f12' },
  plugins: {
    // Native HTTP for fetch(): no CORS limits when calling the map/routing providers directly,
    // and cookies handled natively when a community server is configured.
    CapacitorHttp: { enabled: true },
    CapacitorCookies: { enabled: true },
  },
};

export default config;
