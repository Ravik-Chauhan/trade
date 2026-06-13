import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.tickflow.app',
  appName: 'TickFlow',
  webDir: 'dist',
  backgroundColor: '#f6f7f9',
  android: {
    backgroundColor: '#f6f7f9',
  },
  plugins: {
    LocalNotifications: {
      iconColor: '#4772fa',
    },
    SplashScreen: {
      launchShowDuration: 500,
      backgroundColor: '#4772fa',
      showSpinner: false,
    },
  },
}

export default config
