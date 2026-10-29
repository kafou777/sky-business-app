import { useCallback, useEffect, useState } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon, { IconName } from '@/components/Icon';
import { ListingCard } from '@/components/ListingCard';
import { IconButton } from '@/components/ui';
import { api, Brand, getCatalogue, getConfig, intl, Listing, money } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F, R } from '@/lib/theme';

type Sec = { key: string; title: string; sub?: string; query: Record<string, string | number>; params: Record<string, string> };

const SECTIONS: Sec[] = [
  { key: 'vente', title: 'Voitures à vendre', sub: 'Les dernières annonces', query: { type: 'vehicule', rubrique: 'vente' }, params: { type: 'vehicule', rubrique: 'vente' } },
  { key: 'location', title: 'Location de véhicules', sub: 'Au jour ou au mois', query: { type: 'vehicule', rubrique: 'location' }, params: { type: 'vehicule', rubrique: 'location' } },
  { key: 'import', title: 'Disponible à l\'import', sub: 'Chine, Allemagne, Dubaï, USA', query: { type: 'vehicule', rubrique: 'import' }, params: { type: 'vehicule', rubrique: 'import' } },
  { key: 'immo', title: 'Immobilier', sub: 'Maisons, appartements, terrains', query: { type: 'immobilier' }, params: { type: 'immobilier' } },
];

const CATS: { label: string; icon: IconName; colors: [string, string]; iconColor?: string; params?: Record<string, string>; to?: string }[] = [
  { label: 'Acheter', icon: 'car', colors: ['#1a1a9e', '#4f5bff'], params: { type: 'vehicule', rubrique: 'vente' } },
  { label: 'Louer', icon: 'key', colors: ['#0b7a6d', '#2cc7a8'], params: { type: 'vehicule', rubrique: 'location' } },
  { label: 'Import', icon: 'ship', colors: ['#d9480f', '#ffa94d'], params: { type: 'vehicule', rubrique: 'import' } },
  { label: 'Immobilier', icon: 'building', colors: ['#6d28d9', '#c084fc'], params: { type: 'immobilier' } },
  { label: 'Pièces', icon: 'wrench', colors: ['#f2b000', '#ffd866'], iconColor: '#1b1400', to: '/pieces' },
];

