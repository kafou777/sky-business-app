import { useEffect, useState } from 'react';
import { Dimensions, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import Photo from '@/components/Photo';
import { stockColor } from '@/components/AccCard';
import { Empty, Header, IconButton, Loading } from '@/components/ui';
import { Accessoire, accPrice, api, getConfig, intl, money, STOCKS } from '@/lib/api';
import { cart, useCart } from '@/lib/cart';
import { C, F, R } from '@/lib/theme';

export default function AccessoireScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ins = useSafeAreaInsets();
  const { count } = useCart();
  const [a, setA] = useState<Accessoire | null>(null);
  const [err, setErr] = useState('');
  const [qte, setQte] = useState(1);
  const [idx, setIdx] = useState(0);
  const [added, setAdded] = useState(false);
  const W = Math.min(Dimensions.get('window').width, 640);

  useEffect(() => { api<Accessoire>('/accessoires/' + id).then((r) => setA(r.data)).catch((e) => setErr(e.message)); }, [id]);

  if (err) return <View style={{ flex: 1, backgroundColor: C.bg }}><Header title="Accessoire" /><Empty icon="info" title="Article introuvable" text={err} /></View>;
  if (!a) return <View style={{ flex: 1, backgroundColor: C.bg }}><Header title="Accessoire" /><Loading /></View>;

  const photos = a.photos?.length ? a.photos : [a.photo || a.img];
  const off = a.stock === 'epuise';
  const wa = getConfig()?.contact.whatsapp || '0505070505';
  const ask = () => Linking.openURL('https://wa.me/' + intl(wa) + '?text=' + encodeURIComponent('Bonjour Sky Business, je suis intéressé(e) par cet article :\n' + a.nom + '\n\n' + a.url));
  const add = () => { cart.add(a, qte); setAdded(true); setTimeout(() => setAdded(false), 1500); };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={a.cat || 'Accessoire'} right={<IconButton name="bag" label="Voir le panier" onPress={() => router.push('/panier')} badge={count || undefined} />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + ins.bottom }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))} style={{ width: W, alignSelf: 'center' }}>
          {photos.map((u, i) => <View key={i} style={{ width: W, aspectRatio: 4 / 5, backgroundColor: C.surface }}><Photo uri={u} style={StyleSheet.absoluteFill} fit="contain" recyclingKey={'accd' + a.id + i} /></View>)}
        </ScrollView>
        {photos.length > 1 ? <View style={st.dots}>{photos.map((_, i) => <View key={i} style={[st.dotP, i === idx && { backgroundColor: C.accent, width: 18 }]} />)}</View> : null}

        <View style={st.body}>
          <Text style={st.name}>{a.nom}</Text>
          <View style={st.stock}><View style={[st.dot, { backgroundColor: stockColor(a.stock) }]} /><Text style={[st.stockText, { color: stockColor(a.stock) }]}>{STOCKS[a.stock]}</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <Text style={[st.price, !a.prix && st.ask]}>{accPrice(a)}</Text>
            {a.barre > a.prix && a.prix ? <Text style={st.barre}>{money(a.barre)} FCFA</Text> : null}
          </View>
          {a.resume ? <Text style={st.lead}>{a.resume}</Text> : null}

          {a.compat_long?.length ? (
            <View style={st.compat}>
              <Text style={st.compatTitle}>Compatible avec</Text>
              <View style={st.tags}>{a.compat_long.map((c) => <Text key={c} style={st.tag}>{c}</Text>)}</View>
              {a.note ? <Text style={st.note}>{a.note}</Text> : null}
            </View>
          ) : a.note ? <Text style={st.note}>{a.note}</Text> : null}

          {!off ? (
            <View style={st.qtyRow}>
              <Text style={st.label}>Quantité</Text>
              <View style={st.qty}>
                <Pressable onPress={() => setQte(Math.max(1, qte - 1))} style={st.qBtn} accessibilityLabel="Retirer un"><Icon name="minus" size={18} /></Pressable>
                <Text style={st.qVal}>{qte}</Text>
                <Pressable onPress={() => setQte(Math.min(50, qte + 1))} style={st.qBtn} accessibilityLabel="Ajouter un"><Icon name="plus" size={18} /></Pressable>
              </View>
            </View>
          ) : null}

          {a.description ? <><Text style={st.h2}>Description</Text><Text style={st.desc}>{a.description}</Text></> : null}
          <View style={st.facts}>
            <Text style={st.fact}>• <Text style={{ fontFamily: F.bold, color: C.fg }}>Livraison à Abidjan</Text> ou retrait chez Sky Business, Cocody Riviera 3</Text>
            <Text style={st.fact}>• <Text style={{ fontFamily: F.bold, color: C.fg }}>Commande sur WhatsApp</Text> : nous vous rappelons pour confirmer le prix, la compatibilité et la livraison</Text>
            {a.ref ? <Text style={st.fact}>• Référence : {a.ref}</Text> : null}
          </View>
        </View>
      </ScrollView>

      <View style={[st.bar, { paddingBottom: ins.bottom + 12 }]}>
        <Pressable onPress={ask} style={[st.barBtn, { backgroundColor: C.wa, flex: 0.8 }]} accessibilityRole="button" accessibilityLabel="Poser une question sur WhatsApp">
          <Icon name="whatsapp" size={20} color={C.white} /><Text style={st.barText}>WhatsApp</Text>
        </Pressable>
        <Pressable onPress={added ? () => router.push('/panier') : add} disabled={off} style={[st.barBtn, { backgroundColor: off ? C.surface2 : added ? C.ok : C.accent }]} accessibilityRole="button">
          <Icon name={added ? 'check' : 'bag'} size={20} color={off ? C.muted : C.white} />
          <Text style={[st.barText, off && { color: C.muted }]}>{off ? 'Épuisé' : added ? 'Ajouté · voir le panier' : 'Ajouter au panier'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dotP: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.line },
  body: { padding: 16, gap: 10, maxWidth: 640, width: '100%', alignSelf: 'center' },
  name: { fontFamily: F.display, fontSize: 24, lineHeight: 29, color: C.fg },
  stock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  stockText: { fontFamily: F.semi, fontSize: 14 },
  price: { fontFamily: F.display, fontSize: 26, color: C.accent },
  ask: { fontSize: 20, color: C.warn },
  barre: { fontFamily: F.semi, fontSize: 15, color: C.muted, textDecorationLine: 'line-through' },
  lead: { fontFamily: F.body, fontSize: 16, color: C.muted, lineHeight: 22 },
  compat: { backgroundColor: C.okSoft, borderRadius: R.md, padding: 14, gap: 8 },
  compatTitle: { fontFamily: F.bold, fontSize: 14.5, color: C.ok },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: C.white, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4, fontFamily: F.medium, fontSize: 13.5, color: C.fg, overflow: 'hidden' },
  note: { backgroundColor: '#fff7e6', borderRadius: R.sm, padding: 10, fontFamily: F.body, fontSize: 13.5, color: '#6b3f00', lineHeight: 19 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  label: { fontFamily: F.semi, fontSize: 15, color: C.fg },
  qty: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: R.md },
  qBtn: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  qVal: { minWidth: 30, textAlign: 'center', fontFamily: F.bold, fontSize: 16, color: C.fg },
  h2: { fontFamily: F.display, fontSize: 19, color: C.fg, marginTop: 8 },
  desc: { fontFamily: F.body, fontSize: 15, color: C.fg, lineHeight: 22 },
  facts: { gap: 6, marginTop: 6 },
  fact: { fontFamily: F.body, fontSize: 13.5, color: C.muted, lineHeight: 19 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line },
  barBtn: { flex: 1.3, height: 52, borderRadius: R.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 8 },
  barText: { fontFamily: F.bold, fontSize: 14.5, color: C.white },
});
