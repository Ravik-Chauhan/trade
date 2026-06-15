import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.tickflow.app',
  appName: 'Road Rebels',
  webDir: 'dist',
  backgroundColor: '#0c220f',
  android: {
    backgroundColor: '#0c220f',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#0c220f',
      showSpinner: false,
    },
  },
}

export default config
