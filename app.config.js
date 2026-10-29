// Configuration de l'application Sky Business (Android + iPhone).
const fs = require('fs');

const hasGoogleServices = fs.existsSync('./google-services.json');
const hasGoogleServicesPlist = fs.existsSync('./GoogleService-Info.plist');
// Numéro de fabrication (augmente à chaque version envoyée sur les stores).
const build = Number(process.env.SKY_BUILD || 1);

module.exports = {
  expo: {
    name: 'Sky Business',
    slug: 'sky-business',
    scheme: 'skybusiness',
    version: '1.0.3',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    backgroundColor: '#ffffff',
    primaryColor: '#1a1a9e',
    description: 'Voitures à vendre, location, import, immobilier et pièces détachées à Abidjan.',
    ios: {
      bundleIdentifier: 'ci.skybusiness.app',
      buildNumber: String(build),
      supportsTablet: false,
      ...(hasGoogleServicesPlist ? { googleServicesFile: './GoogleService-Info.plist' } : {}),
      infoPlist: {
        NSPhotoLibraryUsageDescription: 'Sky Business a besoin d\'accéder à vos photos pour ajouter des images à vos annonces et à vos demandes de pièces.',
        NSCameraUsageDescription: 'Sky Business utilise l\'appareil photo pour photographier votre véhicule ou la pièce recherchée.',
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'ci.skybusiness.app',
      versionCode: build,
      adaptiveIcon: {
        backgroundColor: '#ffffff',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      blockedPermissions: ['android.permission.RECORD_AUDIO'],
      ...(hasGoogleServices ? { googleServicesFile: './google-services.json' } : {}),
    },
    web: { favicon: './assets/favicon.png', bundler: 'metro', output: 'single' },
    plugins: [
      'expo-router',
      'expo-status-bar',
      'expo-image',
      'expo-secure-store',
      'expo-font',
      ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 288, resizeMode: 'contain', backgroundColor: '#ffffff' }],
      'expo-web-browser',
      ['expo-image-picker', {
        photosPermission: 'Sky Business a besoin d\'accéder à vos photos pour ajouter des images à vos annonces et à vos demandes de pièces.',
        cameraPermission: 'Sky Business utilise l\'appareil photo pour photographier votre véhicule ou la pièce recherchée.',
        microphonePermission: false,
      }],
      ['expo-notifications', { icon: './assets/notification-icon.png', color: '#1a1a9e', defaultChannel: 'messages' }],
      'expo-system-ui',
      './plugins/withReleaseSigning',
    ],
    experiments: { typedRoutes: false },
    extra: {
      // Adresse du site : la première qui répond est utilisée ; le site indique ensuite sa propre adresse.
      sites: (process.env.EXPO_PUBLIC_SITES || 'https://skybusiness.ci,https://skybusiness.org').split(','),
    },
  },
};
