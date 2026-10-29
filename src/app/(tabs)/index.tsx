import { useCallback, useEffect, useState } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon, { IconName } from '@/components/Icon';
import { ListingCard } from '@/components/ListingCard';
import { IconButton } from '@/components/ui';
import { api, Brand, getCatalogue, getConfig, intl, Listing } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F, R } from '@/lib/theme';

type Sec = { key: string; title: string; sub?: string; query: Record<string, string | number>; params: Record<string, string> };

const SECTIONS: Sec[] = [
  { key: 'vente', title: 'Voitures à vendre', sub: 'Les dernières annonces', query: { type: 'vehicule', rubrique: 'vente' }, params: { type: 'vehicule', rubrique: 'vente' } },
  { key: 'location', title: 'Location de véhicules', sub: 'Au jour ou au mois', query: { type: 'vehicule', rubrique: 'location' }, params: { type: 'vehicule', rubrique: 'location' } },
  { key: 'import', title: 'Disponible à l\'import', sub: 'Chine, Allemagne, Dubaï, USA', query: { type: 'vehicule', rubrique: 'import' }, params: { type: 'vehicule', rubrique: 'import' } },
  { key: 'immo', title: 'Immobilier', sub: 'Maisons, appartements, terrains', query: { type: 'immobilier' }, params: { type: 'immobilier' } },
];

const CATS: { label: string; icon: IconName; params?: Record<string, string>; to?: string }[] = [
  { label: 'Acheter', icon: 'car', params: { type: 'vehicule', rubrique: 'vente' } },
  { label: 'Louer', icon: 'key', params: { type: 'vehicule', rubrique: 'location' } },
  { label: 'Import', icon: 'ship', params: { type: 'vehicule', rubrique: 'import' } },
  { label: 'Immobilier', icon: 'building', params: { type: 'immobilier' } },
  { label: 'Pièces', icon: 'wrench', to: '/pieces' },
];

