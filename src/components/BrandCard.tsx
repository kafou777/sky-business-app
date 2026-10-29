import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Icon from './Icon';
import { Brand } from '@/lib/api';
import { C, F, R } from '@/lib/theme';

/** Présentation de la marque en tête des résultats : logo, nom, description, modèles. */
export default function BrandCard({ brand, modele, onModele }: { brand: Brand; modele: string; onModele: (id: string) => void }) {
  const [more, setMore] = useState(false);
  const desc = (brand.description || '').trim();
  return (
    <View style={st.card}>
      <View style={st.head}>
        <View style={st.logo}>
          {brand.logo ? <Image source={{ uri: brand.logo }} style={{ width: 58, height: 58 }} contentFit="contain" accessibilityLabel={'Logo ' + brand.nom} /> : <Icon name="car" size={30} color={C.faint} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.name}>{brand.nom}</Text>
          <Text style={st.sub}>{brand.modeles.length} modèle{brand.modeles.length > 1 ? 's' : ''}</Text>
        </View>
      </View>
      {desc ? (
        <>
          <Text style={st.desc} numberOfLines={more ? undefined : 3}>{desc}</Text>
          {desc.length > 140 ? <Pressable onPress={() => setMore(!more)} hitSlop={8}><Text style={st.more}>{more ? 'Réduire' : 'Lire la suite'}</Text></Pressable> : null}
        </>
      ) : null}
      {brand.modeles.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 4 }}>
          {[{ id: 0, nom: 'Tous les modèles' }, ...brand.modeles].map((m) => {
            const on = String(m.id || '') === modele;
            return (
              <Pressable key={m.id} onPress={() => onModele(m.id ? String(m.id) : '')} style={[st.chip, on && st.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[st.chipText, on && { color: C.white }]}>{m.nom}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 14, backgroundColor: C.white, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: 16, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 72, height: 72, borderRadius: 16, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  name: { fontFamily: F.display, fontSize: 24, color: C.fg },
  sub: { fontFamily: F.body, fontSize: 13.5, color: C.muted },
  desc: { fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.fg },
  more: { fontFamily: F.bold, fontSize: 14, color: C.accent },
  chip: { paddingHorizontal: 12, height: 34, borderRadius: R.pill, borderWidth: 1, borderColor: C.line, justifyContent: 'center', backgroundColor: C.white },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontFamily: F.semi, fontSize: 13.5, color: C.fg },
});
