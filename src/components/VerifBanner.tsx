import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { BadgeIcon } from './Seller';
import { Button } from './ui';
import { useSession } from '@/lib/session';
import { C, F, R } from '@/lib/theme';

/**
 * Bannière « Obtenez le badge vérifié » (accueil) et fenêtre de présentation, comme sur dubizzle.
 * Masquée seulement pour les professionnels déjà vérifiés ou dont la demande est en cours d'examen.
 */
export default function VerifBanner() {
  const ins = useSafeAreaInsets();
  const { profile } = useSession();
  const [sheet, setSheet] = useState(false);
  const vs = profile?.verification?.statut;
  if (!profile?.administrateur && (vs === 'verifie' || vs === 'attente')) return null;
  return (
    <>
      <Pressable onPress={() => setSheet(true)} style={({ pressed }) => [st.promo, pressed && { opacity: 0.92 }]} accessibilityRole="button" accessibilityLabel="Obtenez le badge vérifié">
        <BadgeIcon size={40} />
        <View style={{ flex: 1 }}>
          <Text style={st.t}>{vs === 'expire' ? 'Renouvelez votre badge vérifié' : 'Obtenez le badge vérifié'}</Text>
          <Text style={st.p}>Plus de visibilité{'\n'}Plus de confiance de vos clients</Text>
        </View>
        <Icon name="next" size={22} color={C.fg} />
      </Pressable>
      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable style={st.back} onPress={() => setSheet(false)}>
          <Pressable style={[st.sheet, { paddingBottom: ins.bottom + 18 }]} onPress={() => {}}>
            <Text style={st.h}>Faites vérifier votre entreprise sur Sky Business !</Text>
            <View style={st.art}><BadgeIcon size={86} /></View>
            <Text style={st.sp}>Badge bleu sur toutes vos annonces, avis de vos clients et plus de confiance des acheteurs. Une demande en quelques minutes.</Text>
            <Pressable onPress={() => { setSheet(false); router.push('/verification'); }}><Text style={st.link}>En savoir plus sur la vérification</Text></Pressable>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
              <Button title="Plus tard" kind="secondary" onPress={() => setSheet(false)} style={{ flex: 1 }} />
              <Button title="Me faire vérifier" onPress={() => { setSheet(false); router.push('/verification'); }} style={{ flex: 1.3 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  promo: { marginHorizontal: 16, marginTop: 4, marginBottom: 18, padding: 16, borderRadius: R.lg, backgroundColor: '#e9f1ff', flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#0f1233', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  t: { fontFamily: F.display, fontSize: 17, color: C.fg },
  p: { fontFamily: F.body, fontSize: 14, color: C.muted, lineHeight: 20 },
  back: { flex: 1, backgroundColor: 'rgba(15,18,51,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center' },
  h: { fontFamily: F.display, fontSize: 22, color: C.fg, textAlign: 'center' },
  art: { alignSelf: 'center', width: 150, height: 150, borderRadius: 75, backgroundColor: '#eef4ff', alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  sp: { fontFamily: F.body, fontSize: 15.5, color: C.fg, textAlign: 'center', lineHeight: 22 },
  link: { fontFamily: F.bold, fontSize: 15, color: C.accent, textAlign: 'center', textDecorationLine: 'underline' },
});