export default function Home() {
  const ins = useSafeAreaInsets();
  const { favs } = useSession();
  const [vip, setVip] = useState<Listing[]>([]);
  const [rows, setRows] = useState<Record<string, Listing[]>>({});
  const [brands, setBrands] = useState<Brand[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');
  const cfg = getConfig();

  const load = useCallback(async () => {
    setErr('');
    try {
      const [v, ...secs] = await Promise.all([
        api<Listing[]>('/annonces', { query: { type: 'tous', vip: 1, per_page: 10 } }),
        ...SECTIONS.map((s) => api<Listing[]>('/annonces', { query: { ...s.query, per_page: 10 } })),
      ]);
      setVip(v.data);
      const r: Record<string, Listing[]> = {};
      SECTIONS.forEach((s, i) => { r[s.key] = secs[i].data; });
      setRows(r);
      getCatalogue().then((c) => setBrands([...c.marques].sort((a, b) => b.annonces - a.annonces).slice(0, 16))).catch(() => {});
    } catch (e: any) {
      setErr(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const go = (params: Record<string, string>) => router.push({ pathname: '/recherche', params: { ...params, t: String(Date.now()) } });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: ins.top + 8, paddingBottom: 30 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={C.accent} colors={[C.accent]} />}>
      <View style={st.top}>
        <Image source={require('../../../assets/logo-wordmark.png')} style={{ width: 150, height: 39 }} contentFit="contain" accessibilityLabel="Sky Business" />
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <IconButton name="heart" label="Mes favoris" onPress={() => router.push('/favoris')} badge={favs.size || undefined} />
        </View>
      </View>

      <Pressable accessibilityRole="search" accessibilityLabel="Rechercher une voiture, une marque, un bien" onPress={() => go({ focus: '1' })} style={st.search}>
        <Icon name="search" size={20} color={C.muted} />
        <Text style={st.searchText}>Marque, modèle, ville…</Text>
        <View style={st.searchBtn}><Icon name="filter" size={18} color={C.white} /></View>
      </Pressable>

      <View style={st.cats}>
        {CATS.map((c) => (
          <Pressable key={c.label} accessibilityRole="button" accessibilityLabel={c.label} onPress={() => (c.to ? router.push(c.to as any) : go(c.params!))} style={st.cat}>
            <View style={st.catIcon}><Icon name={c.icon} size={26} color={C.accent} /></View>
            <Text style={st.catText}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      {err ? (
        <Pressable onPress={load} style={st.err}><Icon name="refresh" size={18} color={C.crit} /><Text style={st.errText}>{err} Touchez pour réessayer.</Text></Pressable>
      ) : null}

      {vip.length ? (
        <View style={st.sec}>
          <SecHead title="★ À la une" sub="Les offres mises en avant par Sky Business" />
          <FlatList horizontal data={vip} keyExtractor={(l) => 'v' + l.id} showsHorizontalScrollIndicator={false} contentContainerStyle={st.rowList}
            renderItem={({ item }) => <ListingCard l={item} width={280} />} />
        </View>
      ) : null}

      {SECTIONS.slice(0, 2).map((s) => <Row key={s.key} s={s} data={rows[s.key]} onAll={() => go(s.params)} />)}

      <Pressable accessibilityRole="button" onPress={() => router.push('/pieces')} style={st.banner}>
        <View style={[st.catIcon, { backgroundColor: C.white }]}><Icon name="wrench" size={26} color={C.goldFg} /></View>
        <View style={{ flex: 1 }}>
          <Text style={st.bannerTitle}>Pièces détachées</Text>
          <Text style={st.bannerText}>Dites-nous la pièce recherchée : Sky Business la trouve pour vous.</Text>
        </View>
        <Icon name="next" size={22} color={C.goldFg} />
      </Pressable>

      {SECTIONS.slice(2).map((s) => <Row key={s.key} s={s} data={rows[s.key]} onAll={() => go(s.params)} />)}

      {brands.length ? (
        <View style={st.sec}>
          <SecHead title="Marques" sub="Trouvez votre voiture par marque" />
          <View style={st.brands}>
            {brands.map((b) => (
              <Pressable key={b.id} accessibilityRole="button" accessibilityLabel={b.nom} onPress={() => go({ type: 'vehicule', marque: String(b.id) })} style={st.brand}>
                {b.logo ? <Image source={{ uri: b.logo }} style={{ width: 40, height: 30 }} contentFit="contain" /> : <Icon name="car" size={24} color={C.muted} />}
                <Text style={st.brandText} numberOfLines={1}>{b.nom}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {cfg ? (
        <View style={st.contact}>
          <Text style={st.contactTitle}>Besoin d'aide ?</Text>
          <Text style={st.contactText}>L'équipe Sky Business vous répond par téléphone ou sur WhatsApp.</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pressable accessibilityRole="button" onPress={() => Linking.openURL('tel:+' + intl(cfg.contact.telephone))} style={[st.cBtn, { backgroundColor: C.white }]}>
              <Icon name="phone" size={18} color={C.accent} /><Text style={[st.cBtnText, { color: C.accent }]}>Appeler</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => Linking.openURL('https://wa.me/' + intl(cfg.contact.whatsapp) + '?text=' + encodeURIComponent('Bonjour Sky Business, '))} style={[st.cBtn, { backgroundColor: C.wa }]}>
              <Icon name="whatsapp" size={18} color={C.white} /><Text style={[st.cBtnText, { color: C.white }]}>WhatsApp</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function SecHead({ title, sub, onAll }: { title: string; sub?: string; onAll?: () => void }) {
  return (
    <View style={st.secHead}>
      <View style={{ flex: 1 }}>
        <Text style={st.secTitle}>{title}</Text>
        {sub ? <Text style={st.secSub}>{sub}</Text> : null}
      </View>
      {onAll ? <Pressable accessibilityRole="button" accessibilityLabel={'Voir tout : ' + title} onPress={onAll} hitSlop={8} style={st.all}><Text style={st.allText}>Voir tout</Text><Icon name="next" size={16} color={C.accent} /></Pressable> : null}
    </View>
  );
}

function Row({ s, data, onAll }: { s: Sec; data?: Listing[]; onAll: () => void }) {
  if (data && !data.length) return null;
  return (
    <View style={st.sec}>
      <SecHead title={s.title} sub={s.sub} onAll={onAll} />
      {data ? (
        <FlatList horizontal data={data} keyExtractor={(l) => s.key + l.id} showsHorizontalScrollIndicator={false} contentContainerStyle={st.rowList}
          renderItem={({ item }) => <ListingCard l={item} />} />
      ) : (
        <View style={st.rowList}>{[0, 1].map((i) => <View key={i} style={st.skeleton} />)}</View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 10 },
  search: { marginHorizontal: 16, height: 54, borderRadius: R.lg, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.line, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6, gap: 10 },
  searchText: { flex: 1, fontFamily: F.body, fontSize: 16, color: C.faint },
  searchBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  cats: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginTop: 18 },
  cat: { alignItems: 'center', gap: 6, flex: 1 },
  catIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  catText: { fontFamily: F.semi, fontSize: 12.5, color: C.fg },
  sec: { marginTop: 26 },
  secHead: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 12 },
  secTitle: { fontFamily: F.display, fontSize: 21, color: C.fg, letterSpacing: -0.2 },
  secSub: { fontFamily: F.body, fontSize: 13, color: C.muted, marginTop: 1 },
  all: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 },
  allText: { fontFamily: F.bold, fontSize: 14, color: C.accent },
  rowList: { paddingHorizontal: 16, gap: 12, flexDirection: 'row' },
  skeleton: { width: 250, height: 260, borderRadius: R.lg, backgroundColor: C.surface },
  banner: { marginHorizontal: 16, marginTop: 26, backgroundColor: C.goldSoft, borderRadius: R.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#f6dc8f' },
  bannerTitle: { fontFamily: F.display, fontSize: 18, color: C.fg },
  bannerText: { fontFamily: F.body, fontSize: 13.5, color: C.goldFg, lineHeight: 18 },
  brands: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  brand: { width: '23%', flexGrow: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: C.white },
  brandText: { fontFamily: F.semi, fontSize: 11.5, color: C.fg, paddingHorizontal: 4 },
  contact: { margin: 16, marginTop: 28, backgroundColor: C.accent, borderRadius: R.xl, padding: 18 },
  contactTitle: { fontFamily: F.display, fontSize: 20, color: C.white },
  contactText: { fontFamily: F.body, fontSize: 14, color: '#d9dcff', marginTop: 4, lineHeight: 20 },
  cBtn: { flex: 1, height: 48, borderRadius: R.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  cBtnText: { fontFamily: F.bold, fontSize: 15 },
  err: { flexDirection: 'row', gap: 8, alignItems: 'center', margin: 16, marginBottom: 0, padding: 12, borderRadius: R.md, backgroundColor: C.critSoft },
  errText: { flex: 1, color: C.crit, fontFamily: F.semi, fontSize: 14 },
});
