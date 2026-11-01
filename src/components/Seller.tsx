import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { C, F, R } from '@/lib/theme';

/** Photo de profil ronde, ou initiale sur fond bleu. */
export function Avatar({ uri, name, size = 58 }: { uri?: string | null; name?: string; size?: number }) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[box, { backgroundColor: C.surface2 }]} contentFit="cover" accessibilityIgnoresInvertColors />;
  return (
    <View style={[box, { backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: C.white, fontFamily: F.display, fontSize: size * 0.4 }}>{(name || 'V').trim().slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

export function BadgeIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#1a73e8" d="M12 1.5l2.6 1.9 3.2-.2 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.2L12 22.5l-2.6-1.9-3.2.2-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.2z" />
      <Path d="m8 12.2 2.7 2.7L16.3 9" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * Badge « Vérifié » cliquable : explique ce qu'il signifie (comme « X is a Verified Business » sur dubizzle)
 * et propose aux professionnels de faire vérifier leur entreprise.
 */
export function VerifiedBadge({ name, size = 18, sky }: { name: string; size?: number; sky?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel={name + ' est vérifié, en savoir plus'}>
        <BadgeIcon size={size} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={st.back} onPress={() => setOpen(false)}>
          <Pressable style={st.sheet} onPress={() => {}}>
            <View style={st.head}><BadgeIcon size={30} /><Text style={st.title}>{sky ? 'Sky Business est une entreprise certifiée' : name + ' est une entreprise vérifiée'}</Text></View>
            {sky ? (
              <Text style={st.p}>Sky Business, propriétaire de la plateforme, est certifié d'office. Chaque annonce publiée par l'équipe est vérifiée avant sa mise en ligne, et vous pouvez noter Sky Business et laisser un avis.</Text>
            ) : (
              <>
                <Text style={st.p}>Le badge « Vérifié » est attribué par Sky Business aux professionnels dont l'existence a été contrôlée : registre du commerce (RCCM), identité du gérant et coordonnées.</Text>
                <Text style={st.p}>Seuls les comptes vérifiés peuvent recevoir des notes et des avis de leurs clients.</Text>
              </>
            )}
            <Pressable onPress={() => { setOpen(false); router.push('/verification'); }} accessibilityRole="link">
              <Text style={st.q}>Vous êtes professionnel ? <Text style={st.link}>Faites vérifier votre entreprise</Text></Text>
            </Pressable>
            <Pressable onPress={() => setOpen(false)} style={st.ok} accessibilityRole="button"><Text style={st.okText}>J'ai compris</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/** Étoiles (note décimale, ex. 4,5). */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }} accessibilityLabel={value.toFixed(1).replace('.', ',') + ' sur 5'}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        const id = 'g' + i + '-' + Math.round(fill * 10);
        return (
          <Svg key={i} width={size} height={size} viewBox="0 0 24 24">
            <Defs>
              <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
                <Stop offset={fill} stopColor="#f5b301" />
                <Stop offset={fill} stopColor="#d9dbe6" />
              </LinearGradient>
            </Defs>
            <Path fill={`url(#${id})`} d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" />
          </Svg>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(15,18,51,0.45)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: C.white, borderRadius: R.xl, padding: 20, gap: 10, maxWidth: 460, width: '100%', alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 12, marginBottom: 4 },
  title: { flex: 1, fontFamily: F.display, fontSize: 18, color: C.fg },
  p: { fontFamily: F.body, fontSize: 15, color: C.muted, lineHeight: 22 },
  q: { fontFamily: F.semi, fontSize: 15, color: C.fg, lineHeight: 22, marginTop: 4 },
  link: { color: C.accent, textDecorationLine: 'underline' },
  ok: { alignSelf: 'flex-end', backgroundColor: C.accent, borderRadius: R.md, paddingHorizontal: 18, paddingVertical: 10, marginTop: 6 },
  okText: { color: C.white, fontFamily: F.bold, fontSize: 15 },
});
