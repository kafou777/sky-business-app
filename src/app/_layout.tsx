import { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import { boot, Config } from '@/lib/api';
import { SessionProvider } from '@/lib/session';
import { Button, Empty } from '@/components/ui';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function older(a: string, b: string) {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0); }
  return false;
}

export default function Root() {
  const [fonts] = useFonts({ Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold });
  const [cfg, setCfg] = useState<Config | null>(null);
  const [err, setErr] = useState('');
  const [tries, setTries] = useState(0);

  useEffect(() => {
    setErr('');
    boot().then(setCfg).catch((e) => setErr(e.message));
  }, [tries]);

  useEffect(() => {
    if (fonts && (cfg || err)) SplashScreen.hideAsync().catch(() => {});
  }, [fonts, cfg, err]);

  // Ouverture d'une notification : on va directement à la conversation.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const go = (data: any) => { if (data?.conversation) router.push(`/conversation/${data.conversation}`); };
    Notifications.getLastNotificationResponseAsync().then((r) => r && go(r.notification.request.content.data)).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener((r) => go(r.notification.request.content.data));
    return () => sub.remove();
  }, []);

  if (!fonts || (!cfg && !err)) {
    return <View style={st.splash}><Image source={require('../../assets/logo.png')} style={{ width: 200, height: 142 }} contentFit="contain" /></View>;
  }
  if (!cfg) {
    return (
      <SafeAreaProvider>
        <View style={st.splash}>
          <Empty icon="globe" title="Pas de connexion" text={err} action="Réessayer" onAction={() => setTries(tries + 1)} />
        </View>
      </SafeAreaProvider>
    );
  }
  const version = Constants.expoConfig?.version || '1.0.0';
  if (older(version, cfg.version_min)) {
    return (
      <SafeAreaProvider>
        <View style={st.splash}>
          <Empty icon="refresh" title="Mise à jour nécessaire" text="Une nouvelle version de l'application Sky Business est disponible. Mettez-la à jour pour continuer." />
          <Button title="Mettre à jour" onPress={() => Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/' : 'market://details?id=ci.skybusiness.app')} style={{ alignSelf: 'stretch', marginHorizontal: 28 }} />
        </View>
      </SafeAreaProvider>
    );
  }
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="connexion" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  splash: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 20 },
});
