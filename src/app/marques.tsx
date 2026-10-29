import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Icon from '@/components/Icon';
import { Header, Loading, norm } from '@/components/ui';
import { Brand, getCatalogue } from '@/lib/api';
import { C, F, R } from '@/lib/theme';

export default function Marques() {
  const [list, setList] = useState<Brand[] | null>(null);
  const [q, setQ] = useState('');
  const { width } = useWindowDimensions();
  const cellW = Math.floor((Math.min(width, 700) - 24 - 16) / 3);
  useEffect(() => { getCatalogue().then((c) => setList([...c.marques].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')))).catch(() => setList([])); }, []);
  const shown = useMemo(() => (list || []).filter((b) => !q || norm(b.nom).includes(norm(q))), [list, q]);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Toutes les marques" sub={list ? list.length + ' marques' : undefined} />
      <View style={st.search}>
        <Icon name="search" size={18} color={C.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Rechercher une marque" placeholderTextColor={C.faint} style={st.input} accessibilityLabel="Rechercher une marque" />
      </View>
      {list === null ? <Loading /> : (
        <FlatList data={shown} numColumns={3} keyExtractor={(b) => String(b.id)} contentContainerStyle={{ padding: 12, paddingBottom: 30 }} columnWrapperStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled"
          renderItem={({ item: b }) => (
            <Pressable onPress={() => router.push({ pathname: '/recherche', params: { type: 'vehicule', marque: String(b.id), t: String(Date.now()) } })} style={[st.cell, { width: cellW }]} accessibilityRole="button" accessibilityLabel={b.nom}>
              {b.logo ? <Image source={{ uri: b.logo }} style={{ width: 52, height: 40 }} contentFit="contain" /> : <Icon name="car" size={28} color={C.faint} />}
              <Text style={st.name} numberOfLines={1}>{b.nom}</Text>
              <Text style={st.count}>{b.modeles.length} modèle{b.modeles.length > 1 ? 's' : ''}</Text>
            </Pressable>
          )} />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, marginBottom: 0, paddingHorizontal: 14, height: 46, borderRadius: R.md, backgroundColor: C.surface },
  input: { flex: 1, fontFamily: F.body, fontSize: 16, color: C.fg, outlineStyle: 'none' as any },
  cell: { alignItems: 'center', gap: 4, paddingVertical: 14, marginBottom: 8, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: C.white },
  name: { fontFamily: F.bold, fontSize: 13, color: C.fg, paddingHorizontal: 4 },
  count: { fontFamily: F.body, fontSize: 11.5, color: C.muted },
});
