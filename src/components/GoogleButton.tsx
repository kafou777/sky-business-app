import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path } from 'react-native-svg';
import { setToken, siteUrl } from '@/lib/api';
import { C, F, R } from '@/lib/theme';

function GLogo() {
  return (
    <Svg width={22} height={22} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

/** « Continuer avec Google » : la connexion se fait sur le site (même compte Google que sur skybusiness), puis retour dans l'application. */
export default function GoogleButton({ onDone, onError }: { onDone: () => Promise<void> | void; onError: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const res = await WebBrowser.openAuthSessionAsync(siteUrl('/?sky_app_google=1'), 'skybusiness://google');
      if (res.type !== 'success') return;
      const q = Linking.parse(res.url).queryParams || {};
      const jeton = typeof q.jeton === 'string' ? q.jeton : '';
      if (!jeton) return;
      await setToken(jeton);
      await onDone();
    } catch (e: any) {
      onError(e?.message || 'La connexion Google a échoué. Réessayez.');
    } finally { setBusy(false); }
  };
  return (
    <Pressable onPress={go} disabled={busy} style={({ pressed }) => [st.btn, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel="Continuer avec Google">
      {busy ? <ActivityIndicator color={C.accent} /> : <GLogo />}
      <Text style={st.text}>Continuer avec Google</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  btn: { minHeight: 54, borderRadius: R.pill, borderWidth: 1.5, borderColor: '#c9d0ec', backgroundColor: C.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 20 },
  text: { fontFamily: F.bold, fontSize: 16, color: '#3c4043' },
});
