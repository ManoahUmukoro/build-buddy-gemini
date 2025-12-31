import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ab3d8bca40f74ee5929381347d97817c',
  appName: 'LifeOS',
  webDir: 'dist',
  server: {
    url: 'https://ab3d8bca-40f7-4ee5-9293-81347d97817c.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#488AFF',
      sound: 'beep.wav'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    ScreenOrientation: {
      lockOrientation: 'portrait'
    }
  }
};

export default config;
