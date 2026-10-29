import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

// Affichage des notifications reçues pendant que l'application est ouverte.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
  });
}

let current: string | null = null;

/**
 * Demande l'autorisation (une fois), récupère le jeton du téléphone (Firebase / Apple) et l'envoie au site.
 * Sans configuration Firebase dans l'application, l'appel échoue sans gêner le reste.
 */
export async function registerPush(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: '#1A1A9E',
    });
  }
  const perm = await Notifications.getPermissionsAsync();
  let status = perm.status;
  if (status !== 'granted' && perm.canAskAgain) status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  try {
    const t = await Notifications.getDevicePushTokenAsync();
    const tok = String(t.data);
    if (tok && tok !== current) {
      await api('/app/push', { body: { jeton: tok, plateforme: Platform.OS } });
      current = tok;
    }
    return tok;
  } catch {
    return null; // Firebase pas encore configuré
  }
}

export async function forgetPush() {
  current = null;
  if (Platform.OS !== 'web') Notifications.setBadgeCountAsync(0).catch(() => {});
}
