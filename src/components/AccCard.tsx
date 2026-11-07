import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Photo from './Photo';
import { Accessoire, accPrice, STOCKS } from '@/lib/api';
import { cart } from '@/lib/cart';
import { C, F, R } from '@/lib/theme';

/** Carte d'un accessoire (boutique et rayon de l'accueil). */
export function AccCard({ a, width }: { a: Accessoire; width?: number }) {
  const off = a.stock === 'epuise';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a.nom} onPress={() => router.push(`/accessoire/${a.id}`)}
      style={({ pressed }) => [st.card, width ? { width } : { flex: 1 }, pressed && { opacity: 0.92 }]}>
      <View style={st.photo}>
        <Photo uri={a.photo || a.img} style={StyleSheet.absoluteFill} recyclingKey={'acc' + a.id} />
      </View>
      <View style={st.body}>
        {a.cat ? <Text style={st.cat} numberOfLines={1}>{a.cat.toUpperCase()}</Text> : null}
        <Text style={st.name} numberOfLines={2}>{a.nom}</Text>
        <View style={st.meta}>
          {a.compat?.length ? <Text style={st.compat} numberOfLines={1}>{a.compat.slice(0, 2).join(', ')}</Text> : null}
          <View style={st.stock}><View style={[st.dot, { backgroundColor: stockColor(a.stock) }]} /><Text style={[st.stockText, { color: stockColor(a.stock) }]}>{STOCKS[a.stock]}</Text></View>
        </View>
        <Text style={[st.price, !a.prix && st.ask]}>{accPrice(a)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={'Ajouter au panier : ' + a.nom} disabled={off}
          onPress={() => cart.add(a)} style={({ pressed }) => [st.add, off && { backgroundColor: C.surface2 }, pressed && { opacity: 0.85 }]}>
          <Text style={[st.addText, off && { color: C.muted }]}>{off ? 'Épuisé' : 'Ajouter au panier'}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export function stockColor(s: string) { return s === 'en_stock' ? C.ok : s === 'sur_commande' ? C.warn : C.muted; }

const st = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  photo: { aspectRatio: 4 / 5, backgroundColor: C.surface },
  body: { padding: 10, gap: 4, flex: 1 },
  cat: { fontFamily: F.semi, fontSize: 10.5, color: C.muted, letterSpacing: 0.4 },
  name: { fontFamily: F.bold, fontSize: 14.5, color: C.fg, lineHeight: 19 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 2 },
  compat: { fontFamily: F.body, fontSize: 12.5, color: C.ok, flexShrink: 1 },
  stock: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  stockText: { fontFamily: F.semi, fontSize: 12.5 },
  price: { fontFamily: F.display, fontSize: 16, color: C.accent, marginBottom: 6 },
  ask: { fontFamily: F.bold, fontSize: 14, color: C.warn },
  add: { marginTop: 'auto', height: 40, borderRadius: R.sm, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: F.bold, fontSize: 13.5, color: C.white },
});