export default function Home() {
  const ins = useSafeAreaInsets();
  const { favs } = useSession();
  const [vip, setVip] = useState<Listing[]>([]);
  const [rows, setRows] = useState<Record<string, Listing[]>>({});
  const [brands, setBrands] = useState<Brand[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');
  const [counts, setCounts] = useState<{ veh: number; immo: number }>({ veh: 0, immo: 0 });
  const cfg = getConfig();
  const h = new Date().getHours() * 60 + new Date().getMinutes();
  const day = h >= 6 * 60 + 45 && h < 17 * 60 + 45;

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
      Promise.all([api('/annonces', { query: { type: 'vehicule', per_page: 1, inclure_vendus: 1 } }), api('/annonces', { query: { type: 'immobilier', per_page: 1, inclure_vendus: 1 } })])
        .then(([a, b]) => setCounts({ veh: a.total, immo: b.total })).catch(() => {});
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
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <IconButton name="heart" label="Mes favoris" onPress={() => router.push('/favoris')} badge={favs.size || undefined} />
          <Pressable onPress={() => router.push('/vendre')} style={st.sellBtn} accessibilityRole="button" accessibilityLabel="Vendre">
            <Icon name="plus" size={18} color="#1b1400" stroke={2.6} /><Text style={st.sellText}>Vendre</Text>
          </Pressable>
        </View>
      </View>

      <View style={st.hero}>
        <Image source={day ? require('../../../assets/hero-jour.jpg') : require('../../../assets/hero-soir.jpg')} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center" accessibilityLabel="Voitures Sky Business devant le Plateau et le pont Alassane Ouattara" />
        <LinearGradient colors={['rgba(8,10,40,0.62)', 'rgba(8,10,40,0.05)', 'rgba(8,10,40,0)']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <View style={{ padding: 18 }}>
          <Text style={st.heroSmall}>Quelle que soit la voiture de vos rêves…</Text>
          <Text style={st.heroBig}>Trouvez-la sur</Text>
          <Text style={[st.heroBig, { color: C.gold }]}>SkyBusiness</Text>
        </View>
      </View>
      <View style={st.finder}>
        <Text style={st.finderTitle}>Trouvez la voiture idéale</Text>
        <Pressable accessibilityRole="search" accessibilityLabel="Rechercher une voiture, une marque, un bien" onPress={() => go({ focus: '1' })} style={st.search}>
          <Icon name="search" size={20} color={C.muted} />
          <Text style={st.searchText} numberOfLines={1}>Essayez « Toyota Prado 2020 »</Text>
        </Pressable>
        <Pressable onPress={() => go({ type: 'vehicule' })} style={st.finderBtn} accessibilityRole="button">
          <Text style={st.finderBtnText}>{counts.veh ? 'Recherche parmi ' + money(counts.veh) + ' voitures' : 'Rechercher une voiture'}</Text>
        </Pressable>
        <Text style={st.finderTag}>Le meilleur endroit pour acheter, vendre ou louer votre véhicule en Côte d'Ivoire</Text>
        {counts.veh ? <Text style={st.finderSub}>{money(counts.veh)} véhicules et {money(counts.immo)} biens immobiliers, vérifiés par Sky Business.</Text> : null}
      </View>

      <View style={st.cats}>
        {CATS.map((c) => (
          <Pressable key={c.label} accessibilityRole="button" accessibilityLabel={c.label} onPress={() => (c.to ? router.push(c.to as any) : go(c.params!))} style={({ pressed }) => [st.cat, pressed && { transform: [{ scale: 0.96 }] }]}>
            <LinearGradient colors={c.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.catIcon}>
              <View style={st.catShine} />
              <Icon name={c.icon} size={28} color={c.iconColor || C.white} stroke={2.2} />
            </LinearGradient>
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

      <Pressable accessibilityRole="button" accessibilityLabel="Commander une pièce détachée" onPress={() => router.push('/pieces')} style={({ pressed }) => [st.banner, pressed && { opacity: 0.92 }]}>
        <LinearGradient colors={['#0f1233', '#1a1a9e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={st.glow} />
        <View style={{ flex: 1, gap: 6, zIndex: 1 }}>
          <Text style={st.bannerKicker}>PIÈCES AUTO</Text>
          <Text style={st.bannerTitle}>Pièces détachées</Text>
          <Text style={st.bannerText}>Dites-nous la pièce recherchée : Sky Business la trouve pour vous.</Text>
          <View style={st.bannerCta}><Text style={st.bannerCtaText}>Commander</Text><Icon name="next" size={16} color="#1b1400" stroke={2.6} /></View>
        </View>
        <View style={st.partsArt}>
          <View style={[st.partsCircle, { backgroundColor: 'rgba(242,176,0,0.18)' }]}><Icon name="gear" size={54} color={C.gold} stroke={1.6} /></View>
          <View style={st.partsWrench}><Icon name="wrench" size={30} color="#1b1400" stroke={2.2} /></View>
        </View>
      </Pressable>

      {SECTIONS.slice(2).map((s) => <Row key={s.key} s={s} data={rows[s.key]} onAll={() => go(s.params)} />)}

      {brands.length ? (
        <View style={st.sec}>
          <SecHead title="Marques" sub="Trouvez votre voiture par marque" onAll={() => router.push('/marques')} />
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
  sellBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.gold, borderRadius: R.md, paddingHorizontal: 14, height: 42 },
  sellText: { fontFamily: F.bold, fontSize: 15, color: '#1b1400' },
  hero: { marginHorizontal: 16, height: 290, borderRadius: 26, overflow: 'hidden', backgroundColor: '#0f1233' },
  heroSmall: { fontFamily: F.semi, fontSize: 14.5, color: C.white },
  heroBig: { fontFamily: F.display, fontSize: 32, lineHeight: 36, color: C.white, letterSpacing: -0.5 },
  finder: { marginHorizontal: 26, marginTop: -44, backgroundColor: C.white, borderRadius: 24, padding: 18, gap: 12, shadowColor: '#0f1233', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  finderTitle: { fontFamily: F.display, fontSize: 23, color: C.fg },
  finderBtn: { height: 54, borderRadius: R.pill, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  finderBtnText: { fontFamily: F.display, fontSize: 17, color: C.white },
  finderTag: { fontFamily: F.bold, fontSize: 14.5, lineHeight: 20, color: C.fg, textAlign: 'center' },
  finderSub: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted, textAlign: 'center', marginTop: -6 },
  search: { height: 52, borderRadius: R.pill, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  searchText: { flex: 1, fontFamily: F.body, fontSize: 16, color: C.faint },
  searchBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  cats: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginTop: 24 },
  cat: { alignItems: 'center', gap: 6, flex: 1 },
  catIcon: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#0f1233', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  catShine: { position: 'absolute', top: -18, left: -10, width: 52, height: 40, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.22)', transform: [{ rotate: '-20deg' }] },
  catText: { fontFamily: F.semi, fontSize: 12.5, color: C.fg },
  sec: { marginTop: 26 },
  secHead: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 12 },
  secTitle: { fontFamily: F.display, fontSize: 21, color: C.fg, letterSpacing: -0.2 },
  secSub: { fontFamily: F.body, fontSize: 13, color: C.muted, marginTop: 1 },
  all: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 },
  allText: { fontFamily: F.bold, fontSize: 14, color: C.accent },
  rowList: { paddingHorizontal: 16, gap: 12, flexDirection: 'row' },
  skeleton: { width: 250, height: 260, borderRadius: R.lg, backgroundColor: C.surface },
  banner: { marginHorizontal: 16, marginTop: 26, borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden', minHeight: 160 },
  glow: { position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(242,176,0,0.16)' },
  bannerKicker: { fontFamily: F.bold, fontSize: 11.5, letterSpacing: 1.2, color: C.gold },
  bannerTitle: { fontFamily: F.display, fontSize: 22, color: C.white },
  bannerText: { fontFamily: F.body, fontSize: 13.5, color: '#d9dcff', lineHeight: 19 },
  bannerCta: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: C.gold, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 8, marginTop: 4 },
  bannerCtaText: { fontFamily: F.bold, fontSize: 14, color: '#1b1400' },
  partsArt: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  partsCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  partsWrench: { position: 'absolute', bottom: 2, right: 0, width: 48, height: 48, borderRadius: 24, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#14156b' },
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
