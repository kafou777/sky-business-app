import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import Icon from '@/components/Icon';
import { AccCard } from '@/components/AccCard';
import CartButton from '@/components/CartButton';
import { Chip, Empty, Header, IconButton, Select } from '@/components/ui';
import { AccFiltres, Accessoire, api } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { C, F, R } from '@/lib/theme';

/** Boutique d'accessoires auto (vendus par Sky Business, commande sur WhatsApp). */
export default function Boutique() {
  const p = useLocalSearchParams<{ cat?: string }>();
  const { count } = useCart();
  const [f, setF] = useState<AccFiltres | null>(null);
  const [items, setItems] = useState<Accessoire[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState(p.cat || '');
  const [vm, setVm] = useState('');
  const [vmod, setVmod] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<AccFiltres>('/accessoires/filtres').then((r) => setF(r.data)).catch(() => {}); }, []);

  const load = useCallback(async (pg = 1) => {
    setErr(''); setBusy(true);
    try {
      const r = await api<Accessoire[]>('/accessoires', { query: { page: pg, per_page: 20, q: query, cat, vm, vmod } });
      setItems((old) => (pg === 1 ? r.data : [...(old || []), ...r.data]));
      setTotal(r.total); setPages(r.pages || 1); setPage(pg);
    } catch (e: any) { setErr(e.message); if (pg === 1) setItems([]); }
    finally { setBusy(false); }
  }, [query, cat, vm, vmod]);

  useEffect(() => { load(1); }, [load]);

  const brand = f?.vehicules.find((b) => String(b.id) === vm);
  const veh = brand ? brand.nom + (vmod ? ' ' + (brand.modeles.find((m) => String(m.id) === vmod)?.nom || '') : '') : '';

  const head = (
    <View style={{ gap: 14, paddingBottom: 12 }}>
      <View style={st.hero}>
        {f?.banniere ? <Image source={{ uri: f.banniere }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="right" /> : null}
        <LinearGradient colors={['rgba(26,26,158,0.96)', 'rgba(26,26,158,0.75)', 'rgba(26,26,158,0.05)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        <Text style={st.kicker}>BOUTIQUE SKY BUSINESS</Text>
        <Text style={st.heroTitle}>Accessoires auto</Text>
        <Text style={st.heroText}>Ajoutez au panier, envoyez la commande sur WhatsApp : nous vous rappelons.</Text>
      </View>
      <View style={st.search}>
        <Icon name="search" size={20} color={C.muted} />
        <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => setQuery(q.trim())} returnKeyType="search" placeholder="Tapis, galerie, éclairage…" placeholderTextColor={C.faint} style={st.searchInput} accessibilityLabel="Rechercher un accessoire" />
        {q ? <Pressable onPress={() => { setQ(''); setQuery(''); }} hitSlop={8} accessibilityLabel="Effacer"><Icon name="close" size={18} color={C.muted} /></Pressable> : null}
      </View>
      {f?.vehicules.length ? (
        <View style={st.two}>
          <View style={{ flex: 1 }}><Select label="Marque" value={vm} placeholder="Toutes" options={[{ id: '', nom: 'Toutes' }, ...f.vehicules.map((b) => ({ id: String(b.id), nom: b.nom }))]} onChange={(o) => { setVm(String(o.id)); setVmod(''); }} /></View>
          <View style={{ flex: 1 }}><Select label="Modèle" value={vmod} disabled={!brand} placeholder={brand ? 'Tous' : '—'} options={[{ id: '', nom: 'Tous' }, ...(brand?.modeles || []).map((m) => ({ id: String(m.id), nom: m.nom }))]} onChange={(o) => setVmod(String(o.id))} searchable /></View>
        </View>
      ) : null}
      {f?.categories.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="Tout" active={!cat} onPress={() => setCat('')} />
          {f.categories.map((c) => <Chip key={c.id} label={c.nom} active={cat === String(c.id)} onPress={() => setCat(String(c.id))} />)}
        </ScrollView>
      ) : null}
      {items ? <Text style={st.count}>{total} article{total > 1 ? 's' : ''}{veh ? ' compatible' + (total > 1 ? 's' : '') + ' avec ' + veh : ''}</Text> : null}
      {err ? <Text style={st.err}>{err}</Text> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Boutique" sub={f ? f.total + ' accessoires' : undefined}
        right={<IconButton name="bag" label="Voir le panier" onPress={() => router.push('/panier')} badge={count || undefined} />} />
      <FlatList
        data={items || []}
        keyExtractor={(a) => String(a.id)}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 10 }}
        ListHeaderComponent={head}
        renderItem={({ item }) => <AccCard a={item} />}
        ListEmptyComponent={items && !busy ? <Empty icon="bag" title="Aucun article pour le moment" text="Dites-nous ce que vous cherchez : Sky Business peut le commander pour vous." /> : undefined}
        onEndReached={() => { if (!busy && page < pages) load(page + 1); }}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={busy && page === 1 && !!items} onRefresh={() => load(1)} tintColor={C.accent} />}
      />
      <CartButton />
    </View>
  );
}

const st = StyleSheet.create({
  hero: { borderRadius: R.xl, overflow: 'hidden', padding: 18, paddingTop: 22, minHeight: 150, justifyContent: 'flex-end', gap: 4, backgroundColor: C.accent },
  kicker: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1.2, color: C.gold },
  heroTitle: { fontFamily: F.display, fontSize: 26, color: C.white },
  heroText: { fontFamily: F.body, fontSize: 13.5, lineHeight: 19, color: '#e6e8ff', maxWidth: 260 },
  search: { height: 50, borderRadius: R.pill, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  searchInput: { flex: 1, fontFamily: F.body, fontSize: 15.5, color: C.fg, paddingVertical: 0 },
  two: { flexDirection: 'row', gap: 10 },
  count: { fontFamily: F.display, fontSize: 18, color: C.fg },
  err: { fontFamily: F.semi, color: C.crit },
});
